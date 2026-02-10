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
    console.log('ESCANEA ESTE QR CON TU WHATSAPP PARA CONECTAR:');
    console.log('=================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Conectado y Escuchando mensajes...');
});

client.on('message_create', async (msg) => {
    try {
        if (msg.from.includes('@g.us') || msg.isStatus) return;

        const telefonoFull = msg.fromMe ? msg.to : msg.from;
        let numeroLimpio = telefonoFull.replace(/\D/g, ''); 
        const matchNumero = numeroLimpio.slice(-8); 

        // CORRECCIÓN: Usamos pool directamente
        const db = pool;
        const [rows] = await db.query(`
            SELECT id, Empresa FROM Clientes 
            WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ?
        `, [`%${matchNumero}%`]);

        if (rows.length > 0) {
            const cliente = rows[0];
            const esMio = msg.fromMe;
            
            await db.query(`
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

function iniciarWhatsApp() {
    console.log('Iniciando servicio de WhatsApp...');
    client.initialize();
}

module.exports = { iniciarWhatsApp };