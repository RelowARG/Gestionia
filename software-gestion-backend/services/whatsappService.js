// software-gestion-backend/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dbMiddleware = require('../db');
const pool = dbMiddleware.pool;

// --- IMPORTAMOS EL CEREBRO DE MILO ---
const { model } = require('../ai_modules/core'); 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('\n=================================================');
    console.log('ESCANEA ESTE QR CON TU WHATSAPP PARA CONECTAR MILOWSKY:');
    console.log('=================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp (Milowsky) Conectado y Escuchando mensajes...');
});

// --- ESCUCHA ACTIVA DE MENSAJES (ENTRANTES Y SALIENTES) ---
client.on('message_create', async (msg) => {
    try {
        // FILTRO BLINDADO: Ignorar estados, grupos, mensajes vacíos y eventos internos (@lid)
        if (msg.from.includes('@g.us') || msg.isStatus || msg.from.includes('@lid') || msg.body.trim() === '') {
            return;
        }

        // 1. Obtener número limpio
        const telefonoFull = msg.fromMe ? msg.to : msg.from;
        
        console.log(`\n[WA DEBUG] 📥 Mensaje detectado de/para: ${telefonoFull}`);
        console.log(`[WA DEBUG] 💬 Texto: "${msg.body.substring(0, 30)}..."`);

        let numeroLimpio = telefonoFull.replace(/\D/g, ''); 
        const matchNumero = numeroLimpio.slice(-8); 

        // VALIDACIÓN DE SEGURIDAD: Evitar matches con "0" o números muy cortos
        if (!matchNumero || matchNumero.length < 6 || parseInt(matchNumero) === 0) {
            console.log(`[WA DEBUG] ⚠️ Número inválido o demasiado corto para buscar match: "${matchNumero}". Ignorando.`);
            return;
        }
        
        console.log(`[WA DEBUG] 🔍 Buscando cliente en DB con los dígitos: ${matchNumero}`);

        // 2. Buscar si el número coincide con algún cliente
        const [rows] = await pool.query(`
            SELECT id, Empresa FROM Clientes 
            WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ?
        `, [`%${matchNumero}%`]);

        if (rows.length > 0) {
            const cliente = rows[0];
            const esMio = msg.fromMe; 
            
            console.log(`[WA DEBUG] ✅ ¡Match encontrado! Es el cliente: ${cliente.Empresa}`);

            // 3. Guardar en historial
            await pool.query(`
                INSERT INTO historial_conversaciones (Cliente_id, Fecha, Emisor, Mensaje)
                VALUES (?, NOW(), ?, ?)
            `, [
                cliente.id,
                esMio ? 'empresa' : 'cliente',
                msg.body
            ]);

            console.log(`💾 Chat guardado (${cliente.Empresa}): ${msg.body.substring(0, 30)}...`);

            // 4. EL CEREBRO DE MILO: Analizar mensajes de CLIENTES CONOCIDOS
            if (!esMio) {
                console.log(`[WA DEBUG] 🧠 Enviando mensaje a Milo para análisis de intención...`);
                await analizarMensajeEntrante(cliente, msg.body, numeroLimpio);
            } else {
                console.log(`[WA DEBUG] 🛑 Mensaje saliente (mío). No requiere análisis de IA.`);
            }
        } else {
            // 5. CAZADOR DE LEADS: Analizar mensajes de DESCONOCIDOS
            if (!msg.fromMe) {
                console.log(`[WA DEBUG] ❌ Número desconocido. Activando protocolo de "Cazador de Leads"...`);
                await analizarNuevoContacto(msg.body, numeroLimpio);
            } else {
                console.log(`[WA DEBUG] 🛑 Mensaje enviado a desconocido. Ignorando.`);
            }
        }

    } catch (error) {
        console.error("Error procesando WhatsApp entrante:", error);
    }
});

// --- EL ANALISTA DE CLIENTES CONOCIDOS ---
async function analizarMensajeEntrante(cliente, mensajeActual, telefono) {
    try {
        const [historial] = await pool.query(`
            SELECT Emisor, Mensaje FROM historial_conversaciones
            WHERE Cliente_id = ?
            ORDER BY Fecha DESC LIMIT 5
        `, [cliente.id]);

        const historialTexto = historial.reverse().map(h => 
            `${h.Emisor === 'empresa' ? 'Nosotros' : 'Cliente'}: ${h.Mensaje}`
        ).join('\n');

        const prompt = `
            Eres Milo, asistente de ventas Senior de Labeltech.
            El cliente "${cliente.Empresa}" acaba de enviar un mensaje de WhatsApp.
            
            --- CONTEXTO DE LA CONVERSACIÓN ---
            ${historialTexto}
            -----------------------------------
            
            MENSAJE NUEVO A ANALIZAR: "${mensajeActual}"
            
            INSTRUCCIONES ESTRATÉGICAS:
            1. Analiza si el mensaje requiere una respuesta o acción (ej. pide precio, stock, estado de pedido).
            2. Si el mensaje es solo un cierre o cortesía (ej. "ok", "gracias", emoji), devuelve EXACTAMENTE: NO_ACTION
            3. Si REQUIERE respuesta, redacta una respuesta sugerida cálida y argentina.
            4. Si pide PRECIOS o cotización, agrega OBLIGATORIAMENTE al inicio la etiqueta: [SUGERENCIA: Armar Presupuesto].
            
            REGLA DE ORO: Si no hay nada útil que responder, di NO_ACTION. Si vas a responder, dame SOLO el texto de tu respuesta.
        `;

        const result = await model.generateContent(prompt);
        let iaResponse = result.response.text().trim().replace(/^"|"$/g, '');

        if (iaResponse !== 'NO_ACTION' && !iaResponse.includes('NO_ACTION')) {
            let titulo = `Responder a ${cliente.Empresa}`;
            if (iaResponse.includes('[SUGERENCIA: Armar Presupuesto]')) {
                titulo = `💸 Presupuestar: ${cliente.Empresa}`;
                iaResponse = iaResponse.replace(/\[SUGERENCIA:\s*Armar\s*Presupuesto\]/gi, '').trim();
            }

            await pool.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                'NUEVO_MENSAJE', 
                titulo,
                JSON.stringify({
                    cliente_id: cliente.id, 
                    nombre_cliente: cliente.Empresa, 
                    telefono: telefono,
                    mensaje_whatsapp: iaResponse, 
                    titulo: titulo,
                    subtitulo: `Respuesta a: "${mensajeActual.substring(0, 40)}..."`
                }), 
                'pendiente'
            ]);
            console.log(`💡 [Milo] Sugerencia generada para cliente conocido: ${cliente.Empresa}`);
        } else {
            console.log(`💤 [Milo] Mensaje de ${cliente.Empresa} no requiere acción.`);
        }
    } catch (e) {
        console.error("Error en análisis IA de cliente:", e.message);
    }
}

// --- NUEVO: EL CAZADOR DE LEADS (DESCONOCIDOS) ---
async function analizarNuevoContacto(mensajeActual, telefono) {
    try {
        const prompt = `
            Eres Milo, experto en ventas de Labeltech (fabricantes de etiquetas).
            Un número de WhatsApp desconocido nos acaba de escribir este mensaje:
            "${mensajeActual}"
            
            INSTRUCCIONES:
            1. Analiza la intención. ¿Parece un posible cliente preguntando por productos, precios, horarios, etc.?
            2. ¿Es spam, un mensaje personal equivocado o no tiene sentido comercial?
            3. Si ES un posible cliente, responde usando ESTRICTAMENTE este formato:
               NUEVO_CLIENTE||[NombreAdivinado]||[Respuesta Sugerida]
               
               - [NombreAdivinado]: Extrae su nombre o empresa si lo menciona. Si no lo dice, usa "Nuevo Contacto".
               - [Respuesta Sugerida]: Escribe un mensaje de bienvenida cálido y argentino para enviarle, agradeciendo el contacto y preguntándole cómo podemos ayudarlo o pidiéndole sus datos para agendarlo.
               
            4. Si NO ES un cliente potencial (ej: spam), responde EXACTAMENTE:
               IGNORAR
        `;

        const result = await model.generateContent(prompt);
        let iaResponse = result.response.text().trim();

        if (iaResponse.startsWith('NUEVO_CLIENTE')) {
            const partes = iaResponse.split('||');
            const nombreLead = partes[1] ? partes[1].trim() : 'Nuevo Contacto';
            const respuestaSugerida = partes[2] ? partes[2].trim() : `¡Hola! Gracias por comunicarte con Labeltech. ¿En qué te podemos ayudar?`;

            await pool.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                'NUEVO_LEAD', 
                `👤 Nuevo Lead: ${nombreLead}`,
                JSON.stringify({
                    cliente_id: null, 
                    nombre_cliente: nombreLead, 
                    telefono: telefono,
                    mensaje_whatsapp: respuestaSugerida, 
                    titulo: `👤 Agendar nuevo lead: ${nombreLead}`,
                    subtitulo: `Nos escribió: "${mensajeActual.substring(0, 40)}..."`
                }), 
                'pendiente'
            ]);
            console.log(`🚀 [Milo] ¡Posible nuevo cliente detectado! Lead: ${nombreLead} (${telefono})`);
        } else {
            console.log(`🗑️ [Milo] Mensaje de desconocido clasificado como Spam/Irrelevante. Ignorado.`);
        }
    } catch (e) {
        console.error("Error en Cazador de Leads:", e.message);
    }
}

// --- FUNCIÓN PARA ENVIAR MENSAJES AUTOMÁTICOS ---
async function enviarMensaje(numero, texto) {
    if (!client.info) throw new Error("WhatsApp no está conectado.");
    
    try {
        let numLimpio = String(numero).replace(/\D/g, '');
        if (numLimpio.startsWith('54') && !numLimpio.startsWith('549')) {
            numLimpio = numLimpio.replace(/^54/, '549');
        }

        const chatId = `${numLimpio}@c.us`;
        const contactoValidado = await client.getNumberId(chatId);

        if (!contactoValidado) {
            console.warn(`[WhatsApp] ⚠️ El número ${numero} no está registrado en WA. Omitiendo.`);
            return false; 
        }

        await client.sendMessage(contactoValidado._serialized, texto);
        console.log(`🤖 Milowsky envió mensaje a ${numLimpio}`);
        return true;

    } catch (error) {
        console.error(`[WhatsApp] ❌ Error enviando mensaje a ${numero}:`, error.message);
        throw error;
    }
}

function iniciarWhatsApp() {
    console.log('Iniciando servicio de WhatsApp...');
    client.initialize();
}

module.exports = { iniciarWhatsApp, enviarMensaje };