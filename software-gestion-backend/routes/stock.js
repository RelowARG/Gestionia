// routes/stock.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Stock

// Obtener todas las entradas de stock, uniendo con Productos
router.get('/', async (req, res) => {
    try {
      const [rows, fields] = await req.db.execute(`
        SELECT
            s.id, s.Cantidad,
            p.id AS Producto_id, p.codigo, p.Descripcion, p.eti_x_rollo, p.banda, p.material, p.Buje
        FROM Stock s
        JOIN Productos p ON s.Producto_id = p.id
        ORDER BY p.codigo ASC`);
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener stock:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener stock.' });
    }
  });

  // Agregar stock para un producto o actualizar cantidad si ya existe
  router.post('/', async (req, res) => {
    const { Producto_id, Cantidad } = req.body;

    if (Producto_id === undefined || Producto_id === null || Producto_id === '' || Cantidad === undefined || Cantidad === null || Cantidad === '' || isNaN(parseFloat(Cantidad)) || parseFloat(Cantidad) <= 0) {
       return res.status(400).json({ error: 'Debe seleccionar un Producto e ingresar una Cantidad válida (> 0).' });
    }

    const productoIdInt = parseInt(Producto_id, 10);
    const cantidadFloat = parseFloat(Cantidad);

    const sql = `
      INSERT INTO Stock (Producto_id, Cantidad)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
      Cantidad = Cantidad + VALUES(Cantidad);`;

    try {
      const [result] = await req.db.execute(sql, [productoIdInt, cantidadFloat]);

      if (result.affectedRows === 0) {
           console.warn(`Intento de agregar/actualizar stock para Producto_id ${productoIdInt} sin filas afectadas.`);
           return res.status(400).json({ error: `No se pudo agregar o actualizar stock para el producto con ID ${productoIdInt}. Verifique si el producto existe.` });
      }

      res.status(201).json({ success: { id: result.insertId || productoIdInt, changes: result.affectedRows } });

    } catch (error) {
      console.error(`Error al agregar/actualizar stock para Producto_id ${productoIdInt}:`, error);
      let userMessage = 'Error interno del servidor al agregar/actualizar stock.';
       if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            userMessage = 'Error: El Producto seleccionado no existe.';
       }
      res.status(500).json({ error: userMessage });
    }
  });

  // Obtener una entrada de stock específica por su ID
  router.get('/:id', async (req, res) => {
    const stockId = req.params.id;

    const sql = `
      SELECT
          s.id, s.Cantidad, s.Producto_id,
          p.codigo, p.Descripcion, p.eti_x_rollo, p.banda, p.material, p.Buje
      FROM Stock s
      JOIN Productos p ON s.Producto_id = p.id
      WHERE s.id = ?`;

    try {
      const [rows, fields] = await req.db.execute(sql, [stockId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: `Entrada de stock con ID ${stockId} no encontrada.` });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(`Error al obtener entrada de stock por ID ${stockId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al obtener entrada de stock.' });
    }
  });

  // Actualizar la cantidad de una entrada de stock por su ID
  router.put('/:id', async (req, res) => {
    const stockId = req.params.id;
    const { Cantidad } = req.body;

    if (Cantidad === undefined || Cantidad === null || Cantidad === '' || isNaN(parseFloat(Cantidad)) || parseFloat(Cantidad) < 0) {
       return res.status(400).json({ error: 'Debe ingresar una Cantidad válida (>= 0) para actualizar.' });
    }

    const cantidadFloat = parseFloat(Cantidad);

    const sql = `
      UPDATE Stock
      SET Cantidad = ?
      WHERE id = ?;`;

    try {
      const [result] = await req.db.execute(sql, [cantidadFloat, stockId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró entrada de stock con ID ${stockId} para actualizar.` });
      }

      res.json({ success: { id: stockId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al actualizar entrada de stock con ID ${stockId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al actualizar stock.' });
    }
  });

  // Eliminar una entrada de stock por su ID
  router.delete('/:id', async (req, res) => {
    const stockId = req.params.id;

    const sql = `DELETE FROM Stock WHERE id = ?`;

    try {
      const [result] = await req.db.execute(sql, [stockId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró entrada de stock con ID ${stockId} para eliminar.` });
      }

      res.json({ success: { id: stockId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al eliminar entrada de stock con ID ${stockId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al eliminar entrada de stock.' });
    }
  });

module.exports = router;