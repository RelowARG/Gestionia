const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { pool } = require('../db');

// Configuración del cliente con persistencia de sesión
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
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
        const db = pool.promise();
        const [rows] = await db.query(`
            SELECT id, Empresa FROM clientes 
            WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ?
        `, [`%${matchNumero}%`]);

        if (rows.length > 0) {
            const cliente = rows[0];
            const esMio = msg.fromMe; // true si lo mandé yo, false si lo mandó el cliente
            
            // 3. Guardar en historial
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