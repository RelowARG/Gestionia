const { model } = require('./core');
const { pool } = require('../db');

// --- UTILIDADES ---
function limpiarTelefono(telefono) {
    if (!telefono) return null;
    let num = telefono.toString().replace(/\D/g, '');
    if (num.length === 10) return '549' + num;
    return num;
}

function limpiarJSON(texto) {
    return texto.replace(/```json/g, '').replace(/```/g, '').trim();
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
            - Ventas Hoy: ${ventasHoy[0].cantidad} ($${ventasHoy[0].dinero})
            - Stock Crítico: \n${fmtStock}
            - Deudas: \n${fmtDeudas}
        `;
    } catch (e) { return "Error DB"; }
}

async function chatWithData(userQuestion) {
    try {
        const context = await getBusinessContext();
        const prompt = `Eres el Gerente Comercial de Labeltech. DATOS: ${context}. USUARIO: "${userQuestion}". Responde brevemente con formato rico (**negritas**).`;
        const result = await model.generateContent(prompt);
        return (await result.response).text();
    } catch (e) { return "IA procesando..."; }
}

// --- 2. GENERADOR DE TAREAS PROACTIVO ---
async function getOpenTasks() {
    try {
        const db = pool.promise();

        // A. CLIENTES INACTIVOS
        const [clientes] = await db.query(`
            SELECT c.id, c.Empresa, c.Contacto, c.Telefono, MAX(v.Fecha) as ultima_compra, SUM(v.Total) as total_gastado
            FROM clientes c JOIN ventas v ON c.id = v.Cliente_id
            GROUP BY c.id
            HAVING ultima_compra < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY total_gastado DESC LIMIT 5
        `);

        // B. PREPARAMOS DATOS
        const datosParaIA = await Promise.all(clientes.map(async (c) => {
            const [prods] = await db.query(`
                SELECT p.Descripcion FROM venta_items vi JOIN ventas v ON vi.Venta_id = v.id JOIN productos p ON vi.Producto_id = p.id
                WHERE v.Cliente_id = ? GROUP BY p.id ORDER BY SUM(vi.Cantidad) DESC LIMIT 2
            `, [c.id]);
            
            return {
                empresa: c.Empresa,
                contacto: c.Contacto || "Encargado",
                dias_inactivo: Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24)),
                productos_top: prods.map(p => p.Descripcion).join(', ') || "insumos"
            };
        }));

        // C. PROMPT CORREGIDO CON EL NOMBRE "LABELTECH"
        const promptBatch = `
            Actúa como un experto en Ventas B2B de la empresa "Labeltech".
            
            TAREA:
            Genera 5 mensajes de WhatsApp distintos para recuperar a estos clientes inactivos.
            
            REGLAS DE ORO:
            1. Preséntate siempre como "Julian de Labeltech" de forma natural.
            2. Menciona los productos que solían comprar (${JSON.stringify(datosParaIA[0].productos_top)}...) para recordarles la calidad.
            3. Tono cercano, profesional y breve.
            4. Devuelve SOLO un Array JSON de Strings.
            
            CLIENTES A CONTACTAR:
            ${JSON.stringify(datosParaIA)}
        `;

        let mensajesGenerados = [];
        try {
            const result = await model.generateContent(promptBatch);
            const textoLimpio = limpiarJSON(await result.response.text());
            mensajesGenerados = JSON.parse(textoLimpio);
        } catch (error) {
            // Fallback con nombre fijo
            mensajesGenerados = datosParaIA.map(d => `Hola ${d.contacto}, te escribo de Labeltech. Hace mucho no hablamos, ¿necesitas ${d.productos_top}?`);
        }

        // D. UNIMOS TODO
        const tareasClientes = clientes.map((c, index) => {
            const dias = Math.floor((new Date() - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));
            return {
                id: `recu_${c.id}`,
                tipo: 'recupero',
                titulo: `Recuperar a ${c.Empresa}`,
                subtitulo: `Inactivo hace ${dias} días.`,
                telefono: limpiarTelefono(c.Telefono),
                mensaje: mensajesGenerados[index] || `Hola ${c.Empresa}, somos Labeltech. ¿Necesitan reposición?` 
            };
        });

        // E. DEUDAS (Con nombre Labeltech fijo)
        const [deudas] = await db.query(`
            SELECT c.id, c.Empresa, c.Telefono, SUM(v.Total) as deuda FROM ventas v JOIN clientes c ON v.Cliente_id = c.id
            WHERE v.Pago IN ('Pendiente', 'Parcial', 'Debe') GROUP BY c.id ORDER BY deuda DESC LIMIT 5
        `);

        const tareasDeuda = deudas.map(c => ({
            id: `cobro_${c.id}`,
            tipo: 'cobranza',
            titulo: `Cobrar a ${c.Empresa}`,
            subtitulo: `Saldo pendiente: $${c.deuda}`,
            telefono: limpiarTelefono(c.Telefono),
            // AQUÍ AGREGAMOS "LABELTECH" FIJO
            mensaje: `Hola ${c.Empresa}, te escribo de Labeltech para ver el saldo pendiente de $${c.deuda}. ¿Me confirmas fecha estimada? Gracias.`
        }));

        return [...tareasDeuda, ...tareasClientes];

    } catch (error) {
        console.error("Error tasks:", error);
        return [];
    }
}

module.exports = { chatWithData, getOpenTasks };