// software-gestion-backend/recepcionista_mails.js
const cron = require('node-cron');
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;
const { consultaHibrida } = require('./milo_modules/hibrido');

async function clasificarNuevosMails() {
    console.log(`\n🛎️  [Recepcionista] Revisando bandeja de entrada - ${new Date().toLocaleTimeString()}`);
    
    try {
        // DEBUG: Contamos cuántos correos ve la base de datos sin filtros, para diagnóstico
        const [totalMails] = await pool.query(`
            SELECT id FROM historial_emails 
            WHERE tipo = 'entrante' AND fecha >= DATE_SUB(NOW(), INTERVAL 3 DAY)
        `);
        console.log(`   📊 [Diagnóstico] Mails entrantes en BD (últimos 3 días): ${totalMails.length}`);

        // 1. Ampliamos la búsqueda a 3 días (evita bugs de zona horaria)
        // 2. Agregamos IS NOT NULL (evita el bug de SQL donde NOT IN colapsa si hay un Null)
        const [mailsNuevos] = await pool.query(`
            SELECT id, direccion_cliente, asunto, cuerpo_texto, fecha 
            FROM historial_emails 
            WHERE tipo = 'entrante' 
            AND fecha >= DATE_SUB(NOW(), INTERVAL 3 DAY)
            AND id NOT IN (
                SELECT JSON_UNQUOTE(JSON_EXTRACT(datos_extra, '$.mail_id')) 
                FROM ia_insights 
                WHERE tipo = 'ALERTA_MAIL' 
                AND JSON_EXTRACT(datos_extra, '$.mail_id') IS NOT NULL
            )
            ORDER BY fecha ASC
        `);

        if (mailsNuevos.length === 0) {
            console.log("   ✅ Nada nuevo sin procesar en la bandeja de entrada.");
            return;
        }

        console.log(`   📬 ${mailsNuevos.length} correos PENDIENTES de análisis detectados.`);

        for (const mail of mailsNuevos) {
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
                
                Clasifica la urgencia en una de estas 4 categorías:
                1. URGENTE: Pide presupuesto, stock urgente o es una queja de envío.
                2. NORMAL: Saludos, facturas, comprobantes de pago.
                3. REBOTE: Mensaje automático del servidor indicando que el correo no se pudo entregar, rebotó o la dirección no existe (Mail Delivery Subsystem, Postmaster, etc).
                4. SPAM: Publicidad, newsletters, proveedores irrelevantes.
                
                REGLA: Responde ÚNICAMENTE en este formato JSON estricto (sin formato markdown):
                {"clasificacion": "URGENTE/NORMAL/REBOTE/SPAM", "motivo": "Explicación breve", "accion": "Sugerencia", "mail_roto": "Si es REBOTE, extrae EXACTAMENTE la dirección de correo del cliente que falló o no existe. Si no es rebote, pon null"}
            `;

            let analisis = await consultaHibrida(promptDatos, tareaEstrategica);
            
            try {
                analisis = analisis.replace(/```json/g, '').replace(/```/g, '').trim();
                const json = JSON.parse(analisis);

                if (json.clasificacion === 'REBOTE' && json.mail_roto) {
                    console.log(`      🚫 [REBOTE] Detectado mail inválido: ${json.mail_roto}. Autosanando Base de Datos...`);
                    
                    await pool.query(`
                        UPDATE clientes 
                        SET Mail = NULL, Observaciones = CONCAT(IFNULL(Observaciones, ''), ' [MAIL INEXISTENTE]') 
                        WHERE Mail = ?`, 
                    [json.mail_roto]);
                    
                    await pool.query(`INSERT INTO ia_insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'ALERTA_MAIL',
                        `🗑️ Depuración automática: Mail rebotado (${json.mail_roto}) eliminado.`,
                        JSON.stringify({
                            mail_id: mail.id,
                            titulo: `Mail Inexistente Eliminado`,
                            subtitulo: `Se desvinculó el correo: ${json.mail_roto}`,
                            mensaje: `Motivo: ${json.motivo}`,
                            telefono: null
                        }),
                        'completado' 
                    ]);

                } else if (json.clasificacion === 'URGENTE' || json.clasificacion === 'NORMAL') {
                    const icono = json.clasificacion === 'URGENTE' ? '🚨' : '📩';
                    
                    await pool.query(`INSERT INTO ia_insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'ALERTA_MAIL',
                        `${icono} Mail de ${remitente}: ${json.motivo}`,
                        JSON.stringify({
                            mail_id: mail.id,
                            titulo: `${json.clasificacion} - Mail de ${remitente}`,
                            subtitulo: `Asunto: ${mail.asunto}`,
                            mensaje: json.accion,
                            telefono: null,
                        }),
                        'pendiente'
                    ]);
                    console.log(`      🚩 Alerta generada: ${json.clasificacion} - ${json.motivo}`);
                } else {
                    // NUEVO: Guardamos el SPAM en BD como completado para que NUNCA MÁS lo vuelva a procesar
                    await pool.query(`INSERT INTO ia_insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'ALERTA_MAIL',
                        `🗑️ Spam Ignorado: ${remitente}`,
                        JSON.stringify({
                            mail_id: mail.id,
                            titulo: `Spam`,
                            subtitulo: `Ignorado`,
                            mensaje: `Spam`,
                        }),
                        'completado'
                    ]);
                    console.log(`      🗑️ Descartado y archivado por ser clasificado como: ${json.clasificacion}`);
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

console.log("🛎️  Motor Recepcionista: INICIADO.");
setTimeout(() => clasificarNuevosMails(), 3000);