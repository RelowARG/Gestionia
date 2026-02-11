// software-gestion-backend/ai_modules/salesAgent.js
const { model } = require('./core');
const dbMiddleware = require('../db'); 
const pool = dbMiddleware.pool; 

// --- UTILIDADES ---
function limpiarTelefono(telefono) {
    if (!telefono) return null;
    let num = telefono.toString().replace(/\D/g, '');
    if (num.startsWith('549')) return num; 
    if ((num.startsWith('11') || num.startsWith('2') || num.startsWith('3')) && num.length === 10) {
        return '549' + num;
    }
    return num;
}

// --- 1. CONTEXTO GENERAL ---
async function getBusinessContext() {
    try {
        const db = pool;
        const [ventasHoy] = await db.query(`SELECT COUNT(*) as cantidad, COALESCE(SUM(Total), 0) as dinero FROM Ventas WHERE DATE(Fecha) = CURDATE()`);
        const [stockBajo] = await db.query(`SELECT p.Descripcion, s.Cantidad FROM Stock s JOIN Productos p ON s.Producto_id = p.id WHERE s.Cantidad <= 5 LIMIT 5`);
        const [deudas] = await db.query(`SELECT c.Empresa, SUM(v.Total) as deuda FROM Ventas v JOIN Clientes c ON v.Cliente_id = c.id WHERE v.Pago IN ('Pendiente', 'Parcial', 'Debe') GROUP BY c.id ORDER BY deuda DESC LIMIT 5`);
        
        const fmtStock = stockBajo.map(i => `- ${i.Descripcion} (${i.Cantidad}u)`).join('\n');
        const fmtDeudas = deudas.map(d => `- ${d.Empresa}: $${d.deuda}`).join('\n');

        return `
            REPORTE LABELTECH:
            - Ventas Hoy: ${ventasHoy[0].cantidad} ($${ventasHoy[0].dinero}).
            - Stock Crítico: \n${fmtStock}
            - Mayores Deudores: \n${fmtDeudas}
        `;
    } catch (e) { return "Error DB"; }
}

// --- 2. CHAT CON MILOWSKY (INTERNO) ---
async function chatWithData(userQuestion) {
    try {
        const context = await getBusinessContext();
        // MANTENEMOS "MILOWSKY" AQUÍ PORQUE ES PARA TI
        const prompt = `
            Eres **Milowsky**, el Gerente Comercial Inteligente de Labeltech. 
            Tu estilo es profesional pero cercano y proactivo.
            DATOS EN TIEMPO REAL: ${context}. 
            PREGUNTA DEL USUARIO: "${userQuestion}". 
            INSTRUCCIONES: Responde breve y usa **negritas**.
        `;
        const result = await model.generateContent(prompt);
        return (await result.response).text();
    } catch (e) { return "Estoy procesando mucha información, intenta en unos segundos..."; }
}

// --- 3. LECTOR DE TAREAS ---
async function getOpenTasks() {
    try {
        const db = pool;
        let todasLasTareas = [];

        // A. TAREAS PERSISTENTES
        const [insights] = await db.query(`
            SELECT id, tipo, datos_extra 
            FROM IA_Insights 
            WHERE estado = 'pendiente' 
            ORDER BY fecha DESC
        `);

        insights.forEach(row => {
            try {
                let data = row.datos_extra;
                if (typeof data === 'string') data = JSON.parse(data);
                
                let tipoVisual = 'recupero'; 
                if (row.tipo === 'RECONTACTO_2') tipoVisual = 'recontacto';
                if (row.tipo === 'SEGUIMIENTO_PPT') tipoVisual = 'presupuesto';
                if (row.tipo === 'ALERTA_STOCK') tipoVisual = 'alerta';

                todasLasTareas.push({
                    id: `insight_${row.id}`,       
                    original_db_id: row.id,        
                    tipo: tipoVisual,
                    titulo: data.titulo,
                    subtitulo: data.subtitulo,
                    telefono: data.telefono ? limpiarTelefono(data.telefono) : null,
                    mensaje: data.mensaje_whatsapp || data.mensaje 
                });
            } catch (e) { console.error("Error procesando insight:", e); }
        });

        // B. FILTROS Y NUEVOS MENSAJES
        const [acciones] = await db.query(`SELECT tarea_id FROM IA_Acciones WHERE fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
        const tareasExcluidas = new Set(acciones.map(a => a.tarea_id));

        const [mensajes] = await db.query(`
            SELECT h.Cliente_id, c.Empresa, c.Telefono, h.Mensaje, h.Fecha
            FROM historial_conversaciones h
            JOIN Clientes c ON h.Cliente_id = c.id
            WHERE h.Emisor = 'cliente' 
            AND h.Fecha >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
            ORDER BY h.Fecha DESC LIMIT 10
        `);

        mensajes.forEach(m => {
            const id = `msg_${m.Cliente_id}_${new Date(m.Fecha).getTime()}`;
            if (!tareasExcluidas.has(id)) {
                todasLasTareas.push({
                    id: id, 
                    tipo: 'mensaje', 
                    titulo: `💬 Mensaje de ${m.Empresa}`,
                    subtitulo: `Recibido hace poco.`,
                    telefono: limpiarTelefono(m.Telefono),
                    mensaje: `Hola ${m.Empresa}, vi tu mensaje: "${m.Mensaje}". ¿En qué te ayudo?`
                });
            }
        });

        // C. COBRANZAS (Aquí usamos "Milo" para el cliente)
        const [deudas] = await db.query(`
            SELECT c.id, c.Empresa, c.Telefono, SUM(v.Total) as deuda FROM Ventas v JOIN Clientes c ON v.Cliente_id = c.id
            WHERE v.Pago IN ('Pendiente', 'Parcial', 'Debe') GROUP BY c.id ORDER BY deuda DESC LIMIT 20
        `);

        deudas.forEach(c => {
            const id = `cobro_${c.id}`;
            if (!tareasExcluidas.has(id)) {
                todasLasTareas.push({
                    id: id,
                    tipo: 'cobranza',
                    titulo: `Cobrar a ${c.Empresa}`,
                    subtitulo: `Deuda: $${c.deuda}`,
                    telefono: limpiarTelefono(c.Telefono),
                    // CAMBIADO A MILO
                    mensaje: `Hola ${c.Empresa}, soy Milo. Te escribo por el saldo pendiente de $${c.deuda}. ¿Podemos coordinar el pago? Gracias.`
                });
            }
        });

        return todasLasTareas;

    } catch (error) {
        console.error("Error obteniendo tareas:", error);
        return [];
    }
}

module.exports = { chatWithData, getOpenTasks };