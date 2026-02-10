// software-gestion-backend/routes/ia.js
const express = require('express');
const router = express.Router();
// Importa desde la carpeta ai_modules
const { chatWithData, getOpenTasks } = require('../ai_modules/salesAgent');

// Ruta del Chat
router.post('/chat', async (req, res) => {
    const { question } = req.body;
    const respuesta = await chatWithData(question);
    res.json({ respuesta });
});

// NUEVA RUTA: Tareas Pendientes (JSON estructurado)
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await getOpenTasks();
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo tareas' });
    }
});

// Ruta de insights legacy (para compatibilidad si algo la llama)
router.get('/insights', async (req, res) => {
    res.json([]); 
});

module.exports = router;