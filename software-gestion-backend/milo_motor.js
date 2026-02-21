// E:\Gestionia\software-gestion-backend\milo_motor.js
const axios = require('axios');

// 🧠 TUS DOS CEREBROS CONECTADOS (Ajustado para Docker)
const SERVIDORES_MILO = [
    'http://host.docker.internal:11434/api/generate', // Servidor 1: PC Principal (RTX 3080)
    'http://192.168.1.34:11434/api/generate'          // Servidor 2: PC Secundaria (RTX 3070)
];

// Variable para recordar a qué PC le toca trabajar
let turnoActual = 0;

async function preguntarA_MiloLocal(prompt) {
    // 1. Elegimos la PC que le toca y rotamos el turno para la próxima vez
    const url = SERVIDORES_MILO[turnoActual];
    turnoActual = (turnoActual + 1) % SERVIDORES_MILO.length;

    try {
        // Hacemos la consulta al servidor elegido
        const response = await axios.post(url, {
            model: 'llama3:8b',
            prompt: prompt,
            stream: false
        }, { timeout: 60000 }); // Le damos hasta 60 segundos por si el historial es inmenso
        
        return response.data.response.trim();

    } catch (error) {
        console.error(`❌ El servidor ${url} no respondió. Intentando con el respaldo...`);
        
        // 2. Si falló (ej: la segunda PC se apagó), intentamos automáticamente con la otra
        const fallbackUrl = SERVIDORES_MILO[turnoActual];
        
        try {
            const fallbackResponse = await axios.post(fallbackUrl, { 
                model: 'llama3:8b', 
                prompt: prompt, 
                stream: false 
            }, { timeout: 60000 });
            
            return fallbackResponse.data.response.trim();
        } catch (errorFatal) {
            console.error("💀 ERROR CRÍTICO: Ninguna de las dos placas de video está respondiendo.");
            return "ERROR_CONEXION";
        }
    }
}

module.exports = { preguntarA_MiloLocal };