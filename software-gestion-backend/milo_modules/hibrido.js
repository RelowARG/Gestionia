// E:\Gestionia\software-gestion-backend\milo_modules\hibrido.js
const { preguntarA_MiloLocal } = require('../milo_motor');
const { model } = require('../ai_modules/core');

/**
 * Función Híbrida: Milo procesa la base de datos (Local) y Gemini da el toque final (Nube).
 */
async function consultaHibrida(promptDatos, tareaEstrategica) {
    console.log("🛠️ Fase 1: Milo (RTX Local) procesando historial...");
    
    // Milo hace el resumen técnico de los chats y mails
    const resumenMilo = await preguntarA_MiloLocal(promptDatos);
    
    // Si la RTX está apagada o falla, pasamos directo a Gemini como respaldo
    if (!resumenMilo || resumenMilo.includes("ERROR_CONEXION")) {
        console.warn("⚠️ Milo Local fuera de línea. Pasando directo a Gemini...");
        const promptSoloGemini = `Tarea: ${tareaEstrategica}. Contexto: Sin datos históricos recientes.`;
        const fallback = await model.generateContent(promptSoloGemini);
        return fallback.response.text().trim();
    }

    console.log("✨ Fase 2: Gemini elaborando estrategia final...");
    
    // Le pasamos el resumen de Milo a Gemini
    const promptGemini = `
        Sos el estratega senior de Labeltech. 
        Milo (nuestra IA de datos local) ha analizado el historial del cliente y encontró esto:
        
        RESUMEN DEL HISTORIAL: "${resumenMilo}"
        
        TU TAREA:
        ${tareaEstrategica}
        
        REGLAS: Solo el texto solicitado, sin introducciones. Si el historial no dice nada relevante, seguí la estrategia base.
    `;
    
    try {
        const result = await model.generateContent(promptGemini);
        return result.response.text().trim();
    } catch (error) {
        console.error("❌ Error en Gemini durante consulta híbrida:", error);
        throw error;
    }
}

module.exports = { consultaHibrida };