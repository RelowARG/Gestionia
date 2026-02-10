// software-gestion-backend/ai_modules/core.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
// Ajusta la ruta para encontrar el .env en la raíz del backend
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: Falta API KEY en .env");

const genAI = new GoogleGenerativeAI(apiKey);

// Usamos el modelo flash por velocidad
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

module.exports = { model };