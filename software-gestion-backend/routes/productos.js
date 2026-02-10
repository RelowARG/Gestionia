// routes/productos.js (Modificado para permitir búsqueda en GET /)
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Productos

// Obtener todos los productos (ahora con opción de búsqueda)
router.get('/', async (req, res) => {
    try {
      // Obtener el término de búsqueda de los parámetros de la consulta (si existe)
      const searchTerm = req.query.searchTerm;
      let sql = 'SELECT id, codigo, Descripcion, tipo, eti_x_rollo, costo_x_1000, costo_x_rollo, precio, banda, material, Buje FROM Productos';
      const values = []; // Array para los valores de la consulta preparada

      // Si hay un término de búsqueda, agregar una cláusula WHERE
      if (searchTerm) {
          sql += ' WHERE codigo LIKE ? OR Descripcion LIKE ?'; // Buscar en codigo O Descripcion
          const searchPattern = `%${searchTerm}%`; // Patrón para buscar el término en cualquier parte del campo
          values.push(searchPattern, searchPattern); // Añadir el patrón para ambas columnas
      }

      sql += ' ORDER BY codigo ASC'; // Mantener el orden

      // Ejecutar la consulta (con o sin WHERE)
      const [rows, fields] = await req.db.execute(sql, values);
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener/buscar productos:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener/buscar productos.' });
    }
  });

  // Agregar un nuevo producto
  router.post('/', async (req, res) => {
    // Destructure data from request body, INCLUDE 'tipo'
    const { codigo, Descripcion, tipo, eti_x_rollo, costo_x_1000, costo_x_rollo, precio, banda, material, Buje } = req.body;

    // Basic validation, INCLUDE 'tipo'
    if (!codigo || !Descripcion || !tipo) { // 'tipo' ahora es obligatorio según la validación del frontend
      return res.status(400).json({ error: 'Código, Descripción y Tipo son obligatorios.' });
    }

    // SQL query to insert a new product, INCLUDE 'tipo' column
    const sql = `
      INSERT INTO Productos (
        codigo, Descripcion, tipo, eti_x_rollo, costo_x_1000, costo_x_rollo, precio,
        banda, material, Buje
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // Añadir un placeholder más (?)

    // Ensure numerical values are parsed correctly or set to null, INCLUDE 'tipo'
    const values = [
      codigo,
      Descripcion,
      tipo, // <-- Incluir tipo
      eti_x_rollo !== '' && eti_x_rollo !== null ? parseFloat(eti_x_rollo) : null,
      costo_x_1000 !== '' && costo_x_1000 !== null ? parseFloat(costo_x_1000) : null,
      costo_x_rollo !== '' && costo_x_rollo !== null ? parseFloat(costo_x_rollo) : null, // Use the pre-calculated value from frontend/state
      precio !== '' && precio !== null ? parseFloat(precio) : null,
      banda || null,
      material || null,
      Buje || null
    ];

    try {
      // Execute the insert query
      const [result] = await req.db.execute(sql, values);
      // Respond with success and the new product ID
      res.status(201).json({ success: { id: result.insertId } });
    } catch (error) {
      // Handle potential errors (e.g., duplicate entry)
      console.error('Error al agregar producto:', error);
      let userMessage = 'Error interno del servidor al agregar producto.';
      if (error.code === 'ER_DUP_ENTRY' && error.message.includes('codigo')) {
        userMessage = 'Error: El código de producto ya existe.';
      }
      res.status(500).json({ error: userMessage });
    }
  });

  // Obtener un producto por ID
  router.get('/:id', async (req, res) => {
    const productoId = req.params.id;

    // SQL query to select a product by its ID, INCLUDE 'tipo'
    const sql = `
      SELECT
        id, codigo, Descripcion, tipo, eti_x_rollo, costo_x_1000, costo_x_rollo, precio,
        banda, material, Buje
      FROM Productos
      WHERE id = ?`;

    try {
      // Execute the select query
      const [rows, fields] = await req.db.execute(sql, [productoId]);

      // Check if a product was found
      if (rows.length === 0) {
        return res.status(404).json({ error: `Producto con ID ${productoId} no encontrado.` });
      }

      // Respond with the found product data
      res.json(rows[0]);
    } catch (error) {
      // Handle potential errors
      console.error(`Error al obtener producto por ID ${productoId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al obtener producto.' });
    }
  });

  // Actualizar un producto por ID (CON HISTORIAL DE COSTOS)
  router.put('/:id', async (req, res) => {
    const productoId = req.params.id;
    // Destructure data from request body, INCLUDE 'tipo'
    const { codigo, Descripcion, tipo, eti_x_rollo, costo_x_1000, costo_x_rollo, precio, banda, material, Buje } = req.body;

    // Basic validation, INCLUDE 'tipo'
     if (!codigo || !Descripcion || !tipo) { // 'tipo' ahora es obligatorio
       return res.status(400).json({ error: 'Código, Descripción y Tipo son obligatorios.' });
     }

     // *** INICIO: NUEVO BLOQUE PARA HISTORIAL DE COSTOS ***
     try {
        // Start a database transaction
        await req.db.beginTransaction();

        // 1. Get the current cost BEFORE updating
        // No necesitamos obtener 'tipo' aquí para el historial a menos que el historial dependa del tipo
        const [currentProductRows] = await req.db.execute(
            'SELECT costo_x_1000, costo_x_rollo FROM Productos WHERE id = ?',
            [productoId]
        );

        // Check if product exists before proceeding
        if (currentProductRows.length === 0) {
             await req.db.rollback(); // Rollback transaction
             return res.status(404).json({ error: `No se encontró producto con ID ${productoId} para actualizar.` });
        }
        const currentCost = currentProductRows[0];
        // Parse current costs safely, handling potential nulls from DB
        const currentCost1000Float = currentCost.costo_x_1000 !== null ? parseFloat(currentCost.costo_x_1000) : null;
        const currentCostRolloFloat = currentCost.costo_x_rollo !== null ? parseFloat(currentCost.costo_x_rollo) : null;


        // 2. Parse the NEW incoming costs (handle empty strings/nulls)
        const newCosto1000 = costo_x_1000 !== '' && costo_x_1000 !== null ? parseFloat(costo_x_1000) : null;
        const newCostoRollo = costo_x_rollo !== '' && costo_x_rollo !== null ? parseFloat(costo_x_rollo) : null; // This might be pre-calculated or null

        // 3. Compare if relevant costs have changed
        // Compare parsed floats for accuracy, handle null comparisons
        const cost1000Changed = newCosto1000 !== currentCost1000Float;
        const costRolloChanged = newCostoRollo !== currentCostRolloFloat;
        const costChanged = cost1000Changed || costRolloChanged;
                           // Add other cost field comparisons if needed

        // 4. If cost changed, insert the *current* (old) cost into the history table
        if (costChanged) {
             console.log(`Costo cambiado para Producto ID ${productoId}. Insertando en historial.`);
             const insertHistorySql = `
                 INSERT INTO Producto_Costo_Historico
                     (Producto_id, Fecha_Valido_Desde, costo_x_1000, costo_x_rollo)
                 VALUES (?, NOW(), ?, ?)`;
             // Insert the *previous* cost values from the database
             await req.db.execute(insertHistorySql, [
                 productoId,
                 currentCost.costo_x_1000, // Use original value from DB (could be null)
                 currentCost.costo_x_rollo  // Use original value from DB (could be null)
                 // Add other cost fields here if tracking their history
             ]);
        } else {
             console.log(`Costo NO cambiado para Producto ID ${productoId}. No se inserta historial.`);
        }
        // *** FIN: NUEVO BLOQUE PARA HISTORIAL DE COSTOS ***


        // 5. Proceed with updating the product in the Productos table, INCLUDE 'tipo'
        const updateProductSql = `
          UPDATE Productos
          SET
            codigo = ?,
            Descripcion = ?,
            tipo = ?, -- <-- Incluir tipo en el SET
            eti_x_rollo = ?,
            costo_x_1000 = ?,
            costo_x_rollo = ?,
            precio = ?,
            banda = ?,
            material = ?,
            Buje = ?
          WHERE id = ?;`;

        // Prepare values for the update query, using the NEW parsed costs, INCLUDE 'tipo'
        // Asegúrate de que el orden de los valores coincida con el orden en la cláusula SET
        const values = [
          codigo,
          Descripcion,
          tipo, // <-- Incluir tipo
          eti_x_rollo !== '' && eti_x_rollo !== null ? parseFloat(eti_x_rollo) : null,
          newCosto1000, // Use the new parsed cost
          newCostoRollo, // Use the new parsed/calculated cost
          precio !== '' && precio !== null ? parseFloat(precio) : null,
          banda || null,
          material || null,
          Buje || null,
          productoId // El último valor es el ID para la cláusula WHERE
        ];

        // Execute the update query
        const [result] = await req.db.execute(updateProductSql, values);

        // Check if the update was successful (affectedRows should be 1 if found and updated)
        // This check is somewhat redundant if the initial SELECT worked, but good for robustness
        if (result.affectedRows === 0) {
            await req.db.rollback(); // Rollback if update failed unexpectedly
            // This case is unlikely if the initial SELECT succeeded, but handle it just in case
            return res.status(404).json({ error: `No se encontró producto con ID ${productoId} durante la actualización final.` });
        }

        // If everything succeeded, commit the transaction
        await req.db.commit();

        // Respond with success
        res.json({ success: { id: productoId, changes: result.affectedRows } });

     } catch (error) {
        // If any error occurs during the transaction, roll it back
        await req.db.rollback();
        console.error(`Error al actualizar producto con ID ${productoId} (con historial):`, error);
        let userMessage = 'Error interno del servidor al actualizar producto (con historial).';
        // Handle specific errors like duplicate entry
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('codigo')) {
          userMessage = 'Error: El código de producto ya existe.';
        }
        // Provide a more user-friendly message if it's a foreign key constraint error (although less likely on update unless key itself changes)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             userMessage = 'Error: La actualización viola una restricción de clave foránea.';
        }
        // Respond with error status and message
        res.status(500).json({ error: userMessage });
     }
  });

  // Eliminar un producto por ID
  router.delete('/:id', async (req, res) => {
    const productoId = req.params.id;

    // SQL query to delete a product by ID
    const sql = `DELETE FROM Productos WHERE id = ?`;

    try {
      // Execute the delete query
      const [result] = await req.db.execute(sql, [productoId]);

      // Check if a row was actually deleted
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `No se encontró producto con ID ${productoId} para eliminar.` });
      }

      // Respond with success
      res.json({ success: { id: productoId, changes: result.affectedRows } });
    } catch (error) {
      // Handle potential errors (e.g., foreign key constraints)
      console.error(`Error al eliminar producto con ID ${productoId}:`, error);
       let userMessage = 'Error interno del servidor al eliminar producto.';
       // Provide a more user-friendly message if it's a foreign key constraint error
       if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            userMessage = 'No se puede eliminar el producto porque tiene registros asociados (stock, ítems de ventas/compras/presupuestos).';
       }
      res.status(500).json({ error: userMessage });
    }
  });

// Export the router module
module.exports = router;