// software-gestion-backend/detector_fuga.js
const cron = require('node-cron');
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { consultaHibrida } = require('./milo_modules/hibrido');
const { obtenerContextoCompleto } = require('./milo_modules/historial');

async function analizarRiesgoFuga() {
    console.log(`\n🩺 [Clínica Milo] Analizando salud de clientes - ${new Date().toLocaleTimeString()}`);

    try {
        // 1. Buscamos qué clientes nos hablaron por WhatsApp en las últimas 48 horas
        const [clientesActivos] = await pool.query(`
            SELECT DISTINCT c.id, c.Empresa, c.Telefono, c.Mail
            FROM historial_conversaciones h
            JOIN clientes c ON h.Cliente_id = c.id
            WHERE h.Emisor = 'cliente' 
            AND h.Fecha >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
        `);

        if (clientesActivos.length === 0) {
            console.log("   ✅ Sin conversaciones recientes para analizar.");
            return;
        }

        console.log(`   🗣️ Analizando el tono de ${clientesActivos.length} clientes...`);

        for (const cliente of clientesActivos) {
            
            // Verificamos si ya generamos una alerta de fuga hoy para no spamear
            const [alertaExistente] = await pool.query(`
                SELECT id FROM ia_insights 
                WHERE tipo = 'ALERTA_FUGA' 
                AND JSON_UNQUOTE(JSON_EXTRACT(datos_extra, '$.cliente_id')) = ? 
                AND fecha >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `, [String(cliente.id)]);

            if (alertaExistente.length > 0) continue;

            // Obtenemos su historial reciente
            const memoria = await obtenerContextoCompleto(cliente.id, cliente.Mail);

            const promptDatosMilo = `
                Analiza este historial reciente de WhatsApp de "${cliente.Empresa}": ${JSON.stringify(memoria.chats)}.
                Concéntrate en el TONO del cliente. ¿Está enojado, impaciente, frío, o normal?
                Resume el problema principal (si lo hay) en una oración.
            `;

            const tareaEstrategicaGemini = `
                Sos el Director de Atención al Cliente de Labeltech.
                Milo acaba de resumir el tono de un cliente ("${cliente.Empresa}"):
                
                RESUMEN: "(Leer el resumen de Milo)"
                
                TAREA: Determinar si existe "Riesgo de Fuga" (Churn Risk).
                Indicadores de fuga: Quejas por precio, demoras, mención a la competencia, respuestas cortantes tras un problema, o enojo explícito.
                
                REGLA: Responde ÚNICAMENTE en este formato JSON estricto (sin markdown):
                {"riesgo": "ALTO/MEDIO/BAJO", "motivo": "Explicación muy breve de la fricción", "consejo": "Qué deberíamos hacer YA para retenerlo"}
            `;

            try {
                let analisis = await consultaHibrida(promptDatosMilo, tareaEstrategicaGemini);
                analisis = analisis.replace(/```json/g, '').replace(/```/g, '').trim();
                const json = JSON.parse(analisis);

                // Si el riesgo es ALTO o MEDIO, disparamos la alarma al Dashboard
                if (json.riesgo === 'ALTO' || json.riesgo === 'MEDIO') {
                    const icono = json.riesgo === 'ALTO' ? '🔥' : '⚠️';
                    
                    await pool.query(`INSERT INTO ia_insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'ALERTA_FUGA',
                        `${icono} Riesgo de Fuga (${json.riesgo}): ${cliente.Empresa}`,
                        JSON.stringify({
                            cliente_id: cliente.id,
                            titulo: `Riesgo ${json.riesgo}: ${cliente.Empresa}`,
                            subtitulo: `Motivo: ${json.motivo}`,
                            mensaje: `Consejo de retención: ${json.consejo}`,
                            telefono: cliente.Telefono
                        }),
                        'pendiente'
                    ]);
                    
                    console.log(`      ${icono} ¡ALERTA! Riesgo ${json.riesgo} detectado en ${cliente.Empresa}.`);
                } else {
                    console.log(`      ✅ ${cliente.Empresa}: Relación estable (Riesgo Bajo).`);
                }

            } catch (jsonErr) {
                console.log(`      ⚠️ Error al analizar a ${cliente.Empresa}.`);
            }
        }
    } catch (e) {
        console.error("   ❌ Error en Clínica Milo:", e.message);
    }
}

// Se ejecuta 3 veces al día (Mañana, Mediodía, Tarde)
cron.schedule('0 9,13,17 * * *', () => analizarRiesgoFuga());

console.log("🩺 Motor de Detección de Fugas: INICIADO.");
// Ejecutamos una vez al prender para escanear lo que pasó mientras el sistema estuvo apagado
setTimeout(() => analizarRiesgoFuga(), 12000);