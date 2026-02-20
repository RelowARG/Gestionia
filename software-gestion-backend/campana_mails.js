// software-gestion-backend/campana_mails.js
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { enviarCorreoMilo } = require('./mailer');

// 🔑 LLAVES: Prioridad a la dedicada, respaldo en las del minero
const apiKeys = [
    process.env.MAILER_GEMINI_KEY, // La nueva llave dedicada
    process.env.MINER_API_KEY, 
    process.env.MINER_API_KEY_2
].filter(Boolean);

let currentKeyIndex = 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function adaptarBaseDeDatos() {
    try {
        await pool.query("ALTER TABLE Leads_Antiguos ADD COLUMN ultimo_contacto_mail DATETIME DEFAULT NULL");
    } catch (e) {}
}

async function llamarIAConRotacion(prompt) {
    let intentos = 0;
    while (intentos < apiKeys.length) {
        try {
            const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
            const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await aiModel.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('quota')) {
                console.log(`   ⚠️ Llave ${currentKeyIndex + 1} agotada. Probando respaldo...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                intentos++;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Todas las llaves están agotadas.');
}

async function ejecutarCampanaDiaria() {
    console.log(`\n======================================================`);
    console.log(`🚀 Campaña de Mails - ${new Date().toLocaleString()}`);
    console.log(`======================================================`);

    try {
        // 🎯 PRIORIDAD: 150 leads, primero los que NUNCA recibieron mail.
        const [leads] = await pool.query(`
            SELECT id, nombre, email 
            FROM Leads_Antiguos 
            WHERE email IS NOT NULL 
            AND (ultimo_contacto_mail IS NULL OR ultimo_contacto_mail < DATE_SUB(NOW(), INTERVAL 40 DAY))
            ORDER BY ultimo_contacto_mail IS NULL DESC, ultimo_contacto_mail ASC
            LIMIT 150
        `);

        if (leads.length === 0) {
            console.log("✅ No hay clientes pendientes hoy.");
            return;
        }

        console.log(`🎯 Procesando bloque de ${leads.length} contactos...`);

        const angulosVenta = [
            "Corto y directo: presentate como Milo de Labeltech y preguntá si necesitan etiquetas o cintas.",
            "Cálido y nostálgico: decile que sos Milo, saludalos cordialmente y ponete a disposición para sus próximas compras.",
            "Enfocado en servicio: mencioná que Labeltech optimizó sus entregas y querés cotizarles stock.",
            "Consultivo: preguntale cómo viene su producción y recordale que son fabricantes directos."
        ];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const anguloElegido = angulosVenta[Math.floor(Math.random() * angulosVenta.length)];

            console.log(`\n✍️  Redactando (Llave IA: ${currentKeyIndex + 1}) para: ${lead.nombre}`);

            const prompt = `
                Sos Milo, ejecutivo de cuentas de Labeltech (Fábrica de etiquetas y cintas).
                Redactá un correo electrónico profesional para la empresa "${lead.nombre}".
                ESTRATEGIA: ${anguloElegido}
                REGLAS: ÚNICAMENTE JSON con "asunto" y "cuerpo". Sin markdown.
            `;

            try {
                let respuesta = await llamarIAConRotacion(prompt);
                respuesta = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
                const mailData = JSON.parse(respuesta);

                const mailEnviado = await enviarCorreoMilo(lead.email, mailData.asunto, mailData.cuerpo);

                if (mailEnviado) {
                    await pool.query(`UPDATE Leads_Antiguos SET ultimo_contacto_mail = NOW() WHERE id = ?`, [lead.id]);
                    console.log(`   ✅ Enviado a ${lead.email}`);
                }
            } catch (error) {
                console.log(`   ❌ Error:`, error.message);
            }

            if (i < leads.length - 1) {
                console.log(`   ⏳ Esperando 45 segundos...`);
                await delay(45000); 
            }
        }
        console.log(`\n🏁 Bloque de hoy finalizado.`);
    } catch (error) {
        console.error("Error en campaña:", error);
    }
}

async function iniciarMotor() {
    await adaptarBaseDeDatos();
    cron.schedule('0 10 * * *', () => ejecutarCampanaDiaria());
    console.log("✉️ Motor de Campañas: INICIADO.");
    setTimeout(() => ejecutarCampanaDiaria(), 5000);
}

iniciarMotor();