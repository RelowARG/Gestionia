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
    const db = pool;

    try {
        let finalPhone = phone;
        let finalMessage = message;

        // PARCHE CAZADOR DE LEADS (Resolución Autónoma):
        // Si el frontend no mandó el teléfono (porque el cliente no tiene ID o es un Lead nuevo)
        // el backend lo extrae directamente del JSON de la tarea guardada.
        if (original_db_id && (!finalPhone || !finalMessage)) {
            const [rows] = await db.query(`SELECT datos_extra FROM IA_Insights WHERE id = ?`, [original_db_id]);
            if (rows.length > 0 && rows[0].datos_extra) {
                try {
                    const data = JSON.parse(rows[0].datos_extra);
                    if (!finalPhone) finalPhone = data.telefono;
                    if (!finalMessage) finalMessage = data.mensaje_whatsapp;
                } catch (e) {
                    console.error("Error parseando datos_extra en action:", e);
                }
            }
        }

        // Ejecutar el envío de WhatsApp
        if (action === 'auto_send') {
            if (!finalPhone || !finalMessage) {
                return res.status(400).json({error: "Faltan datos para envío. No se pudo recuperar teléfono o mensaje."});
            }
            await enviarMensaje(finalPhone, finalMessage);
        }

        // ESTRATEGIA HÍBRIDA:
        // 1. Si tiene 'original_db_id', es una tarea persistente (Recupero, Leads) -> Actualizamos estado
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