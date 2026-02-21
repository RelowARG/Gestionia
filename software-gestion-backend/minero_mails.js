// software-gestion-backend/minero_mails.js
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cron = require('node-cron');
require('dotenv').config();
const db = require('./db').pool;

const imapConfig = {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,
    authTimeout: 30000,
    tlsOptions: { rejectUnauthorized: false }
};

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
        // Si el correo ya existía en la BD (Duplicado), lo ignoramos silenciosamente para no saturar los logs
        if(err.code !== 'ER_DUP_ENTRY') {
            console.error("   ❌ Error al guardar en DB:", err.message);
        }
    }
}

function procesarMails(imap, boxName, tipo) {
    return new Promise((resolve, reject) => {
        imap.openBox(boxName, true, (err, box) => {
            if (err) return reject(err);

            console.log(`\n📂 Abriendo carpeta: ${boxName}`);
            
            // PROGRAMACIÓN DEFENSIVA: Buscamos solo correos de los últimos 3 días para eficiencia en tiempo real
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 3);

            imap.search(['ALL', ['SINCE', pastDate]], (err, results) => {
                if (err || !results || results.length === 0) {
                    console.log(`🏁 No hay mails recientes en ${boxName}`);
                    return resolve();
                }

                const f = imap.fetch(results, { bodies: '' });

                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err || !parsed.from || !parsed.to) return;
                            
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
    });
}

function ejecutarMineria() {
    console.log(`\n⛏️ Iniciando ciclo de Minería de Mails - ${new Date().toLocaleTimeString()}`);
    const imap = new Imap(imapConfig);

    imap.once('ready', async () => {
        try {
            await procesarMails(imap, '[Gmail]/Enviados', 'saliente'); 
            await procesarMails(imap, 'INBOX', 'entrante');

            console.log("\n✨ Minería reciente completada con éxito.");
            imap.end();
        } catch (err) {
            console.error("Error en el proceso:", err);
            imap.end();
        }
    });

    imap.once('error', (err) => console.log("Error de conexión IMAP:", err));
    imap.connect();
}

// Se ejecuta cada 1 hora para mantener la base de datos fresca sin saturar a Google
cron.schedule('0 * * * *', () => ejecutarMineria());

console.log("⛏️  Motor Minero de Mails: INICIADO.");
// Ejecutamos una vez al encender el sistema
setTimeout(() => ejecutarMineria(), 4000);