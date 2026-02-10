// routes/clientes.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Clientes

// Obtener todos los clientes
router.get('/', async (req, res) => {
    try {
      // Usa la conexión de DB proporcionada por el middleware (req.db)
      const [rows, fields] = await req.db.execute('SELECT id, Empresa, Cuit, Contacto, Telefono, Mail, Direccion FROM Clientes');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener clientes.' });
    }
    // La conexión se cierra en el middleware de db.js
  });

  // Agregar un nuevo cliente
  router.post('/', async (req, res) => {
    const { Empresa, Cuit, Contacto, Telefono, Mail, Direccion } = req.body;

    // MODIFIED VALIDATION: Only Empresa is mandatory
    if (!Empresa) {
        return res.status(400).json({ error: 'La Empresa es obligatoria.' });
    }
    const sql = `INSERT INTO Clientes (Empresa, Cuit, Contacto, Telefono, Mail, Direccion) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [Empresa, Cuit, Contacto, Telefono, Mail, Direccion];

    try {
      const [result] = await req.db.execute(sql, values);
      res.status(201).json({ success: { id: result.insertId } });
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      let userMessage = 'Error interno del servidor al agregar cliente.';
      if (error.code === 'ER_DUP_ENTRY') {
          // Keep the check for duplicate Cuit to ensure uniqueness
          if (error.message.includes('Cuit')) {
               userMessage = 'Error: El Cuit ingresado ya existe.';
          } else if (error.message.includes('Empresa')) {
               // Keep the check for duplicate Empresa if needed, or remove if Empresa can be duplicated
               userMessage = 'Error: La empresa ingresada ya existe.';
          }
      }
      res.status(500).json({ error: userMessage });
    }
     // La conexión se cierra en el middleware de db.js
  });

  // Ruta para obtener un cliente por ID
  router.get('/:id', async (req, res) => {
      const clienteId = req.params.id;

      const sql = `SELECT id, Empresa, Cuit, Contacto, Telefono, Mail, Direccion FROM Clientes WHERE id = ?`;

      try {
          const [rows, fields] = await req.db.execute(sql, [clienteId]);

          if (rows.length === 0) {
              return res.status(404).json({ error: `Cliente con ID ${clienteId} no encontrado.` });
          }

          res.json(rows[0]);
      } catch (error) {
          console.error(`Error al obtener cliente por ID ${clienteId}:`, error);
          res.status(500).json({ error: 'Error interno del servidor al obtener cliente.' });
      }
       // La conexión se cierra en el middleware de db.js
  });

  // Ruta para actualizar un cliente por ID
  router.put('/:id', async (req, res) => {
      const clienteId = req.params.id;
      const { Empresa, Cuit, Contacto, Telefono, Mail, Direccion } = req.body;

       // MODIFIED VALIDATION: Only Empresa is mandatory
       if (!Empresa) {
           return res.status(400).json({ error: 'La Empresa es obligatoria.' });
       }

      const sql = `
          UPDATE Clientes
          SET
              Empresa = ?,
              Cuit = ?,
              Contacto = ?,
              Telefono = ?,
              Mail = ?,
              Direccion = ?
          WHERE id = ?;
      `;
      const values = [Empresa, Cuit, Contacto, Telefono, Mail, Direccion, clienteId];

      try {
          const [result] = await req.db.execute(sql, values);

          if (result.affectedRows === 0) {
              return res.status(404).json({ error: `No se encontró cliente con ID ${clienteId} para actualizar.` });
          }

          res.json({ success: { id: clienteId, changes: result.affectedRows } });
      } catch (error) {
          console.error(`Error al actualizar cliente con ID ${clienteId}:`, error);
           let userMessage = 'Error interno del servidor al actualizar cliente.';
           if (error.code === 'ER_DUP_ENTRY') {
               // Keep the check for duplicate Cuit to ensure uniqueness
               if (error.message.includes('Cuit')) {
                    userMessage = 'Error: El Cuit ingresado ya existe.';
               } else if (error.message.includes('Empresa')) {
                    // Keep the check for duplicate Empresa if needed, or remove if Empresa can be duplicated
                    userMessage = 'Error: La empresa ingresada ya existe.';
               }
           }
          res.status(500).json({ error: userMessage });
      }
       // La conexión se cierra en el middleware de db.js
  });

  // Ruta para eliminar un cliente por ID
  router.delete('/:id', async (req, res) => {
      const clienteId = req.params.id;

      // Opcional: Verificar dependencias antes de intentar eliminar (más seguro que confiar solo en FK)
      // db.get("SELECT COUNT(*) AS count FROM Ventas WHERE Cliente_id = ?", [id], ...)

      const sql = `DELETE FROM Clientes WHERE id = ?`;

      try {
          const [result] = await req.db.execute(sql, [clienteId]);

          if (result.affectedRows === 0) {
               return res.status(404).json({ error: `No se encontró cliente con ID ${clienteId} para eliminar.` });
          }

          res.json({ success: { id: clienteId, changes: result.affectedRows } });
      } catch (error) {
          console.error(`Error al eliminar cliente con ID ${clienteId}:`, error);
           let userMessage = 'Error interno del servidor al eliminar cliente.';
           if (error.code === 'ER_ROW_IS_REFERENCED_2') { // Código de error si hay FK que impiden la eliminación
               userMessage = 'No se puede eliminar el cliente porque tiene registros asociados (ventas, etc.).';
           }
          res.status(500).json({ error: userMessage });
      }
       // La conexión se cierra en el middleware de db.js
  });


module.exports = router;