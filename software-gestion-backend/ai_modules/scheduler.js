// software-gestion-backend/ai_modules/scheduler.js
const cron = require('node-cron');
const { model } = require('./core');
const dbMiddleware = require('../db');
const pool = dbMiddleware.pool;

// Aumentamos el delay a 12 segundos para ser extra cuidadosos con la cuota de Gemini 2.5
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- GENERADORES DE MENSAJES (IA) ---

async function generateReconnectionMessage(cliente, productos, contacto, intento = 1) {
    const nombreSaludo = contacto && contacto !== 'Encargado' ? contacto : cliente;
    
    const context = intento === 1 ? "No compra hace más de 30 días." : "Ya le escribimos hace 2 meses y no respondió/compró.";
    
    const prompt = `
        Actúa como Milo, ejecutivo de cuentas de Labeltech.
        Redacta un mensaje de WhatsApp para "${nombreSaludo}".
        
        CONTEXTO: ${context}
        PRODUCTO HABITUAL: ${productos}.
        
        OBJETIVO: ${intento === 1 ? 'Reactivar la venta con empatía.' : 'Re-conectar suavemente, sin presionar.'}
        
        ESTILO:
        - Conversacional, cálido y argentino.
        - Usa el nombre del contacto si está disponible.
        - Menciona el producto para que sea relevante.
        
        REGLAS DE FORMATO (ESTRICTO):
        1. Devuelve SOLO el cuerpo del mensaje. NADA MÁS.
        2. NO incluyas saludos al usuario (ej: "Aquí tienes el mensaje", "¡Claro!").
        3. Empieza directamente saludando al cliente.
        4. Preséntate como Milo de Labeltech.
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        // Limpieza de comillas o introducciones accidentales
        text = text.replace(/^"|"$/g, '');
        text = text.replace(/^(Claro|Aquí|Te paso|Por supuesto).*?:/i, '').trim();
        return text;
    } catch (e) {
        console.warn(`⚠️ Fallo IA (${e.message}). Usando Fallback Dinámico.`);
        
        // --- FALLBACKS DINÁMICOS (Si falla la IA, usamos esto) ---
        const variaciones = [
            `Hola ${nombreSaludo}, soy Milo de Labeltech. Estaba revisando y vi que hace un tiempito no reponemos stock de ${productos}. ¿Cómo vienen con eso?`,
            `¿Cómo estás ${nombreSaludo}? Milo de este lado. Te escribo porque hace mucho no preparamos pedido de ${productos} y quería ver si necesitaban asistencia.`,
            `Hola ${nombreSaludo}, soy Milo de Labeltech. ¿Todo en orden? Te escribo cortito para ver si precisabas reponer ${productos} esta semana.`,
            `Buen día ${nombreSaludo}, Milo de Labeltech por acá. Noté que hace rato no salen ${productos} para allá. ¿Están necesitando algo? Avisame y coordinamos.`
        ];
        // Elegir uno al azar para que no parezca un robot
        return variaciones[Math.floor(Math.random() * variaciones.length)];
    }
}

async function generateBudgetFollowUp(cliente, numeroPresupuesto, montoStr) {
    const prompt = `
        Actúa como Milo de Labeltech.
        Escribe un mensaje de seguimiento para "${cliente}" sobre el Presupuesto #${numeroPresupuesto} (${montoStr}).
        
        INSTRUCCIONES:
        - Sé amable y servicial. Pregunta si pudieron verlo.
        - SOLO devuelve el texto del mensaje. Sin introducciones.
    `;
    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^"|"$/g, '');
        return text;
    } catch (e) {
        // Fallback dinámico para presupuestos
        const variaciones = [
            `Hola ${cliente}, soy Milo. ¿Pudieron revisar el presupuesto #${numeroPresupuesto}? Avisame cualquier duda.`,
            `¿Qué tal ${cliente}? Milo de Labeltech. Te molesto para saber si pudieron ver el presupuesto #${numeroPresupuesto} o si necesitan algún cambio.`,
            `Hola ${cliente}, te escribo por el presupuesto #${numeroPresupuesto}. ¿Lo pudieron charlar? Quedo a disposición.`
        ];
        return variaciones[Math.floor(Math.random() * variaciones.length)];
    }
}

// --- ANÁLISIS DIARIO ---

async function runDailyAnalysis() {
    console.log('--- 🧠 Milowsky Scheduler: Iniciando Barrido Completo ---');
    const db = pool;

    try {
        // 1. RECUPERO INICIAL (>30 días inactivo)
        const [clientes] = await db.query(`
            SELECT c.id, c.Empresa, c.Contacto, c.Telefono, MAX(v.Fecha) as ultima_compra, SUM(v.Total) as total_gastado
            FROM Clientes c JOIN Ventas v ON c.id = v.Cliente_id
            GROUP BY c.id
            HAVING ultima_compra < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY total_gastado DESC LIMIT 30
        `);

        for (const c of clientes) {
            const [reciente] = await db.query(`
                SELECT id FROM IA_Insights 
                WHERE tipo = 'WHATSAPP_SUGERIDO' AND datos_extra LIKE ? 
                AND fecha >= DATE_SUB(NOW(), INTERVAL 60 DAY)
            `, [`%"cliente_id":${c.id}%`]);

            if (reciente.length === 0) {
                const [prods] = await db.query(`SELECT p.Descripcion FROM Venta_Items vi JOIN Ventas v ON vi.Venta_id = v.id JOIN Productos p ON vi.Producto_id = p.id WHERE v.Cliente_id = ? GROUP BY p.id ORDER BY SUM(vi.Cantidad) DESC LIMIT 1`, [c.id]);
                const prod = prods[0]?.Descripcion || "insumos";
                
                const msg = await generateReconnectionMessage(c.Empresa, prod, c.Contacto, 1);
                const dias = Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));

                await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                    'WHATSAPP_SUGERIDO', `Recupero ${c.Empresa}`,
                    JSON.stringify({
                        cliente_id: c.id, nombre_cliente: c.Empresa, telefono: c.Telefono,
                        mensaje_whatsapp: msg, titulo: `Recuperar a ${c.Empresa}`,
                        subtitulo: `Inactivo ${dias} días (Intento 1).`
                    }), 'pendiente'
                ]);
                console.log(`> Recupero Intento 1: ${c.Empresa}`);
                await delay(12000); // 12s delay
            }
        }

        // 2. RE-CONTACTO (2 meses después)
        const [viejosIntentos] = await db.query(`
            SELECT id, datos_extra, fecha 
            FROM IA_Insights 
            WHERE tipo = 'WHATSAPP_SUGERIDO' 
            AND estado IN ('completado', 'auto_enviado')
            AND fecha BETWEEN DATE_SUB(NOW(), INTERVAL 90 DAY) AND DATE_SUB(NOW(), INTERVAL 60 DAY)
        `);

        for (const intento of viejosIntentos) {
            let data;
            try { data = JSON.parse(intento.datos_extra); } catch(e) { continue; }
            
            const clienteId = data.cliente_id;
            const [comprasNuevas] = await db.query(`SELECT id FROM Ventas WHERE Cliente_id = ? AND Fecha > ?`, [clienteId, intento.fecha]);

            if (comprasNuevas.length === 0) {
                 const [yaExisteIntento2] = await db.query(`SELECT id FROM IA_Insights WHERE tipo = 'RECONTACTO_2' AND datos_extra LIKE ?`, [`%"cliente_id":${clienteId}%`]);

                if (yaExisteIntento2.length === 0) {
                    const msg2 = await generateReconnectionMessage(data.nombre_cliente, "etiquetas", null, 2);
                    
                    await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'RECONTACTO_2', `Segundo intento ${data.nombre_cliente}`,
                        JSON.stringify({
                            cliente_id: clienteId, nombre_cliente: data.nombre_cliente, telefono: data.telefono,
                            mensaje_whatsapp: msg2, 
                            titulo: `Re-intentar: ${data.nombre_cliente}`,
                            subtitulo: `Falló intento hace 2 meses. Sigue sin comprar.`
                        }), 'pendiente'
                    ]);
                    console.log(`> Recupero Intento 2: ${data.nombre_cliente}`);
                    await delay(12000);
                }
            }
        }

        // 3. SEGUIMIENTO PRESUPUESTOS
        const [presupuestos] = await db.query(`
            SELECT p.id, p.Total_USD, p.Total_ARS, c.Empresa, c.Telefono, c.Contacto, p.Fecha
            FROM Presupuestos p JOIN Clientes c ON p.Cliente_id = c.id
            WHERE p.Estado = 'Pendiente' 
            AND p.Fecha < DATE_SUB(NOW(), INTERVAL 3 DAY)
            AND p.Fecha > DATE_SUB(NOW(), INTERVAL 15 DAY)
        `);

        for (const p of presupuestos) {
             const [yaAvisado] = await db.query(`SELECT id FROM IA_Insights WHERE tipo = 'SEGUIMIENTO_PPT' AND datos_extra LIKE ?`, [`%"presupuesto_id":${p.id}%`]);
             
             if (yaAvisado.length === 0) {
                let montoStr = p.Total_USD > 0 ? `USD ${p.Total_USD}` : `$${p.Total_ARS}`;
                const msgPpt = await generateBudgetFollowUp(p.Empresa, p.id, montoStr);
                
                await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                    'SEGUIMIENTO_PPT', `Seguimiento PPT #${p.id}`,
                    JSON.stringify({
                        presupuesto_id: p.id, nombre_cliente: p.Empresa, telefono: p.Telefono,
                        mensaje_whatsapp: msgPpt,
                        titulo: `Seguimiento Presupuesto #${p.id}`,
                        subtitulo: `Enviado el ${new Date(p.Fecha).toLocaleDateString()} (${montoStr})`
                    }), 'pendiente'
                ]);
                console.log(`> Seguimiento Presupuesto: ${p.Empresa}`);
                await delay(12000);
             }
        }

        // 4. STOCK CRÍTICO
        const [stockCritico] = await db.query(`SELECT s.id, p.Descripcion, s.Cantidad FROM Stock s JOIN Productos p ON s.Producto_id = p.id WHERE s.Cantidad <= 5`);
        
        if (stockCritico.length > 0) {
             const [avisoStock] = await db.query(`SELECT id FROM IA_Insights WHERE tipo = 'ALERTA_STOCK' AND DATE(fecha) = CURDATE()`);
             
             if (avisoStock.length === 0) {
                 const lista = stockCritico.map(i => `• ${i.Descripcion} (Quedan: ${i.Cantidad})`).join('\n');
                 await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                    'ALERTA_STOCK', 'Stock Bajo',
                    JSON.stringify({
                        titulo: "⚠️ Alerta de Stock",
                        subtitulo: `${stockCritico.length} productos críticos.`,
                        mensaje: `Atención, necesitamos reponer:\n${lista}`,
                        es_interno: true 
                    }), 'pendiente'
                ]);
                console.log(`> Alerta de Stock generada.`);
             }
        }
        console.log('--- 🧠 Fin Barrido ---');
    } catch (error) {
        console.error("Error Scheduler:", error);
    }
}

function initScheduler() {
    cron.schedule('0 */6 * * *', () => runDailyAnalysis());
    setTimeout(() => runDailyAnalysis(), 5000);
    console.log('✅ Sistema Milowsky V2: Iniciado');
}

module.exports = { initScheduler, runDailyAnalysis };