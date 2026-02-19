// software-gestion-backend/ai_modules/scheduler.js
const cron = require('node-cron');
const { model } = require('./core');
const dbMiddleware = require('../db');
const pool = dbMiddleware.pool;

// --- CONFIGURACIÓN DE SEGURIDAD API ---
const DELAY_MS = 20000; 
const MAX_GENERATIONS_PER_RUN = 5; 

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- AUTO-FIX DE BASE DE DATOS ---
async function fixDatabaseSchema(db) {
    try {
        await db.query("ALTER TABLE IA_Insights MODIFY COLUMN datos_extra TEXT");
        await db.query("ALTER TABLE IA_Insights MODIFY COLUMN mensaje TEXT");
    } catch (e) {}
}

// --- PARSER SEGURO ---
function parseSafeJSON(raw) {
    if (typeof raw === 'object' && raw !== null) return raw;
    const str = String(raw);
    try {
        return { data: JSON.parse(str), isCorrupt: false };
    } catch (e) {
        const cid = str.match(/"cliente_id"\s*:\s*(\d+)/);
        const pid = str.match(/"presupuesto_id"\s*:\s*(\d+)/);
        return { 
            data: {
                cliente_id: cid ? parseInt(cid[1], 10) : null,
                presupuesto_id: pid ? parseInt(pid[1], 10) : null
            }, 
            isCorrupt: true 
        };
    }
}

// --- GENERADORES DE MENSAJES (IA) ---

async function generateReconnectionMessage(cliente, productos, contacto, intento = 1) {
    const nombreSaludo = contacto && contacto !== 'Encargado' ? contacto : cliente;
    const context = intento === 1 ? "No compra hace más de 30 días." : "Ya le escribimos hace 2 meses y no respondió/compró.";
    
    const prompt = `
        Actúa como Milo, ejecutivo de cuentas de Labeltech.
        Redacta un mensaje de WhatsApp para "${nombreSaludo}".
        CONTEXTO: ${context}
        PRODUCTO HABITUAL: ${productos}.
        OBJETIVO: ${intento === 1 ? 'Reactivar la venta con empatía.' : 'Re-conectar suavemente, sin presionar.'}
        ESTILO: Conversacional, cálido y argentino.
        REGLAS: Solo el cuerpo del mensaje.
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        return text.replace(/^"|"$/g, '').replace(/^(Claro|Aquí|Te paso|Por supuesto).*?:/i, '').trim();
    } catch (e) {
        const variaciones = [
            `Hola ${nombreSaludo}, soy Milo de Labeltech. Estaba revisando y vi que hace un tiempito no reponemos stock de ${productos}. ¿Cómo vienen con eso?`,
            `¿Cómo estás ${nombreSaludo}? Milo de este lado. Te escribo porque hace mucho no preparamos pedido de ${productos} y quería ver si necesitaban asistencia.`
        ];
        return variaciones[Math.floor(Math.random() * variaciones.length)];
    }
}

async function generateBudgetFollowUp(cliente, numeroPresupuesto, montoStr) {
    const prompt = `
        Actúa como Milo de Labeltech.
        Escribe un mensaje de seguimiento para "${cliente}" sobre el Presupuesto #${numeroPresupuesto} (${montoStr}).
        INSTRUCCIONES: Sé amable y servicial. Solo el texto.
    `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim().replace(/^"|"$/g, '');
    } catch (e) {
        return `Hola ${cliente}, soy Milo. ¿Pudieron revisar el presupuesto #${numeroPresupuesto}? Avisame cualquier duda.`;
    }
}

// --- CORE: LIMPIEZA PROFUNDA Y MEMORIA ---

async function syncAndCleanTasks(db) {
    console.log('🧹 [Mantenimiento] Iniciando limpieza profunda de duplicados y errores...');
    
    const [rows] = await db.query("SELECT id, tipo, datos_extra, fecha FROM IA_Insights WHERE estado = 'pendiente' ORDER BY id DESC");
    
    const memoryMap = { byClient: new Set(), byBudget: new Set() };
    const idsToDelete = [];
    const seenKeys = new Set();

    for (const row of rows) {
        const parsed = parseSafeJSON(row.datos_extra);
        const data = parsed.data;

        if (parsed.isCorrupt) {
            idsToDelete.push(row.id);
            continue; 
        }

        let uniqueKey = null;
        let targetSet = null;

        if (data.cliente_id && (row.tipo === 'WHATSAPP_SUGERIDO' || row.tipo === 'RECONTACTO_2' || row.tipo === 'NUEVO_MENSAJE')) {
            uniqueKey = `C_${String(data.cliente_id)}_${row.tipo}`;
            targetSet = memoryMap.byClient;
        } else if (data.presupuesto_id && row.tipo === 'SEGUIMIENTO_PPT') {
            uniqueKey = `P_${String(data.presupuesto_id)}_${row.tipo}`;
            targetSet = memoryMap.byBudget;
        }

        if (uniqueKey) {
            if (seenKeys.has(uniqueKey)) {
                idsToDelete.push(row.id); 
            } else {
                seenKeys.add(uniqueKey);
                if (targetSet) targetSet.add(uniqueKey);
            }
        }
    }

    if (idsToDelete.length > 0) {
        console.log(`🔥 Limpiando ${idsToDelete.length} tareas (Duplicadas o Truncadas)...`);
        const chunkSize = 50;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            await db.query(`DELETE FROM IA_Insights WHERE id IN (${chunk.join(',')})`);
        }
    } else {
        console.log('✅ Base de datos sana.');
    }

    return memoryMap;
}

// --- VERIFICADORES INFALIBLES ---

async function checkRecentHistory(db, clienteId, tipo, dias) {
    try {
        const [rows] = await db.query(`
            SELECT id FROM IA_Insights 
            WHERE tipo = ? 
            AND JSON_UNQUOTE(JSON_EXTRACT(datos_extra, '$.cliente_id')) = ? 
            AND estado != 'pendiente'
            AND fecha >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 1
        `, [tipo, String(clienteId), dias]);
        return rows.length > 0;
    } catch (e) {
        const [rows] = await db.query(`
            SELECT id FROM IA_Insights 
            WHERE tipo = ? 
            AND (datos_extra LIKE ? OR datos_extra LIKE ?) 
            AND estado != 'pendiente'
            AND fecha >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 1
        `, [tipo, `%"cliente_id":${clienteId}%`, `%"cliente_id": ${clienteId}%`, dias]);
        return rows.length > 0;
    }
}

async function checkChatActivity(db, clienteId, dias) {
    try {
        const [rows] = await db.query(`
            SELECT id FROM historial_conversaciones 
            WHERE Cliente_id = ? 
            AND Fecha >= DATE_SUB(NOW(), INTERVAL ? DAY) 
            LIMIT 1
        `, [clienteId, dias]);
        return rows.length > 0;
    } catch (e) {
        return false; 
    }
}

async function verificarSiSeConvirtioEnVenta(db, clienteId, fechaPresupuesto) {
    try {
        const fStart = new Date(fechaPresupuesto).toISOString().split('T')[0];
        const fechaLimit = new Date(fechaPresupuesto);
        fechaLimit.setDate(fechaLimit.getDate() + 15);
        const fEnd = fechaLimit.toISOString().split('T')[0];

        const [v] = await db.query("SELECT id FROM Ventas WHERE Cliente_id = ? AND Fecha BETWEEN ? AND ? LIMIT 1", [clienteId, fStart, fEnd]);
        if (v.length > 0) return true;
        const [vx] = await db.query("SELECT id FROM VentasX WHERE Cliente_id = ? AND Fecha BETWEEN ? AND ? LIMIT 1", [clienteId, fStart, fEnd]);
        if (vx.length > 0) return true;
        return false;
    } catch (e) { return false; }
}

// --- ANÁLISIS DIARIO ---

async function runDailyAnalysis() {
    console.log('--- 🧠 Milowsky Scheduler: Iniciando Barrido Seguro ---');
    const db = pool;
    let generatedCount = 0;

    try {
        await fixDatabaseSchema(db);
        const memoryMap = await syncAndCleanTasks(db);

        // 1. RECUPERO INICIAL (Sin límite de clientes, analiza a TODOS)
        if (generatedCount < MAX_GENERATIONS_PER_RUN) {
            const [clientes] = await db.query(`
                SELECT c.id, c.Empresa, c.Contacto, c.Telefono, MAX(v.Fecha) as ultima_compra
                FROM Clientes c JOIN Ventas v ON c.id = v.Cliente_id
                GROUP BY c.id
                HAVING ultima_compra < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ORDER BY SUM(v.Total) DESC
            `); // Se removió el LIMIT 30

            for (const c of clientes) {
                if (generatedCount >= MAX_GENERATIONS_PER_RUN) break;

                const key = `C_${String(c.id)}_WHATSAPP_SUGERIDO`;
                if (memoryMap.byClient.has(key)) continue; 
                
                const yaHablaron = await checkChatActivity(db, c.id, 60);
                const yaGeneradoIA = await checkRecentHistory(db, c.id, 'WHATSAPP_SUGERIDO', 60);
                
                if (yaHablaron || yaGeneradoIA) continue;

                const [prods] = await db.query(`SELECT p.Descripcion FROM Venta_Items vi JOIN Ventas v ON vi.Venta_id = v.id JOIN Productos p ON vi.Producto_id = p.id WHERE v.Cliente_id = ? GROUP BY p.id ORDER BY SUM(vi.Cantidad) DESC LIMIT 1`, [c.id]);
                const prod = prods[0]?.Descripcion || "insumos";
                
                const msg = await generateReconnectionMessage(c.Empresa, prod, c.Contacto, 1);
                const dias = Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));

                await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                    'WHATSAPP_SUGERIDO', `Recupero ${c.Empresa}`,
                    JSON.stringify({
                        cliente_id: c.id, nombre_cliente: c.Empresa, telefono: c.Telefono,
                        mensaje_whatsapp: msg, titulo: `Recuperar a ${c.Empresa}`,
                        subtitulo: `Inactivo ${dias} días (Intento 1).`
                    }), 'pendiente'
                ]);
                
                console.log(`> [${++generatedCount}/${MAX_GENERATIONS_PER_RUN}] Generado Recupero: ${c.Empresa}`);
                memoryMap.byClient.add(key); 
                await delay(DELAY_MS);
            }
        }

        // 2. RE-CONTACTO
        if (generatedCount < MAX_GENERATIONS_PER_RUN) {
            const [viejos] = await db.query(`
                SELECT id, datos_extra, fecha FROM IA_Insights 
                WHERE tipo = 'WHATSAPP_SUGERIDO' 
                AND estado IN ('completado', 'auto_enviado')
                AND fecha BETWEEN DATE_SUB(NOW(), INTERVAL 90 DAY) AND DATE_SUB(NOW(), INTERVAL 60 DAY)
            `);

            for (const intento of viejos) {
                if (generatedCount >= MAX_GENERATIONS_PER_RUN) break;
                try {
                    const parsed = parseSafeJSON(intento.datos_extra);
                    if (parsed.isCorrupt) continue;
                    
                    const cid = parsed.data.cliente_id;
                    const key = `C_${String(cid)}_RECONTACTO_2`;

                    if (memoryMap.byClient.has(key)) continue;

                    const [compras] = await db.query("SELECT id FROM Ventas WHERE Cliente_id = ? AND Fecha > ?", [cid, intento.fecha]);
                    if (compras.length === 0) {
                        
                        const yaHablaron = await checkChatActivity(db, cid, 60);
                        const yaGeneradoIA = await checkRecentHistory(db, cid, 'RECONTACTO_2', 90);
                        if (yaHablaron || yaGeneradoIA) continue;

                        const msg2 = await generateReconnectionMessage(parsed.data.nombre_cliente, "etiquetas", null, 2);
                        await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                            'RECONTACTO_2', `Segundo intento ${parsed.data.nombre_cliente}`,
                            JSON.stringify({
                                cliente_id: cid, nombre_cliente: parsed.data.nombre_cliente, telefono: parsed.data.telefono,
                                mensaje_whatsapp: msg2, 
                                titulo: `Re-intentar: ${parsed.data.nombre_cliente}`,
                                subtitulo: `Falló intento hace 2 meses.`
                            }), 'pendiente'
                        ]);
                        console.log(`> [${++generatedCount}/${MAX_GENERATIONS_PER_RUN}] Generado Re-contacto: ${parsed.data.nombre_cliente}`);
                        memoryMap.byClient.add(key);
                        await delay(DELAY_MS);
                    }
                } catch (e) { continue; }
            }
        }

        // 3. PRESUPUESTOS
        if (generatedCount < MAX_GENERATIONS_PER_RUN) {
            const [ppts] = await db.query(`
                SELECT p.id, p.Total_USD, p.Total_ARS, p.Cliente_id, p.Fecha, c.Empresa, c.Telefono
                FROM Presupuestos p JOIN Clientes c ON p.Cliente_id = c.id
                WHERE p.Fecha < DATE_SUB(NOW(), INTERVAL 3 DAY)
                AND p.Fecha > DATE_SUB(NOW(), INTERVAL 15 DAY)
            `);

            for (const p of ppts) {
                if (generatedCount >= MAX_GENERATIONS_PER_RUN) break;

                const key = `P_${String(p.id)}_SEGUIMIENTO_PPT`;
                if (memoryMap.byBudget.has(key)) continue;

                const vendido = await verificarSiSeConvirtioEnVenta(db, p.Cliente_id, p.Fecha);
                if (!vendido) {
                    let montoStr = p.Total_USD > 0 ? `USD ${p.Total_USD}` : `$${p.Total_ARS}`;
                    const msgPpt = await generateBudgetFollowUp(p.Empresa, p.id, montoStr);
                    
                    await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                        'SEGUIMIENTO_PPT', `Seguimiento PPT #${p.id}`,
                        JSON.stringify({
                            presupuesto_id: p.id, nombre_cliente: p.Empresa, telefono: p.Telefono,
                            mensaje_whatsapp: msgPpt,
                            titulo: `Seguimiento Presupuesto #${p.id}`,
                            subtitulo: `Enviado el ${new Date(p.Fecha).toLocaleDateString()}.`
                        }), 'pendiente'
                    ]);
                    console.log(`> [${++generatedCount}/${MAX_GENERATIONS_PER_RUN}] Generado Seguimiento PPT: ${p.Empresa}`);
                    memoryMap.byBudget.add(key);
                    await delay(DELAY_MS);
                }
            }
        }

        // 4. STOCK
        const [stockCritico] = await db.query(`SELECT s.id, p.Descripcion, s.Cantidad FROM Stock s JOIN Productos p ON s.Producto_id = p.id WHERE s.Cantidad <= 5`);
        if (stockCritico.length > 0) {
             const [hoy] = await db.query(`SELECT id FROM IA_Insights WHERE tipo = 'ALERTA_STOCK' AND DATE(fecha) = CURDATE()`);
             if (hoy.length === 0) {
                 const lista = stockCritico.map(i => `• ${i.Descripcion} (${i.Cantidad})`).join('\n');
                 await db.query(`INSERT INTO IA_Insights (tipo, mensaje, datos_extra, estado) VALUES (?, ?, ?, ?)`, [
                    'ALERTA_STOCK', 'Stock Bajo',
                    JSON.stringify({
                        titulo: "⚠️ Alerta de Stock", subtitulo: `${stockCritico.length} productos críticos.`,
                        mensaje: `Reponer:\n${lista}`, es_interno: true 
                    }), 'pendiente'
                ]);
                console.log(`> Alerta de Stock generada.`);
             }
        }

        if (generatedCount >= MAX_GENERATIONS_PER_RUN) {
            console.log('🛑 Límite de seguridad alcanzado (5 tareas). El resto quedará para el próximo turno.');
        }
        console.log('--- 🧠 Fin Barrido ---');

    } catch (error) {
        console.error("Error Scheduler:", error);
    }
}

function initScheduler() {
    cron.schedule('0 * * * *', () => runDailyAnalysis());
    setTimeout(() => runDailyAnalysis(), 5000);
    console.log('✅ Sistema Milowsky V2: Iniciado (Modo Anti-Spam Definitivo - 1 vez por hora)');
}

module.exports = { initScheduler, runDailyAnalysis };