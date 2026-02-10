const express = require('express');
const router = express.Router();
const db = require('../db');
const { chatWithData } = require('../ai_modules/salesAgent');
const { runDailyAnalysis } = require('../ai_modules/scheduler');

// GET: Obtener Insights pendientes (parseando el JSON)
router.get('/insights', async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM IA_Insights WHERE estado = 'no_leido' ORDER BY fecha DESC"
        );

        const processedRows = rows.map(row => {
            let extra = {};
            try {
                extra = JSON.parse(row.datos_extra || '{}');
            } catch (e) {
                console.error("Error parseando JSON ID:", row.id);
            }
            return { ...row, datos_extra: extra };
        });

        res.json(processedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Chat con la IA
router.post('/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).send("Falta la pregunta");

    const respuesta = await chatWithData(question);
    res.json({ respuesta });
});

// PUT: Actualizar estado (ej. al enviar el whatsapp o descartar)
router.put('/insights/:id', async (req, res) => {
    const { estado } = req.body; // 'leido', 'descartado', 'gestionado'
    try {
        await db.promise().query(
            'UPDATE IA_Insights SET estado = ? WHERE id = ?',
            [estado, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Forzar análisis manual (útil para pruebas)
router.post('/force-analysis', async (req, res) => {
    await runDailyAnalysis();
    res.json({ message: "Análisis ejecutado" });
});

module.exports = router;