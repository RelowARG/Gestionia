// software-gestion-backend/ai_modules/core.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
if (!keysString) {
    console.error("❌ ERROR CRÍTICO: No hay GEMINI_API_KEYS en .env");
    process.exit(1);
}

const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
console.log(`🔑 Core IA: ${apiKeys.length} API Keys cargadas para rotación.`);

const MODEL_NAME = "gemini-2.5-flash"; 
let currentKeyIndex = 0; 

// === NUEVO: FUNCIÓN DE HIBERNACIÓN ===
function dormirHastaMedianoche() {
    return new Promise(resolve => {
        const ahora = new Date();
        const medianoche = new Date(ahora);
        
        // Configuramos el reloj para las 00:05 AM del DÍA SIGUIENTE
        // (Le damos 5 minutos extra a Google para que resetee las cuotas)
        medianoche.setHours(24, 5, 0, 0); 
        
        const msFaltantes = medianoche.getTime() - ahora.getTime();
        const horas = Math.floor(msFaltantes / (1000 * 60 * 60));
        const minutos = Math.floor((msFaltantes % (1000 * 60 * 60)) / (1000 * 60));

        console.log(`\n========================================================`);
        console.log(`🌙 TODAS LAS LLAVES AGOTADAS (Límite Diario).`);
        console.log(`💤 Entrando en hibernación profunda por ${horas}h y ${minutos}m...`);
        console.log(`⏰ Despertando a las: ${medianoche.toLocaleString()}`);
        console.log(`========================================================\n`);
        
        // Congela la ejecución por la cantidad de horas necesarias
        setTimeout(resolve, msFaltantes);
    });
}

async function generateContentWithRotation(prompt) {
    let lastError = null;
    const totalKeys = apiKeys.length;

    // Bucle infinito: Intentará rotar llaves, y si todas fallan, dormirá y volverá a empezar.
    while (true) {
        for (let attempt = 0; attempt < totalKeys; attempt++) {
            
            const keyToTry = (currentKeyIndex + attempt) % totalKeys;
            const currentApiKey = apiKeys[keyToTry];

            try {
                const genAI = new GoogleGenerativeAI(currentApiKey);
                const model = genAI.getGenerativeModel({ model: MODEL_NAME });

                const result = await model.generateContent(prompt);
                
                if (keyToTry !== currentKeyIndex) {
                    console.log(`✅ Rotación exitosa: Ahora usaremos la Key #${keyToTry + 1} como principal.`);
                    currentKeyIndex = keyToTry;
                }
                
                return result; 

            } catch (error) {
                lastError = error;
                const isQuotaError = error.message.includes('429') || error.message.includes('Quota');

                if (isQuotaError) {
                    console.warn(`⚠️ Key #${keyToTry + 1} agotada. Probando siguiente...`);
                } else {
                    console.error(`❌ Error fatal no relacionado a cuota en Key #${keyToTry + 1}:`, error.message);
                    throw error; // Si el error es de sintaxis o conexión, explota (no hiberna).
                }
            }
        }

        // Si el código llega hasta acá, significa que el FOR loop terminó sin retornar 'result'.
        // Eso implica que TODAS las llaves arrojaron error 429 (Cuota Agotada).
        
        // En lugar de hacer throw lastError; como antes, llamamos al sedante:
        await dormirHastaMedianoche();
        
        // Al despertar al día siguiente, reseteamos el índice a la llave 1 y el bucle WHILE(true) vuelve a empezar automáticamente
        currentKeyIndex = 0;
        console.log("☀️ Buenos días. Cuotas recargadas. Reanudando operaciones...");
    }
}

const smartModel = {
    generateContent: generateContentWithRotation
};

module.exports = { model: smartModel };