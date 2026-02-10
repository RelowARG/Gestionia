const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Usamos el modelo flash por ser rápido y económico, o pro si prefieres más razonamiento
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

module.exports = { model };