// software-gestion-backend/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dbMiddleware = require('../db');
const pool = dbMiddleware.pool;

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

// --- ESCUCHA DE MENSAJES (ENTRANTES Y SALIENTES) ---
client.on('message_create', async (msg) => {
    try {
        // Ignorar estados y grupos
        if (msg.from.includes('@g.us') || msg.isStatus) return;

        // 1. Obtener número limpio
        const telefonoFull = msg.fromMe ? msg.to : msg.from;
        let numeroLimpio = telefonoFull.replace(/\D/g, ''); 
        // Nos quedamos con los últimos 8 dígitos para comparar (evita líos de 549 vs 54)
        const matchNumero = numeroLimpio.slice(-8); 

        // 2. Buscar si el número coincide con algún cliente
        //const db = pool.promise(); // Usamos pool directamente que ahora soporta promise() en esta versión de mysql2 si se configuró así, o pool.query si es pool simple. 
        // Nota: En la corrección anterior vimos que pool.promise() fallaba si pool ya era promesa. 
        // Asumimos pool exportado de db.js modificado. Usaremos pool.query estilo mysql2/promise.
        
        const [rows] = await pool.query(`
            SELECT id, Empresa FROM Clientes 
            WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ?
        `, [`%${matchNumero}%`]);

        if (rows.length > 0) {
            const cliente = rows[0];
            const esMio = msg.fromMe; // true si lo mandé yo, false si lo mandó el cliente
            
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
        }

    } catch (error) {
        console.error("Error guardando WhatsApp:", error);
    }
});

// --- NUEVA FUNCIÓN PARA ENVIAR MENSAJES AUTOMÁTICOS ---
async function enviarMensaje(numero, texto) {
    if (!client.info) throw new Error("WhatsApp no está conectado.");
    
    // Formatear número para whatsapp-web.js (debe terminar en @c.us)
    // Asumimos que 'numero' viene limpio (ej: 54911...) desde salesAgent
    const chatId = `${numero}@c.us`;
    
    try {
        await client.sendMessage(chatId, texto);
        console.log(`🤖 Milowsky envió mensaje a ${numero}`);
        return true;
    } catch (error) {
        console.error("Error enviando mensaje WA:", error);
        throw error;
    }
}

function iniciarWhatsApp() {
    console.log('Iniciando servicio de WhatsApp...');
    client.initialize();
}

module.exports = { iniciarWhatsApp, enviarMensaje };