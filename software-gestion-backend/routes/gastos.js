// routes/gastos.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Gastos

// Obtener todos los gastos
router.get('/', async (req, res) => {
    try {
      const [rows, fields] = await req.db.execute('SELECT id, Fecha, Motivo, Tipo, Forma_Pago, Monto_Pesos, Cotizacion_Dolar, Monto_Dolares FROM Gastos ORDER BY Fecha DESC, id DESC');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener gastos.' });
    }
  });

  // Agregar un nuevo gasto
  router.post('/', async (req, res) => {
    const { Fecha, Motivo, Tipo, Forma_Pago, Monto_Pesos, Cotizacion_Dolar } = req.body;

    if (!Fecha || !Motivo || !Tipo || !Forma_Pago || Monto_Pesos === undefined || Monto_Pesos === null || isNaN(parseFloat(Monto_Pesos)) || parseFloat(Monto_Pesos) < 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Motivo, Tipo, Forma de Pago, Monto Pesos (>=0) y Cotización Dólar (>0) son obligatorios.' });
    }

    const montoPesosFloat = parseFloat(Monto_Pesos);
    const cotizacionDolarFloat = parseFloat(Cotizacion_Dolar);
    const Monto_Dolares_Calculado = (montoPesosFloat !== null && !isNaN(montoPesosFloat) && cotizacionDolarFloat > 0)
        ? montoPesosFloat / cotizacionDolarFloat
        : null;

    const sql = `
      INSERT INTO Gastos (Fecha, Motivo, Tipo, Forma_Pago, Monto_Pesos, Cotizacion_Dolar, Monto_Dolares)
      VALUES (?, ?, ?, ?, ?, ?, ?);`;

    const values = [
      Fecha,
      Motivo,
      Tipo,
      Forma_Pago,
      montoPesosFloat,
      cotizacionDolarFloat,
      Monto_Dolares_Calculado !== null ? parseFloat(Monto_Dolares_Calculado.toFixed(2)) : null
    ];

    try {
      const [result] = await req.db.execute(sql, values);
      res.status(201).json({ success: { id: result.insertId } });
    } catch (error) {
      console.error('Error al agregar gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor al agregar gasto.' });
    }
  });

  // Obtener un gasto específico por su ID
  router.get('/:id', async (req, res) => {
    const gastoId = req.params.id;

    const sql = `SELECT id, Fecha, Motivo, Tipo, Forma_Pago, Monto_Pesos, Cotizacion_Dolar, Monto_Dolares FROM Gastos WHERE id = ?`;

    try {
      const [rows, fields] = await req.db.execute(sql, [gastoId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: `Gasto con ID ${gastoId} no encontrado.` });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(`Error al obtener gasto por ID ${gastoId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al obtener gasto.' });
    }
  });

  // Actualizar un gasto existente por su ID
  router.put('/:id', async (req, res) => {
    const gastoId = req.params.id;
    const { Fecha, Motivo, Tipo, Forma_Pago, Monto_Pesos, Cotizacion_Dolar } = req.body;

    if (!Fecha || !Motivo || !Tipo || !Forma_Pago || Monto_Pesos === undefined || Monto_Pesos === null || isNaN(parseFloat(Monto_Pesos)) || parseFloat(Monto_Pesos) < 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
        return res.status(400).json({ error: 'Fecha, Motivo, Tipo, Forma de Pago, Monto Pesos (>=0) y Cotización Dólar (>0) son obligatorios.' });
    }

     const montoPesosFloat = parseFloat(Monto_Pesos);
     const cotizacionDolarFloat = parseFloat(Cotizacion_Dolar);
     const Monto_Dolares_Calculado = (montoPesosFloat !== null && !isNaN(montoPesosFloat) && cotizacionDolarFloat > 0)
         ? montoPesosFloat / cotizacionDolarFloat
         : null;


    const sql = `
      UPDATE Gastos
      SET
        Fecha = ?,
        Motivo = ?,
        Tipo = ?,
        Forma_Pago = ?,
        Monto_Pesos = ?,
        Cotizacion_Dolar = ?,
        Monto_Dolares = ?
      WHERE id = ?;`;

    const values = [
      Fecha,
      Motivo,
      Tipo,
      Forma_Pago,
      montoPesosFloat,
      cotizacionDolarFloat,
      Monto_Dolares_Calculado !== null ? parseFloat(Monto_Dolares_Calculado.toFixed(2)) : null,
      gastoId
    ];

    try {
      const [result] = await req.db.execute(sql, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró gasto con ID ${gastoId} para actualizar.` });
      }

      res.json({ success: { id: gastoId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al actualizar gasto con ID ${gastoId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al actualizar gasto.' });
    }
  });

  // Eliminar un gasto por ID
  router.delete('/:id', async (req, res) => {
    const gastoId = req.params.id;

    const sql = `DELETE FROM Gastos WHERE id = ?`;

    try {
      const [result] = await req.db.execute(sql, [gastoId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró gasto con ID ${gastoId} para eliminar.` });
      }

      res.json({ success: { id: gastoId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al eliminar gasto con ID ${gastoId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al eliminar gasto.' });
    }
  });

module.exports = router;