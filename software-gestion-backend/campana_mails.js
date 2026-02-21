// software-gestion-backend/campana_mails.js
const cron = require('node-cron');
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { enviarCorreoMilo } = require('./mailer');

// --- IMPORTAMOS EL CEREBRO HÍBRIDO Y LA MEMORIA ---
const { consultaHibrida } = require('./milo_modules/hibrido');
const { obtenerContextoCompleto } = require('./milo_modules/historial');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function adaptarBaseDeDatos() {
    try {
        await pool.query("ALTER TABLE Leads_Antiguos ADD COLUMN ultimo_contacto_mail DATETIME DEFAULT NULL");
    } catch (e) {}
}

async function ejecutarCampanaDiaria() {
    console.log(`\n======================================================`);
    console.log(`🎯 Campaña de Mails "Francotirador" - ${new Date().toLocaleString()}`);
    console.log(`======================================================`);

    try {
        // Buscamos leads que no hayan recibido mail en los últimos 40 días
        const [leads] = await pool.query(`
            SELECT id, nombre, email, telefono 
            FROM Leads_Antiguos 
            WHERE email IS NOT NULL 
            AND (ultimo_contacto_mail IS NULL OR ultimo_contacto_mail < DATE_SUB(NOW(), INTERVAL 40 DAY))
            ORDER BY ultimo_contacto_mail IS NULL DESC, ultimo_contacto_mail ASC
            LIMIT 50 -- Bajamos a 50 para que el análisis profundo no tarde horas
        `);

        if (leads.length === 0) {
            console.log("✅ No hay clientes pendientes hoy.");
            return;
        }

        console.log(`🎯 Procesando bloque de ${leads.length} contactos con Cerebro Híbrido...`);

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            console.log(`\n🔎 [${i+1}/${leads.length}] Investigando a: ${lead.nombre}...`);

            // 1. BUSCAMOS MEMORIA OMNICANAL (WhatsApp + Mails)
            // Usamos un ID genérico (0) porque los leads antiguos a veces no están en la tabla Clientes,
            // pero buscamos por su email o teléfono.
            const memoria = await obtenerContextoCompleto(0, lead.email); 

            // 2. EL ESTRATEGA (Milo lee, Gemini redacta)
            let promptDatosMilo = "No hay historial previo con este cliente.";
            if (memoria.chats.length > 0 || memoria.mails.length > 0) {
                promptDatosMilo = `
                    Analiza este historial de (Mails y WhatsApp) del lead "${lead.nombre}": 
                    ${JSON.stringify(memoria)}.
                    Resumen en 1 oración: ¿Qué le interesaba o de qué se quejó la última vez?
                `;
            }

            const tareaEstrategicaGemini = `
                Tu nombre es Milo, ejecutivo de cuentas de Labeltech (Fábrica de etiquetas y Ribbons).
                Escribí un mail en frío (pero cálido) para el lead "${lead.nombre}".
                
                HISTORIAL: (Lee el resumen de Milo. Si dice que no hay historial, ofreceles nuestro catálogo de etiquetas y ribbons. Si hay historial, mencioná sutilmente lo último que hablaron para conectar).
                
                REGLAS DE FORMATO:
                1. Eliminá números, "Base Histórica" o "Archivo" del nombre del cliente.
                2. NUNCA menciones la palabra "Ceyal". Somos Labeltech.
                3. Entregá ÚNICAMENTE un objeto JSON con las llaves "asunto" y "cuerpo". Sin markdown, solo texto.
            `;

            try {
                // LLAMADA AL MOTOR HÍBRIDO (RTX + Nube)
                let respuesta = await consultaHibrida(promptDatosMilo, tareaEstrategicaGemini);
                
                // Limpiamos el JSON que devuelve Gemini
                respuesta = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
                const mailData = JSON.parse(respuesta);

                // ENVIAMOS EL MAIL
                const mailEnviado = await enviarCorreoMilo(lead.email, mailData.asunto, mailData.cuerpo);

                if (mailEnviado) {
                    await pool.query(`UPDATE Leads_Antiguos SET ultimo_contacto_mail = NOW() WHERE id = ?`, [lead.id]);
                    console.log(`   ✅ Mail súper-personalizado enviado a ${lead.email}`);
                }
            } catch (error) {
                console.log(`   ❌ Error con ${lead.nombre}:`, error.message);
            }

            // Pausa de 20 segs para no saturar SMTP ni la GPU
            if (i < leads.length - 1) {
                await delay(20000); 
            }
        }
        console.log(`\n🏁 Campaña Francotirador finalizada.`);
    } catch (error) {
        console.error("Error en campaña:", error);
    }
}

async function iniciarMotor() {
    await adaptarBaseDeDatos();
    cron.schedule('0 10 * * *', () => ejecutarCampanaDiaria()); // Se ejecuta a las 10 AM
    console.log("✉️ Motor de Campañas Francotirador: INICIADO.");
    // Lo corremos a los 5 segundos de prender para probar
    setTimeout(() => ejecutarCampanaDiaria(), 5000);
}

iniciarMotor();