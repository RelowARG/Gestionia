// software-gestion-backend/routes/ia.js
const express = require('express');
const router = express.Router();
const { chatWithData, getOpenTasks } = require('../ai_modules/salesAgent');
const { enviarMensaje } = require('../services/whatsappService');
const dbMiddleware = require('../db');
const pool = dbMiddleware.pool;

// Ruta del Chat
router.post('/chat', async (req, res) => {
    const { question } = req.body;
    const respuesta = await chatWithData(question);
    res.json({ respuesta });
});

// Ruta de Tareas
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await getOpenTasks();
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo tareas' });
    }
});

// NUEVA RUTA: Ejecutar acción (Unificada para Persistentes y Dinámicas)
router.post('/action', async (req, res) => {
    // dbId es opcional, solo viene si la tarea salió de IA_Insights
    const { taskId, taskType, action, phone, message, original_db_id } = req.body;
    
    // action: 'auto_send', 'completed', 'dismiss'

    try {
        if (action === 'auto_send') {
            if (!phone || !message) return res.status(400).json({error: "Faltan datos para envío"});
            await enviarMensaje(phone, message);
        }

        const db = pool;

        // ESTRATEGIA HÍBRIDA:
        // 1. Si tiene 'original_db_id', es una tarea persistente (Recupero) -> Actualizamos IA_Insights
        if (original_db_id) {
            let nuevoEstado = 'completado';
            if (action === 'dismiss') nuevoEstado = 'descartado';
            if (action === 'auto_send') nuevoEstado = 'auto_enviado';

            await db.query(`UPDATE IA_Insights SET estado = ? WHERE id = ?`, [nuevoEstado, original_db_id]);
        } 
        // 2. Si NO tiene ID de DB, es una tarea dinámica (Chat/Cobro) -> Insertamos en IA_Acciones para ocultarla
        else {
            await db.query(`
                INSERT INTO IA_Acciones (tarea_id, tipo_tarea, accion) 
                VALUES (?, ?, ?)
            `, [taskId, taskType, action]);
        }

        res.json({ success: true, message: "Acción registrada correctamente" });

    } catch (error) {
        console.error("Error procesando acción IA:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;