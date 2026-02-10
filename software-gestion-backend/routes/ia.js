const express = require('express');
const router = express.Router();
const { chatWithData, getOpenTasks } = require('../ai_modules/salesAgent');

// Ruta del Chat
router.post('/chat', async (req, res) => {
    const { question } = req.body;
    const respuesta = await chatWithData(question);
    res.json({ respuesta });
});

// Ruta de Insights (Resumen texto)
router.get('/insights', async (req, res) => {
    // Aquí podrías llamar a getBusinessContext si quieres el resumen en texto
    // Por ahora devolvemos un array vacío para que no rompa el widget viejo
    res.json([]); 
});

// NUEVA RUTA: Tareas Pendientes (JSON estructurado)
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await getOpenTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo tareas' });
    }
});

module.exports = router;