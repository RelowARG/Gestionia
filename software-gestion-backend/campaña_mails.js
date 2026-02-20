// software-gestion-backend/campaña_mails.js
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { enviarCorreoMilo } = require('./mailer');

const apiKeys = [process.env.MINER_API_KEY, process.env.MINER_API_KEY_2].filter(Boolean);
let currentKeyIndex = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function adaptarBaseDeDatos() {
    try {
        // Le agregamos una columna a la base para recordar cuándo le mandamos el último mail
        await pool.query("ALTER TABLE Leads_Antiguos ADD COLUMN ultimo_contacto_mail DATETIME DEFAULT NULL");
        console.log("🛠️ Base de datos actualizada: Control de tiempos activado.");
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
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                intentos++;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Todas las llaves están agotadas (Error 429).');
}

async function ejecutarCampañaDiaria() {
    console.log(`\n======================================================`);
    console.log(`🚀 Iniciando Campaña de Mails por Goteo - ${new Date().toLocaleString()}`);
    console.log(`======================================================`);

    try {
// Buscamos hasta 150 leads. 
        // ORDEN DE PRIORIDAD: Primero los que NUNCA fueron contactados (IS NULL). 
        // Después, los que hace más tiempo no contactamos (ASC).
        const [leads] = await pool.query(`
            SELECT id, nombre, email 
            FROM Leads_Antiguos 
            WHERE email IS NOT NULL 
            AND (ultimo_contacto_mail IS NULL OR ultimo_contacto_mail < DATE_SUB(NOW(), INTERVAL 40 DAY))
            ORDER BY ultimo_contacto_mail IS NULL DESC, ultimo_contacto_mail ASC
            LIMIT 150
        `);

        if (leads.length === 0) {
            console.log("✅ No hay clientes pendientes de contactar hoy. Todos están al día.");
            return;
        }

        console.log(`🎯 Se seleccionaron ${leads.length} clientes para la campaña de hoy.`);

        // Diferentes "Ángulos" para que la IA no escriba siempre el mismo correo
        const angulosVenta = [
            "Corto y directo: presentate como Milo de Labeltech y preguntá si necesitan insumos o etiquetas.",
            "Cálido y nostálgico: decile que estabas revisando la base histórica de clientes, saludalos cordialmente y ponete a disposición.",
            "Enfocado en servicio: decile que en Labeltech mejoraron sus tiempos de entrega y que te gustaría cotizarle lo que necesite.",
            "Consultivo: preguntale cómo viene su producción este mes y recordale que fabrican etiquetas y cintas de alta calidad."
        ];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            // Elegimos un ángulo al azar
            const anguloElegido = angulosVenta[Math.floor(Math.random() * angulosVenta.length)];

            console.log(`\n✍️  Redactando mail para: ${lead.nombre} (Enfoque: ${anguloElegido.split(':')[0]})`);

            const prompt = `
                Sos Milo, ejecutivo de cuentas de Labeltech (Fábrica de etiquetas y cintas en Argentina).
                Redactá un correo electrónico para la empresa "${lead.nombre}".
                
                ESTRATEGIA A USAR: ${anguloElegido}
                
                REGLAS ESTRICTAS: 
                - Devolvé ÚNICAMENTE un JSON válido con dos campos: "asunto" y "cuerpo".
                - El "asunto" tiene que ser atractivo pero profesional.
                - El "cuerpo" debe estar en formato texto (con saltos de línea \\n).
                - No uses formato markdown.
            `;

            try {
                let respuesta = await llamarIAConRotacion(prompt);
                respuesta = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
                const mailData = JSON.parse(respuesta);

                // Mandamos el mail usando tu cartero
                const mailEnviado = await enviarCorreoMilo(lead.email, mailData.asunto, mailData.cuerpo);

                if (mailEnviado) {
                    // Marcamos la fecha de hoy para no volver a escribirle por 40 días
                    await pool.query(`UPDATE Leads_Antiguos SET ultimo_contacto_mail = NOW() WHERE id = ?`, [lead.id]);
                    console.log(`   ✅ Mail enviado con éxito y fecha registrada en base de datos.`);
                } else {
                    console.log(`   ❌ Falló el envío por error del cartero.`);
                }

            } catch (error) {
                console.log(`   ❌ Error generando mail con IA:`, error.message);
            }

            // ⏱️ FRENO DE SEGURIDAD GMAIL: Esperamos 45 segundos antes del próximo mail
            if (i < leads.length - 1) {
                console.log(`   ⏳ Esperando 45 segundos para cuidar la reputación en Gmail...`);
                await delay(45000); 
            }
        }

        console.log(`\n🏁 Campaña de hoy finalizada. Volveré a arrancar mañana.`);

    } catch (error) {
        console.error("Error en la campaña:", error);
    }
}

async function iniciarMotor() {
    await adaptarBaseDeDatos();
    
    // Configurado para correr todos los días automáticamente a las 10:00 AM
    cron.schedule('0 10 * * *', () => {
        ejecutarCampañaDiaria();
    });

    console.log("✉️ Motor de Campañas de Email: INICIADO.");
    console.log("🕒 Esperando a las 10:00 AM para el envío automático...");
    
    // Al arrancar por primera vez, ejecutamos una ronda de prueba a los 5 segundos
    setTimeout(() => ejecutarCampañaDiaria(), 5000);
}

iniciarMotor();