const { model } = require('./core');
const { pool } = require('../db');

// --- UTILIDADES ---
function limpiarTelefono(telefono) {
    if (!telefono) return null;
    let num = telefono.toString().replace(/\D/g, '');
    
    // Lógica Argentina
    if (num.startsWith('549')) return num; 
    if ((num.startsWith('11') || num.startsWith('2') || num.startsWith('3')) && num.length === 10) {
        return '549' + num;
    }
    return num;
}

// --- FUNCIÓN DE LIMPIEZA BLINDADA ---
// Busca el primer corchete '[' y el último ']' para extraer SOLO el JSON válido.
function extraerJSON(texto) {
    try {
        const inicio = texto.indexOf('[');
        const fin = texto.lastIndexOf(']');
        if (inicio === -1 || fin === -1) return []; // Si no hay array, devuelve vacío
        
        const jsonLimpio = texto.substring(inicio, fin + 1);
        return JSON.parse(jsonLimpio);
    } catch (e) {
        console.error("Error parseando JSON de IA:", e);
        return [];
    }
}

// --- 1. CONTEXTO GENERAL ---
async function getBusinessContext() {
    try {
        const db = pool.promise();
        const [ventasHoy] = await db.query(`SELECT COUNT(*) as cantidad, COALESCE(SUM(Total), 0) as dinero FROM ventas WHERE DATE(Fecha) = CURDATE()`);
        const [stockBajo] = await db.query(`SELECT p.Descripcion, s.Cantidad FROM stock s JOIN productos p ON s.Producto_id = p.id WHERE s.Cantidad <= 5 LIMIT 5`);
        const [deudas] = await db.query(`SELECT c.Empresa, SUM(v.Total) as deuda FROM ventas v JOIN clientes c ON v.Cliente_id = c.id WHERE v.Pago IN ('Pendiente', 'Parcial', 'Debe') GROUP BY c.id ORDER BY deuda DESC LIMIT 3`);
        
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

// --- 2. CHAT ---
async function chatWithData(userQuestion) {
    try {
        const context = await getBusinessContext();
        const prompt = `
            Eres el Gerente Comercial de Labeltech. 
            DATOS: ${context}. 
            USUARIO: "${userQuestion}". 
            INSTRUCCIONES: Responde breve y usa **negritas**.
        `;
        const result = await model.generateContent(prompt);
        return (await result.response).text();
    } catch (e) { return "Procesando..."; }
}

// --- 3. GENERADOR DE TAREAS ---
async function getOpenTasks() {
    try {
        const db = pool.promise();

        // A. NUEVOS MENSAJES (Prioridad Máxima)
        const [mensajes] = await db.query(`
            SELECT h.Cliente_id, c.Empresa, c.Telefono, h.Mensaje, h.Fecha
            FROM historial_conversaciones h
            JOIN clientes c ON h.Cliente_id = c.id
            WHERE h.Emisor = 'cliente' 
            AND h.Fecha >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY h.Fecha DESC LIMIT 3
        `);

        const tareasMensajes = mensajes.map(m => ({
            id: `msg_${m.Cliente_id}_${m.Fecha.getTime()}`, 
            tipo: 'mensaje', 
            titulo: `💬 Mensaje de ${m.Empresa}`,
            subtitulo: `Recibido hace poco.`,
            telefono: limpiarTelefono(m.Telefono),
            mensaje: `Hola ${m.Empresa}, vi tu mensaje: "${m.Mensaje}". ¿En qué te ayudo?`
        }));

        // B. RECUPERO (Inactivos > 30 días)
        const [clientes] = await db.query(`
            SELECT c.id, c.Empresa, c.Contacto, c.Telefono, MAX(v.Fecha) as ultima_compra, SUM(v.Total) as total_gastado
            FROM clientes c JOIN ventas v ON c.id = v.Cliente_id
            GROUP BY c.id
            HAVING ultima_compra < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY total_gastado DESC LIMIT 5
        `);

        // Preparar datos para que la IA redacte
        const datosParaIA = await Promise.all(clientes.map(async (c) => {
            const dias = Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));
            
            // Productos favoritos
            const [prods] = await db.query(`
                SELECT p.Descripcion FROM venta_items vi JOIN ventas v ON vi.Venta_id = v.id JOIN productos p ON vi.Producto_id = p.id
                WHERE v.Cliente_id = ? GROUP BY p.id ORDER BY SUM(vi.Cantidad) DESC LIMIT 2
            `, [c.id]);
            
            // Historial de chat
            const [chats] = await db.query(`SELECT Mensaje FROM historial_conversaciones WHERE Cliente_id = ? AND Emisor='cliente' ORDER BY Fecha DESC LIMIT 1`, [c.id]);
            const ultimoChat = chats.length > 0 ? chats[0].Mensaje : "Sin mensajes previos";

            return {
                empresa: c.Empresa,
                contacto: c.Contacto || "Encargado",
                dias_inactivo: dias,
                productos: prods.map(p => p.Descripcion).join(', ') || "insumos de etiquetas",
                ultimo_chat: ultimoChat
            };
        }));

        // PROMPT REFORZADO PARA JSON ESTRICTO
        let mensajesGenerados = [];
        if (datosParaIA.length > 0) {
            const promptBatch = `
                Actúa como experto en ventas B2B de Labeltech.
                Genera ${datosParaIA.length} mensajes de WhatsApp distintos para recuperar clientes.
                
                CLIENTES:
                ${JSON.stringify(datosParaIA)}

                REGLAS OBLIGATORIAS:
                1. Devuelve ÚNICAMENTE un Array JSON de strings. Ejemplo: ["Hola Juan...", "Buenas tardes..."].
                2. NO agregues texto antes ni después del JSON (ni "aquí tienes", ni comillas invertidas).
                3. Usa el campo "ultimo_chat" para personalizar si hay algo relevante.
                4. Menciona sus "productos" favoritos para generar deseo.
                5. Sé breve y amigable.
            `;

            try {
                const result = await model.generateContent(promptBatch);
                const textoIA = await result.response.text();
                // Usamos la nueva función blindada
                mensajesGenerados = extraerJSON(textoIA);
            } catch (error) {
                console.error("Fallo IA Generando mensajes:", error);
            }
        }

        // Unimos los mensajes generados con los clientes
        const tareasRecupero = clientes.map((c, index) => {
            const dias = Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));
            // Si la IA generó mensaje, úsalo. Si no, usa el fallback pero con productos.
            const mensajeFinal = mensajesGenerados[index] 
                ? mensajesGenerados[index] 
                : `Hola ${c.Empresa}, te escribo de Labeltech. Hace ${dias} días no hacemos pedido. ¿Necesitas reponer stock?`;

            return {
                id: `recu_${c.id}`,
                tipo: 'recupero',
                titulo: `Recuperar a ${c.Empresa}`,
                subtitulo: `Inactivo ${dias} días.`,
                telefono: limpiarTelefono(c.Telefono),
                mensaje: mensajeFinal
            };
        });

        // C. DEUDAS
        const [deudas] = await db.query(`
            SELECT c.id, c.Empresa, c.Telefono, SUM(v.Total) as deuda FROM ventas v JOIN clientes c ON v.Cliente_id = c.id
            WHERE v.Pago IN ('Pendiente', 'Parcial', 'Debe') GROUP BY c.id ORDER BY deuda DESC LIMIT 5
        `);

        const tareasDeuda = deudas.map(c => ({
            id: `cobro_${c.id}`,
            tipo: 'cobranza',
            titulo: `Cobrar a ${c.Empresa}`,
            subtitulo: `Deuda: $${c.deuda}`,
            telefono: limpiarTelefono(c.Telefono),
            mensaje: `Hola ${c.Empresa}, te escribo de Labeltech por el saldo pendiente de $${c.deuda}. ¿Podemos coordinar? Gracias.`
        }));

        return [...tareasMensajes, ...tareasDeuda, ...tareasRecupero];

    } catch (error) {
        console.error("Error tasks:", error);
        return [];
    }
}

module.exports = { chatWithData, getOpenTasks };