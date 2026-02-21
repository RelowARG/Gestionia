// software-gestion-backend/recepcionista_mails.js
const cron = require('node-cron');
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { consultaHibrida } = require('./milo_modules/hibrido');

async function clasificarNuevosMails() {
    console.log(`\n🛎️  [Recepcionista] Revisando bandeja de entrada - ${new Date().toLocaleTimeString()}`);
    
    try {
        // 1. Buscamos mails ENTRANTES de las últimas 2 horas que no hayamos analizado
        // En tu tabla historial_emails, el tipo "entrante" marca los recibidos
        const [mailsNuevos] = await pool.query(`
            SELECT id, direccion_cliente, asunto, cuerpo_texto, fecha 
            FROM historial_emails 
            WHERE tipo = 'entrante' 
            AND fecha >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
            AND id NOT IN (SELECT JSON_UNQUOTE(JSON_EXTRACT(datos_extra, '$.mail_id')) FROM ia_insights WHERE tipo = 'ALERTA_MAIL')
            ORDER BY fecha ASC
        `);

        if (mailsNuevos.length === 0) {
            console.log("   ✅ Nada nuevo en la bandeja de entrada.");
            return;
        }

        console.log(`   📬 ${mailsNuevos.length} correos nuevos detectados.`);

        for (const mail of mailsNuevos) {
            // Buscamos si el remitente existe como cliente
            const [cliente] = await pool.query("SELECT Empresa FROM clientes WHERE Mail = ?", [mail.direccion_cliente]);
            const remitente = cliente.length > 0 ? cliente[0].Empresa : mail.direccion_cliente;

            console.log(`   🔍 Leyendo mail de: ${remitente}...`);

            const promptDatos = `
                Analiza este mail recién llegado:
                Asunto: "${mail.asunto}"
                Cuerpo: "${mail.cuerpo_texto.substring(0, 1500)}"
                
                Resumen en 1 oración de la intención del correo.
            `;

            const tareaEstrategica = `
                Sos el recepcionista de Labeltech. Acaba de llegar este resumen de correo de Milo:
                "(Leer el resumen)"
                
                Clasifica la urgencia en una de estas 3 categorías:
                1. URGENTE: Pide presupuesto, stock urgente o es una queja de envío.
                2. NORMAL: Saludos, facturas, comprobantes de pago.
                3. SPAM: Publicidad, newsletters, proveedores.
                
                REGLA: Responde ÚNICAMENTE en este formato JSON estricto (sin formato markdown):
                {"clasificacion": "URGENTE/NORMAL/SPAM", "motivo": "Explicación muy breve de por qué", "accion": "Sugerencia de respuesta o acción a tomar"}
            `;

            let analisis = await consultaHibrida(promptDatos, tareaEstrategica);
            
            try {
                analisis = analisis.replace(/```json/g, '').replace(/```/g, '').trim();
                const json = JSON.parse(analisis);

                // Si es URGENTE o NORMAL, creamos la alerta en ia_insights para el Dashboard
                if (json.clasificacion === 'URGENTE' || json.clasificacion === 'NORMAL') {
                    const icono = json.clasificacion === 'URGENTE' ? '🚨' : '📩';
                    
                    await pool.query(`INSERT INTO ia_insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'ALERTA_MAIL',
                        `${icono} Mail de ${remitente}: ${json.motivo}`,
                        JSON.stringify({
                            mail_id: mail.id,
                            titulo: `${json.clasificacion} - Mail de ${remitente}`,
                            subtitulo: `Asunto: ${mail.asunto}`,
                            mensaje: json.accion,
                            telefono: null, // No tenemos cel por ahora
                        }),
                        'pendiente'
                    ]);
                    console.log(`      🚩 Alerta generada: ${json.clasificacion} - ${json.motivo}`);
                } else {
                    console.log(`      🗑️ Descartado por ser clasificado como: ${json.clasificacion}`);
                }
                
            } catch (jsonErr) {
                console.log(`      ⚠️ Error al parsear respuesta de Gemini: ${analisis.substring(0, 50)}...`);
            }
        }
    } catch (e) {
        console.error("   ❌ Error del Recepcionista:", e.message);
    }
}

// Se ejecuta cada 15 minutos en horario comercial
cron.schedule('*/15 8-18 * * 1-5', () => clasificarNuevosMails());

// También la probamos al encender
console.log("🛎️  Motor Recepcionista: INICIADO.");
setTimeout(() => clasificarNuevosMails(), 8000);