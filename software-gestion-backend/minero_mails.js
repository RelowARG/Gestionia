const Imap = require('imap');
const { simpleParser } = require('mailparser');
require('dotenv').config();
const db = require('./db').pool;

const imapConfig = {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,
    authTimeout: 30000, // <--- AGREGÁ ESTA LÍNEA (30 segundos)
    tlsOptions: { rejectUnauthorized: false }
};

const imap = new Imap(imapConfig);

async function guardarEmail(mailData) {
    const query = `INSERT INTO historial_emails 
                   (direccion_cliente, asunto, cuerpo_texto, fecha, tipo) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    const values = [
        mailData.email,
        mailData.subject,
        mailData.text,
        mailData.date,
        mailData.tipo
    ];

    try {
        await db.query(query, values);
        console.log(`   ✅ Guardado: ${mailData.subject.substring(0, 30)}...`);
    } catch (err) {
        console.error("   ❌ Error al guardar en DB:", err.message);
    }
}

function procesarMails(boxName, tipo) {
    return new Promise((resolve, reject) => {
        imap.openBox(boxName, true, (err, box) => {
            if (err) return reject(err);

            console.log(`\n📂 Abriendo carpeta: ${boxName} (${box.messages.total} mensajes)`);
            
            // Traemos de a 50 para no saturar
            const f = imap.seq.fetch('1:*', { bodies: '' });

            f.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                    simpleParser(stream, async (err, parsed) => {
                        const mailData = {
                            email: tipo === 'entrante' ? parsed.from.value[0].address : parsed.to.value[0].address,
                            subject: parsed.subject || '(Sin Asunto)',
                            text: parsed.text || '',
                            date: parsed.date,
                            tipo: tipo
                        };
                        await guardarEmail(mailData);
                    });
                });
            });

            f.once('error', (err) => reject(err));
            f.once('end', () => {
                console.log(`🏁 Fin de procesado para ${boxName}`);
                resolve();
            });
        });
    });
}

imap.once('ready', async () => {
    try {
        // 1. Probamos con el nombre estándar de Gmail en español
        // Si te vuelve a dar error, probá con '[Gmail]/Sent Mail'
        await procesarMails('[Gmail]/Enviados', 'saliente'); 
        
        // 2. Procesamos la bandeja de entrada
        await procesarMails('INBOX', 'entrante');

        console.log("\n✨ Minería histórica completada con éxito.");
        imap.end();
    } catch (err) {
        console.error("Error en el proceso:", err);
        imap.end();
    }
});

imap.once('error', (err) => console.log("Error de conexión IMAP:", err));
imap.connect();