const { model } = require('./core');
const db = require('../db');

// Función auxiliar para obtener el "pulso" del negocio
async function getBusinessContext() {
    try {
        // 1. Obtener ventas del día
        const [ventasHoy] = await db.promise().query(`
            SELECT 
                COUNT(*) as cantidad, 
                COALESCE(SUM(total), 0) as dinero 
            FROM Ventas 
            WHERE DATE(fecha) = CURDATE()
        `);

        // 2. Obtener productos con stock crítico (menos de 5 unidades)
        const [stockBajo] = await db.promise().query(`
            SELECT nombre, stock 
            FROM Productos 
            WHERE stock <= 5 
            LIMIT 5
        `);

        // Formatear texto para la IA
        let stockText = stockBajo.length > 0 
            ? stockBajo.map(p => `- ${p.nombre} (${p.stock} u.)`).join('\n') 
            : "No hay alertas de stock.";

        return `
            DATOS EN TIEMPO REAL:
            - Ventas hoy: ${ventasHoy[0].cantidad} operaciones.
            - Ingresos hoy: $${ventasHoy[0].dinero}.
            - Alertas de Stock Bajo:
            ${stockText}
        `;
    } catch (error) {
        console.error("Error obteniendo contexto:", error);
        return "No pude acceder a la base de datos en este momento.";
    }
}

// Función principal del Chat
async function chatWithData(userQuestion) {
    try {
        const context = await getBusinessContext();
        
        const prompt = `
            Eres un experto consultor de negocios integrado en un ERP.
            
            ${context}

            PREGUNTA DEL USUARIO: "${userQuestion}"

            INSTRUCCIONES:
            1. Responde basándote estrictamente en los datos proporcionados.
            2. Sé breve, motivador y directo.
            3. Si el stock es bajo, sugiere reponer.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error en AI Chat:", error);
        return "Lo siento, hubo un error de conexión con la IA.";
    }
}

module.exports = { chatWithData };