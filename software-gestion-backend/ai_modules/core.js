// software-gestion-backend/ai_modules/core.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 1. Cargar y validar claves
const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
if (!keysString) {
    console.error("❌ ERROR CRÍTICO: No hay GEMINI_API_KEYS en .env");
    process.exit(1);
}

// Convertimos el string "key1,key2,key3" en un array
const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
console.log(`🔑 Core IA: ${apiKeys.length} API Keys cargadas para rotación.`);

// MODELO
const MODEL_NAME = "gemini-2.5-flash"; 

// VARIABLE GLOBAL DE MEMORIA
// Esta variable vive fuera de la función, así recuerda el índice entre llamadas.
let currentKeyIndex = 0; 

// 3. Función Inteligente de Generación con Rotación Persistente
async function generateContentWithRotation(prompt) {
    let lastError = null;
    const totalKeys = apiKeys.length;

    // Intentamos tantas veces como llaves tengamos
    for (let attempt = 0; attempt < totalKeys; attempt++) {
        
        // Calculamos el índice circularmente. 
        // Si currentKeyIndex es 0, prueba 0. Si falla, el loop incrementa 'attempt',
        // y probamos (0 + 1) % 4 = 1.
        const keyToTry = (currentKeyIndex + attempt) % totalKeys;
        const currentApiKey = apiKeys[keyToTry];

        try {
            const genAI = new GoogleGenerativeAI(currentApiKey);
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });

            const result = await model.generateContent(prompt);
            
            // ¡ÉXITO!
            // Si tuvimos que rotar para encontrar esta llave buena, 
            // actualizamos el índice global para que la próxima vez empecemos AQUÍ.
            if (keyToTry !== currentKeyIndex) {
                console.log(`✅ Rotación exitosa: Ahora usaremos la Key #${keyToTry + 1} como principal.`);
                currentKeyIndex = keyToTry;
            }
            
            return result; 

        } catch (error) {
            lastError = error;
            const isQuotaError = error.message.includes('429') || error.message.includes('Quota');

            if (isQuotaError) {
                // Solo logueamos advertencia y dejamos que el bucle continúe al siguiente intento
                console.warn(`⚠️ Key #${keyToTry + 1} agotada. Probando siguiente...`);
            } else {
                console.error(`❌ Error fatal en Key #${keyToTry + 1}:`, error.message);
                throw error; // Si no es cuota, es otro error, abortamos.
            }
        }
    }

    // Si salimos del bucle es que probamos las 4 llaves y ninguna anduvo
    console.error("💀 TODAS las API Keys están agotadas.");
    throw lastError; 
}

const smartModel = {
    generateContent: generateContentWithRotation
};

module.exports = { model: smartModel };