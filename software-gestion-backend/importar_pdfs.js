// software-gestion-backend/importar_pdfs.js
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;

const carpetaPDFs = path.join(__dirname, 'presupuestos_viejos');
const apiKeys = [process.env.MINER_API_KEY, process.env.MINER_API_KEY_2].filter(Boolean);
let currentKeyIndex = 0;

if (apiKeys.length === 0) {
    console.error("❌ No configuraste ninguna MINER_API_KEY en el .env");
    process.exit();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function llamarIAConRotacion(prompt, pdfPart) {
    let intentos = 0;
    while (intentos < apiKeys.length) {
        try {
            const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
            const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Usamos gemini 2.5 flash para minería masiva
            const result = await aiModel.generateContent([prompt, pdfPart]);
            return result.response.text().trim();
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('quota')) {
                console.log(`   ⚠️ Llave ${currentKeyIndex + 1} agotada. Rotando...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                intentos++;
            } else { throw error; }
        }
    }
    throw new Error('Todas las llaves están agotadas.');
}

async function procesarDirectorio() {
    console.log("🚀 Iniciando Minería Lenta (Modo Anti-Bloqueo)...");
    const archivos = fs.readdirSync(carpetaPDFs).filter(file => file.endsWith('.pdf'));
    
    if (archivos.length === 0) {
        console.log("⚠️ No hay PDFs.");
        process.exit();
    }

    console.log(`🔍 Se encontraron ${archivos.length} PDFs. Procesando 1 cada 15 minutos.`);

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        try {
            console.log(`\n👁️  [${i+1}/${archivos.length}] Analizando: ${archivo}`);
            
            const filePath = path.join(carpetaPDFs, archivo);
            const fileBase64 = fs.readFileSync(filePath).toString("base64");
            const pdfPart = { inlineData: { data: fileBase64, mimeType: "application/pdf" } };

            const prompt = `Extraé: empresa, contacto, telefono, email, producto (máx 5 palabras). Formato JSON estricto.`;

            let respuesta = await llamarIAConRotacion(prompt, pdfPart);
            respuesta = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
            const datosExtraidos = JSON.parse(respuesta);

            // ... (Toda la lógica de guardado en la DB se mantiene igual)
            // [AQUÍ VA TU LÓGICA DE VALIDAR TELÉFONO E INSERTAR EN LEADS_ANTIGUOS]
            
            console.log(`   ✅ Guardado con éxito.`);

        } catch (error) {
            console.error(`   ❌ Error en ${archivo}:`, error.message);
        }

        // EL FRENO DE SEGURIDAD: 15 minutos entre cada PDF
        if (i !== archivos.length - 1) {
            console.log(`⏳ Esperando 15 MINUTOS para el próximo archivo (Seguridad Anti-429)...`);
            await delay(900000); // 15 minutos exactos
        }
    }

    console.log(`\n✅ Minería finalizada.`);
    process.exit();
}

procesarDirectorio();