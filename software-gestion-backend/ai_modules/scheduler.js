const cron = require('node-cron');
const { model } = require('./core');
const db = require('../db');

// Función para redactar el mensaje de WhatsApp usando IA
async function generateReconnectionMessage(nombreCliente) {
    const prompt = `
        Escribe un mensaje de WhatsApp para un cliente llamado "${nombreCliente}".
        CONTEXTO: No nos compra hace más de 30 días.
        OBJETIVO: Saludarlo amablemente y recordarle que estamos a su disposición.
        TONO: Casual, corto y respetuoso. Sin asuntos ni saludos formales de carta.
        SALIDA: Solo el texto del mensaje.
    `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        return `Hola ${nombreCliente}, hace tiempo no te vemos. ¡Esperamos que estés bien!`;
    }
}

async function runDailyAnalysis() {
    console.log('--- 🧠 Iniciando Análisis de IA (Scheduler) ---');

    // Query para detectar clientes perdidos (>30 días sin comprar)
    // Ajusta los nombres de tablas (Clientes, Ventas) según tu DB real si difieren
    const queryClientes = `
        SELECT c.id, c.nombre, c.telefono, MAX(v.fecha) as ultima_compra
        FROM Clientes c
        JOIN Ventas v ON c.id = v.cliente_id
        GROUP BY c.id
        HAVING ultima_compra < DATE_SUB(NOW(), INTERVAL 30 DAY)
        LIMIT 3; 
    `;

    try {
        const [clientes] = await db.promise().query(queryClientes);

        for (const cliente of clientes) {
            // Verificar si ya generamos una alerta para este cliente HOY
            // Buscamos dentro del JSON de datos_extra o por fecha
            const [existe] = await db.promise().query(`
                SELECT id FROM IA_Insights 
                WHERE tipo = 'WHATSAPP_SUGERIDO' 
                AND datos_extra LIKE ? 
                AND DATE(fecha) = CURDATE()
            `, [`%"cliente_id":${cliente.id}%`]);

            if (existe.length === 0) {
                // Generar mensaje con Gemini
                const mensajeWhatsapp = await generateReconnectionMessage(cliente.nombre);

                // Preparar datos para tu tabla
                const analisis = `El cliente ${cliente.nombre} no compra desde el ${new Date(cliente.ultima_compra).toLocaleDateString()}.`;
                
                const datosExtra = {
                    cliente_id: cliente.id,
                    nombre_cliente: cliente.nombre,
                    telefono: cliente.telefono,
                    mensaje_whatsapp: mensajeWhatsapp,
                    titulo: `Recuperar a ${cliente.nombre}`
                };

                // Insertar en la DB
                await db.promise().query(
                    `INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`,
                    [
                        'WHATSAPP_SUGERIDO',
                        analisis,
                        JSON.stringify(datosExtra),
                        'no_leido'
                    ]
                );
                console.log(`> Alerta generada para cliente: ${cliente.nombre}`);
            }
        }
    } catch (error) {
        console.error("Error en el Scheduler:", error);
    }
}

function initScheduler() {
    // Configurado para correr todos los días a las 10:00 AM
    cron.schedule('0 10 * * *', () => {
        runDailyAnalysis();
    });
    console.log('✅ Sistema IA Proactivo: Iniciado');
}

module.exports = { initScheduler, runDailyAnalysis };