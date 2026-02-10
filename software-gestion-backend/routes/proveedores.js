// routes/proveedores.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Proveedores

// Obtener todos los proveedores
router.get('/', async (req, res) => {
    try {
      const [rows, fields] = await req.db.execute('SELECT id, Empresa, Cuit, Contacto, Telefono, Mail, Direccion FROM Proveedores ORDER BY Empresa ASC');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener proveedores.' });
    }
  });

  // Agregar un nuevo proveedor
  router.post('/', async (req, res) => {
    const { Empresa, Cuit, Contacto, Telefono, Mail, Direccion } = req.body;

    if (!Empresa || !Cuit) {
      return res.status(400).json({ error: 'Empresa y Cuit son obligatorios.' });
    }

    const sql = `INSERT INTO Proveedores (Empresa, Cuit, Contacto, Telefono, Mail, Direccion) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [Empresa, Cuit, Contacto, Telefono, Mail, Direccion];

    try {
      const [result] = await req.db.execute(sql, values);
      res.status(201).json({ success: { id: result.insertId } });
    } catch (error) {
      console.error('Error al agregar proveedor:', error);
      let userMessage = 'Error interno del servidor al agregar proveedor.';
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('Cuit')) {
          userMessage = 'Error: El Cuit ingresado ya existe.';
        }
      }
      res.status(500).json({ error: userMessage });
    }
  });

  // Obtener un proveedor específico por su ID
  router.get('/:id', async (req, res) => {
    const proveedorId = req.params.id;

    const sql = `SELECT id, Empresa, Cuit, Contacto, Telefono, Mail, Direccion FROM Proveedores WHERE id = ?`;

    try {
      const [rows, fields] = await req.db.execute(sql, [proveedorId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: `Proveedor con ID ${proveedorId} no encontrado.` });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(`Error al obtener proveedor por ID ${proveedorId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al obtener proveedor.' });
    }
  });

  // Actualizar un proveedor existente por su ID
  router.put('/:id', async (req, res) => {
    const proveedorId = req.params.id;
    const { Empresa, Cuit, Contacto, Telefono, Mail, Direccion } = req.body;

     if (!Empresa || !Cuit) {
       return res.status(400).json({ error: 'Empresa y Cuit son obligatorios.' });
     }

    const sql = `
      UPDATE Proveedores
      SET
        Empresa = ?,
        Cuit = ?,
        Contacto = ?,
        Telefono = ?,
        Mail = ?,
        Direccion = ?
      WHERE id = ?;`;

    const values = [
      Empresa,
      Cuit,
      Contacto || null,
      Telefono || null,
      Mail || null,
      Direccion || null,
      proveedorId
    ];

    try {
      const [result] = await req.db.execute(sql, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró proveedor con ID ${proveedorId} para actualizar.` });
      }

      res.json({ success: { id: proveedorId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al actualizar proveedor con ID ${proveedorId}:`, error);
      let userMessage = 'Error interno del servidor al actualizar proveedor.';
      if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Cuit')) {
        userMessage = 'Error: El Cuit ingresado ya existe.';
      }
      res.status(500).json({ error: userMessage });
    }
  });

  // Eliminar un proveedor por ID
  router.delete('/:id', async (req, res) => {
    const proveedorId = req.params.id;

    const sql = `DELETE FROM Proveedores WHERE id = ?`;

    try {
      const [result] = await req.db.execute(sql, [proveedorId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró proveedor con ID ${proveedorId} para eliminar.` });
      }

      res.json({ success: { id: proveedorId, changes: result.affectedRows } });
    } catch (error) {
      console.error(`Error al eliminar proveedor con ID ${proveedorId}:`, error);
      let userMessage = 'Error interno del servidor al eliminar proveedor.';
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        userMessage = 'No se puede eliminar el proveedor porque tiene registros de compras asociados.';
      }
      res.status(500).json({ error: userMessage });
    }
  });

module.exports = router;