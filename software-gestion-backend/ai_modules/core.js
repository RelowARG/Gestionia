// software-gestion-backend/ai_modules/core.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: Falta API KEY en .env");

const genAI = new GoogleGenerativeAI(apiKey);

// Usamos 1.5-flash que es más rápido y tiene mejor capa gratuita
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

module.exports = { model };