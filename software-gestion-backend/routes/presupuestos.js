// routes/presupuestos.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Presupuestos

// Helper para obtener ítems de presupuesto por Presupuesto_id
async function getPresupuestoItemsByPresupuestoId(db, presupuestoId) {
    const [itemRows, itemFields] = await db.execute(`
        SELECT
            pi.id, pi.Presupuesto_id, pi.Producto_id, pi.Cantidad, pi.Precio_Unitario, pi.Descuento_Porcentaje, pi.Total_Item,
            pi.Descripcion_Personalizada, pi.Precio_Unitario_Personalizada, pi.Cantidad_Personalizada,
            pr.id AS Producto_id, pr.codigo, pr.Descripcion AS Producto_Descripcion, pr.eti_x_rollo, pr.banda, pr.material, pr.Buje -- Incluye detalles del producto si existe
        FROM Presupuesto_Items pi
        LEFT JOIN Productos pr ON pi.Producto_id = pr.id -- Usamos LEFT JOIN porque Producto_id puede ser NULL
        WHERE pi.Presupuesto_id = ?
        ORDER BY pi.id ASC`, [presupuestoId]); // Mantener el orden por ID de ítem
    return itemRows;
}

// Helper para obtener un presupuesto específico por su ID, incluyendo sus ítems
// (Esta función ahora solo obtiene los datos principales, los ítems se obtienen por separado)
async function getPresupuestoByIdBasic(db, presupuestoId) {
    const [presupuestoRows, presupuestoFields] = await db.execute(`
        SELECT
            p.id, p.Numero, p.Fecha, p.Cliente_id, p.ValidezOferta, p.Comentarios,
            p.CondicionesPago, p.DatosPago, p.Subtotal, p.IVA_Porcentaje, p.IVA_Monto,
            p.Otro_Monto, p.Total_USD, p.Cotizacion_Dolar, p.Total_ARS,
            c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente,
            c.Contacto AS Contacto_Cliente, c.Mail AS Mail_Cliente -- Incluye Contacto y Mail del cliente
        FROM Presupuestos p
        JOIN Clientes c ON p.Cliente_id = c.id
        WHERE p.id = ?`, [presupuestoId]);
    return presupuestoRows.length > 0 ? presupuestoRows[0] : null;
}

// Helper para formatear una fecha a YYYY-MM-DD
function formatDateToYYYYMMDD(dateString) {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null; // Return null for invalid dates
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return null; // Return null in case of any parsing error
    }
}


// Obtener todos los presupuestos (lista para la tabla principal)
router.get('/', async (req, res) => {
    try {
      // Consulta para obtener todos los presupuestos con información básica del cliente
      const [rows, fields] = await req.db.execute(`
        SELECT
            p.id, p.Numero, p.Fecha, p.Total_USD, p.Total_ARS, p.Cotizacion_Dolar,
            c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
        FROM Presupuestos p
        JOIN Clientes c ON p.Cliente_id = c.id
        ORDER BY p.Fecha DESC, p.Numero DESC`); // Ordenar por fecha y número descendente

      // Parsear campos numéricos para asegurar que son números
      const presupuestosParsed = rows.map(row => ({
          ...row,
          Total_USD: parseFloat(row.Total_USD) || 0,
          Total_ARS: parseFloat(row.Total_ARS) || 0,
          Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || 0,
      }));

      res.json(presupuestosParsed); // Enviar los resultados como JSON
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener presupuestos.' }); // Enviar respuesta de error
    }
  });

  // Obtener un presupuesto específico por su ID, incluyendo sus ítems
  router.get('/:id', async (req, res) => {
    const presupuestoId = req.params.id;

    try {
      // Iniciar una transacción ya que realizaremos múltiples consultas lógicamente relacionadas
      await req.db.beginTransaction();

      // Consulta para obtener los datos del presupuesto principal usando el helper
      const presupuestoData = await getPresupuestoByIdBasic(req.db, presupuestoId);

      // Si no se encontró el presupuesto principal, hacer rollback y enviar error 404
      if (!presupuestoData) {
        await req.db.rollback();
        return res.status(404).json({ error: `Presupuesto con ID ${presupuestoId} no encontrado.` });
      }

      // Consulta para obtener los ítems asociados a este presupuesto usando el helper
      const itemRows = await getPresupuestoItemsByPresupuestoId(req.db, presupuestoId);

      // Combinar los datos del presupuesto principal con sus ítems
      const fullPresupuestoData = {
        ...presupuestoData,
         // Asegurarse de que los campos numéricos estén parseados aquí también
         ValidezOferta: parseFloat(presupuestoData.ValidezOferta) || 0,
         Subtotal: parseFloat(presupuestoData.Subtotal) || 0,
         IVA_Porcentaje: parseFloat(presupuestoData.IVA_Porcentaje) || 0,
         IVA_Monto: parseFloat(presupuestoData.IVA_Monto) || 0,
         Otro_Monto: parseFloat(presupuestoData.Otro_Monto) || 0,
         Total_USD: parseFloat(presupuestoData.Total_USD) || 0,
         Cotizacion_Dolar: parseFloat(presupuestoData.Cotizacion_Dolar) || 0,
         Total_ARS: parseFloat(presupuestoData.Total_ARS) || 0,
        items: itemRows || [] // Si no hay ítems, será un array vacío
      };

      // Confirmar la transacción (aunque sea de lectura)
      await req.db.commit();

      // Enviar los datos completos del presupuesto (principal + ítems)
      res.json(fullPresupuestoData);

    } catch (error) {
      console.error(`Error al obtener presupuesto con ID ${presupuestoId}:`, error);
      // En caso de error, hacer rollback de la transacción
      await req.db.rollback();
      res.status(500).json({ error: 'Error interno del servidor al obtener presupuesto.' });
    }
  });

  // Agregar un nuevo presupuesto, incluyendo sus ítems
  router.post('/', async (req, res) => {
    // Obtener los datos del presupuesto y sus ítems del cuerpo de la solicitud
    const {
      Fecha, Cliente_id, ValidezOferta, Comentarios,
      CondicionesPago, DatosPago, Subtotal, IVA_Porcentaje, IVA_Monto,
      Otro_Monto, Total_USD, Cotizacion_Dolar, Total_ARS,
      items // Array combinado de ítems (productos y personalizados)
    } = req.body;

    // Validación básica
    if (!Fecha || !Cliente_id || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Fecha, Cliente e ítems son obligatorios para agregar un presupuesto.' });
    }

    // Validar campos numéricos principales si no están vacíos
    if (ValidezOferta !== null && ValidezOferta !== '' && isNaN(parseFloat(ValidezOferta))) {
        return res.status(400).json({ error: 'Validez de la oferta debe ser un número válido si se proporciona.' });
    }
    if (IVA_Porcentaje !== null && IVA_Porcentaje !== '' && isNaN(parseFloat(IVA_Porcentaje))) {
        return res.status(400).json({ error: 'IVA (%) debe ser un número válido si se proporciona.' });
    }
    if (Otro_Monto !== null && Otro_Monto !== '' && isNaN(parseFloat(Otro_Monto))) {
        return res.status(400).json({ error: 'Otro (USD) debe ser un número válido si se proporciona.' });
    }
    if (Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || Cotizacion_Dolar === '' || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
        return res.status(400).json({ error: 'Cotización Dólar es obligatoria y debe ser un número válido (> 0).' });
    }
     // Subtotal, IVA_Monto, Total_USD, Total_ARS vienen calculados del frontend, asumimos que son números válidos si no son null/vacío
     if (Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal debe ser un número válido si se proporciona.' }); }
     if (IVA_Monto !== null && IVA_Monto !== '' && isNaN(parseFloat(IVA_Monto))) { return res.status(400).json({ error: 'IVA Monto debe ser un número válido si se proporciona.' }); }
     if (Total_USD !== null && Total_USD !== '' && isNaN(parseFloat(Total_USD))) { return res.status(400).json({ error: 'Total USD debe ser un número válido si se proporciona.' }); }
     if (Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS debe ser un número válido si se proporciona.' }); }


    // Formatear la fecha a YYYY-MM-DD
    const formattedFecha = formatDateToYYYYMMDD(Fecha);
    if (!formattedFecha) {
        return res.status(400).json({ error: 'Formato de fecha no válido.' });
    }


    try {
      // Iniciar una transacción para asegurar que todo (presupuesto e ítems) se guarde o nada se guarde
      await req.db.beginTransaction();

      // 1. Generar el número de presupuesto único (replicando la lógica del manejador IPC)
      // Bloquear la tabla para evitar duplicados en alta concurrencia (opcional pero más seguro)
      // await req.db.execute('LOCK TABLES Presupuestos WRITE'); // Descomentar si necesitas bloqueo explícito

      const [rows, fields] = await req.db.execute('SELECT Numero FROM Presupuestos ORDER BY Numero DESC LIMIT 1');
      let nextNumber = 1;
      if (rows.length > 0 && rows[0].Numero) {
        const lastNumero = rows[0].Numero;
        // Extraer la parte numérica (asumiendo formato "NUMEROX")
        const numericPart = lastNumero.replace(/\D/g, ''); // Eliminar caracteres no numéricos
        const lastNumericValue = parseInt(numericPart, 10);
        if (!isNaN(lastNumericValue)) {
          nextNumber = lastNumericValue + 1;
        }
      }
      const formattedNextNumero = String(nextNumber).padStart(9, '0') + 'X'; // Formato deseado

      // 2. Insertar el presupuesto principal
      const insertPresupuestoSql = `
        INSERT INTO Presupuestos (
          Numero, Fecha, Cliente_id, ValidezOferta, Comentarios,
          CondicionesPago, DatosPago, Subtotal, IVA_Porcentaje, IVA_Monto,
          Otro_Monto, Total_USD, Cotizacion_Dolar, Total_ARS
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      // Asegurarse de que los valores numéricos sean números o null, no strings vacíos, al enviar
      const presupuestoValues = [
        formattedNextNumero, // Usar el número generado
        formattedFecha, // Usar la fecha formateada
        parseInt(Cliente_id, 10), // Asegurar que Cliente_id sea entero
        ValidezOferta !== '' && ValidezOferta !== null ? parseFloat(ValidezOferta) : null,
        Comentarios || null,
        CondicionesPago || null,
        DatosPago || null,
        Subtotal !== null && Subtotal !== '' ? parseFloat(Subtotal) : null, // Usar valor del frontend
        IVA_Porcentaje !== null && IVA_Porcentaje !== '' ? parseFloat(IVA_Porcentaje) : null, // Usar valor del frontend
        IVA_Monto !== null && IVA_Monto !== '' ? parseFloat(IVA_Monto) : null, // Usar valor del frontend
        Otro_Monto !== null && Otro_Monto !== '' ? parseFloat(Otro_Monto) : null, // Usar valor del frontend
        Total_USD !== null && Total_USD !== '' ? parseFloat(Total_USD) : null, // Usar valor del frontend
        Cotizacion_Dolar !== '' ? parseFloat(Cotizacion_Dolar) : null, // Usar valor del frontend
        Total_ARS !== null && Total_ARS !== '' ? parseFloat(Total_ARS) : null, // Usar valor del frontend
      ];

      const [result] = await req.db.execute(insertPresupuestoSql, presupuestoValues);
      const nuevoPresupuestoId = result.insertId; // Obtener el ID generado para el presupuesto principal
      console.log(`[BACKEND] Presupuesto principal insertado con ID: ${nuevoPresupuestoId}`);


      // 3. Insertar los ítems del presupuesto - CORRECCIÓN: Insertar uno por uno
      const insertItemSql = `
        INSERT INTO Presupuesto_Items (
          Presupuesto_id, Producto_id, Cantidad, Precio_Unitario,
          Descuento_Porcentaje, Total_Item,
          Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      if (items.length > 0) {
        console.log(`[BACKEND] Processing ${items.length} items for insertion.`);
        for (const item of items) {
            // Validar cada ítem antes de intentar insertarlo
            // Asegurarse de que los campos numéricos sean números o null si vienen vacíos/invalidos
            const productoId = item.Producto_id !== null && item.Producto_id !== '' ? parseInt(item.Producto_id, 10) : null;
            const cantidad = item.Cantidad !== null && item.Cantidad !== '' ? parseFloat(item.Cantidad) : null;
            const precioUnitario = item.Precio_Unitario !== null && item.Precio_Unitario !== '' ? parseFloat(item.Precio_Unitario) : null;
            const descuentoPorcentaje = item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' ? parseFloat(item.Descuento_Porcentaje) : 0;
            const totalItem = item.Total_Item !== null && item.Total_Item !== '' ? parseFloat(item.Total_Item) : null;

            const cantidadPersonalizada = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' ? parseFloat(item.Cantidad_Personalizada) : null;
            const precioUnitarioPersonalizado = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' ? parseFloat(item.Precio_Unitario_Personalizada) : null;

             // --- Detailed Validation Logging ---
             let skip = false;
             if (productoId !== null) { // Es un ítem de producto
                 if (cantidad === null || isNaN(cantidad) || cantidad <= 0) {
                      console.error(`[BACKEND] Skipping product item validation failed (Cantidad invalid: ${cantidad}):`, item);
                      skip = true;
                 } else if (precioUnitario === null || isNaN(precioUnitario) || precioUnitario < 0) {
                      console.error(`[BACKEND] Skipping product item validation failed (PrecioUnitario invalid: ${precioUnitario}):`, item);
                      skip = true;
                 }
             } else { // Es un ítem personalizado
                 if (!item.Descripcion_Personalizada) {
                      console.error(`[BACKEND] Skipping custom item validation failed (Descripcion_Personalizada missing):`, item);
                      skip = true;
                 } else if (cantidadPersonalizada === null || isNaN(cantidadPersonalizada) || cantidadPersonalizada <= 0) {
                     console.error(`[BACKEND] Skipping custom item validation failed (Cantidad_Personalizada invalid: ${cantidadPersonalizada}):`, item);
                      skip = true;
                 } else if (precioUnitarioPersonalizado === null || isNaN(precioUnitarioPersonalizado) || precioUnitarioPersonalizado < 0) {
                      console.error(`[BACKEND] Skipping custom item validation failed (Precio_Unitario_Personalizada invalid: ${precioUnitarioPersonalizado}):`, item);
                      skip = true;
                 }
             }
              // Validar descuento si está presente (applies mainly to products, but checked for all)
              if (!skip && descuentoPorcentaje !== null && isNaN(descuentoPorcentaje) || descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
                   console.error(`[BACKEND] Skipping item validation failed (DescuentoPorcentaje invalid: ${descuentoPorcentaje}):`, item);
                   skip = true;
              }
              // Validar total si está presente
              if (!skip && totalItem !== null && isNaN(totalItem) || totalItem < 0) {
                   console.error(`[BACKEND] Skipping item validation failed (Total_Item invalid: ${totalItem}):`, item);
                   skip = true;
              }

             if (skip) {
                 continue; // Skip insertion for this item if validation failed
             }
             // --- End Detailed Validation Logging ---


            const itemValues = [
                nuevoPresupuestoId, // Enlazar con el ID del presupuesto principal
                productoId, // Producto_id (null para personalizados)
                cantidad, // Cantidad (null para personalizados)
                precioUnitario, // Precio Unitario (null para personalizados)
                descuentoPorcentaje, // Descuento
                totalItem, // Total Ítem
                item.Descripcion_Personalizada || null, // Descripción Personalizada (null para productos)
                precioUnitarioPersonalizado, // Precio Unitario Personalizado (null para productos)
                cantidadPersonalizada, // Cantidad Personalizada (null para productos)
            ];

            await req.db.execute(insertItemSql, itemValues); // Ejecutar inserción para cada ítem
            console.log(`[BACKEND] Ítem insertado para Presupuesto ID ${nuevoPresupuestoId}.`);
        }
      } else {
          console.log(`[BACKEND] No items to process for insertion.`);
      }


      // If everything was successful, commit the transaction
      // await req.db.execute('LOCK TABLES Presupuestos WRITE'); // Descomentar si necesitas bloqueo explícito
      await req.db.commit();
      console.log(`[BACKEND] Transaction committed for adding budget ID ${nuevoPresupuestoId}.`);


      // Enviar respuesta de éxito con el ID del nuevo presupuesto
      res.status(201).json({ success: { id: nuevoPresupuestoId, Numero: formattedNextNumero } }); // Devolver el número generado también

    } catch (error) {
      console.error('[BACKEND] Error al agregar presupuesto:', error);
      // En caso de error, hacer rollback de la transacción
      // await req.db.execute('UNLOCK TABLES'); // Descomentar si usaste bloqueo explícito
      await req.db.rollback();
      console.error('[BACKEND] Transaction rolled back.');
      let userMessage = 'Error interno del servidor al agregar presupuesto.';
      // Manejar errores específicos si es necesario (ej: FK para Cliente_id o Producto_id)
       if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            userMessage = 'Error: Cliente o Producto seleccionado no válido.';
       } else if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Numero')) {
           userMessage = 'Error: El número de presupuesto generado ya existe. Intente de nuevo.'; // Poco probable si se genera bien, pero posible en concurrencia
       } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
            userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
       }
      res.status(500).json({ error: userMessage });
    }
  });

  // Actualizar un presupuesto existente por su ID, incluyendo la re-inserción de ítems
  router.put('/:id', async (req, res) => {
    const presupuestoId = req.params.id;
    const {
      Numero, Fecha, Cliente_id, ValidezOferta, Comentarios,
      CondicionesPago, DatosPago, Subtotal, IVA_Porcentaje, IVA_Monto,
      Otro_Monto, Total_USD, Cotizacion_Dolar, Total_ARS,
      items // Array combinado de ítems actualizados
    } = req.body;

    // Validación básica
    if (!Numero || !Fecha || !Cliente_id || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Número, Fecha, Cliente y la lista de ítems son obligatorios para actualizar un presupuesto.' });
    }

     // Validar campos numéricos principales si no están vacíos
    if (ValidezOferta !== null && ValidezOferta !== '' && isNaN(parseFloat(ValidezOferta))) {
        return res.status(400).json({ error: 'Validez de la oferta debe ser un número válido si se proporciona.' });
    }
    if (IVA_Porcentaje !== null && IVA_Porcentaje !== '' && isNaN(parseFloat(IVA_Porcentaje))) {
        return res.status(400).json({ error: 'IVA (%) debe ser un número válido si se proporciona.' });
    }
    if (Otro_Monto !== null && Otro_Monto !== '' && isNaN(parseFloat(Otro_Monto))) {
        return res.status(400).json({ error: 'Otro (USD) debe ser un número válido si se proporciona.' });
    }
    if (Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || Cotizacion_Dolar === '' || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
        return res.status(400).json({ error: 'Cotización Dólar es obligatoria y debe ser un número válido (> 0).' });
    }
     // Subtotal, IVA_Monto, Total_USD, Total_ARS vienen calculados del frontend, asumimos que son números válidos si no son null/vacío
     if (Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal debe ser un número válido si se proporciona.' }); }
     if (IVA_Monto !== null && IVA_Monto !== '' && isNaN(parseFloat(IVA_Monto))) { return res.status(400).json({ error: 'IVA Monto debe ser un número válido si se proporciona.' }); }
     if (Total_USD !== null && Total_USD !== '' && isNaN(parseFloat(Total_USD))) { return res.status(400).json({ error: 'Total USD debe ser un número válido si se proporciona.' }); }
     if (Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS debe ser un número válido si se proporciona.' }); }


    // Formatear la fecha a YYYY-MM-DD
    const formattedFecha = formatDateToYYYYMMDD(Fecha);
    if (!formattedFecha) {
        return res.status(400).json({ error: 'Formato de fecha no válido.' });
    }


    try {
      // Iniciar una transacción
      await req.db.beginTransaction();

      // 1. Actualizar el presupuesto principal
      const updatePresupuestoSql = `
        UPDATE Presupuestos
        SET
          Numero = ?, Fecha = ?, Cliente_id = ?, ValidezOferta = ?, Comentarios = ?,
          CondicionesPago = ?, DatosPago = ?, Subtotal = ?, IVA_Porcentaje = ?, IVA_Monto = ?,
          Otro_Monto = ?, Total_USD = ?, Cotizacion_Dolar = ?, Total_ARS = ?
        WHERE id = ?;`;

      const presupuestoValues = [
        Numero,
        formattedFecha, // Usar la fecha formateada
        parseInt(Cliente_id, 10),
        ValidezOferta !== '' && ValidezOferta !== null ? parseFloat(ValidezOferta) : null,
        Comentarios || null,
        CondicionesPago || null,
        DatosPago || null,
        Subtotal !== null && Subtotal !== '' ? parseFloat(Subtotal) : null, // Usar valor del frontend
        IVA_Porcentaje !== null && IVA_Porcentaje !== '' ? parseFloat(IVA_Porcentaje) : null, // Usar valor del frontend
        IVA_Monto !== null && IVA_Monto !== '' ? parseFloat(IVA_Monto) : null, // Usar valor del frontend
        Otro_Monto !== null && Otro_Monto !== '' ? parseFloat(Otro_Monto) : null, // Usar valor del frontend
        Total_USD !== null && Total_USD !== '' ? parseFloat(Total_USD) : null, // Usar valor del frontend
        Cotizacion_Dolar !== '' ? parseFloat(Cotizacion_Dolar) : null, // Usar valor del frontend
        Total_ARS !== null && Total_ARS !== '' ? parseFloat(Total_ARS) : null, // Usar valor del frontend
        presupuestoId // Usar el ID del presupuesto a actualizar
      ];

      const [updateResult] = await req.db.execute(updatePresupuestoSql, presupuestoValues);

       // Opcional: Verificar si el presupuesto principal existía antes de seguir
       if (updateResult.affectedRows === 0) {
            await req.db.rollback();
            return res.status(404).json({ error: `No se encontró presupuesto con ID ${presupuestoId} para actualizar.` });
       }
       console.log(`[BACKEND] Presupuesto principal con ID ${presupuestoId} actualizado. Changes: ${updateResult.affectedRows}`);


      // 2. Eliminar los ítems existentes para este presupuesto
      // Esta es la forma simple que replicaremos desde tu manejador IPC.
      const deleteItemsSql = `DELETE FROM Presupuesto_Items WHERE Presupuesto_id = ?`;
      await req.db.execute(deleteItemsSql, [presupuestoId]); // No necesitamos el resultado, solo que se ejecute
      console.log(`[BACKEND] Ítems existentes eliminados para Presupuesto ID ${presupuestoId}.`);


      // 3. Insertar los nuevos ítems - CORRECCIÓN: Insertar uno por uno
      const insertItemSql = `
        INSERT INTO Presupuesto_Items (
          Presupuesto_id, Producto_id, Cantidad, Precio_Unitario,
          Descuento_Porcentaje, Total_Item,
          Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      if (items.length > 0) {
           console.log(`[BACKEND] Processing ${items.length} items for update insertion.`);
        for (const item of items) {
             // Validar cada ítem antes de intentar insertarlo
             // Asegurarse de que los campos numéricos sean números o null si vienen vacíos/invalidos
             const productoId = item.Producto_id !== null && item.Producto_id !== '' ? parseInt(item.Producto_id, 10) : null;
             const cantidad = item.Cantidad !== null && item.Cantidad !== '' ? parseFloat(item.Cantidad) : null;
             const precioUnitario = item.Precio_Unitario !== null && item.Precio_Unitario !== '' ? parseFloat(item.Precio_Unitario) : null;
             const descuentoPorcentaje = item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' ? parseFloat(item.Descuento_Porcentaje) : 0;
             const totalItem = item.Total_Item !== null && item.Total_Item !== '' ? parseFloat(item.Total_Item) : null;

             const cantidadPersonalizada = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' ? parseFloat(item.Cantidad_Personalizada) : null;
             const precioUnitarioPersonalizado = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' ? parseFloat(item.Precio_Unitario_Personalizada) : null;

              // --- Detailed Validation Logging ---
             let skip = false;
             if (productoId !== null) { // Es un ítem de producto
                 if (cantidad === null || isNaN(cantidad) || cantidad <= 0) {
                      console.error(`[BACKEND] Skipping product item validation failed during update (Cantidad invalid: ${cantidad}):`, item);
                      skip = true;
                 } else if (precioUnitario === null || isNaN(precioUnitario) || precioUnitario < 0) {
                      console.error(`[BACKEND] Skipping product item validation failed during update (PrecioUnitario invalid: ${precioUnitario}):`, item);
                      skip = true;
                 }
             } else { // Es un ítem personalizado
                 if (!item.Descripcion_Personalizada) {
                      console.error(`[BACKEND] Skipping custom item validation failed during update (Descripcion_Personalizada missing):`, item);
                      skip = true;
                 } else if (cantidadPersonalizada === null || isNaN(cantidadPersonalizada) || cantidadPersonalizada <= 0) {
                     console.error(`[BACKEND] Skipping custom item validation failed during update (Cantidad_Personalizada invalid: ${cantidadPersonalizada}):`, item);
                      skip = true;
                 } else if (precioUnitarioPersonalizado === null || isNaN(precioUnitarioPersonalizado) || precioUnitarioPersonalizado < 0) {
                      console.error(`[BACKEND] Skipping custom item validation failed during update (Precio_Unitario_Personalizada invalid: ${precioUnitarioPersonalizado}):`, item);
                      skip = true;
                 }
             }
              // Validar descuento si está presente (applies mainly to products, but checked for all)
              if (!skip && descuentoPorcentaje !== null && isNaN(descuentoPorcentaje) || descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
                   console.error(`[BACKEND] Skipping item validation failed during update (DescuentoPorcentaje invalid: ${descuentoPorcentaje}):`, item);
                   skip = true;
              }
              // Validar total si está presente
              if (!skip && totalItem !== null && isNaN(totalItem) || totalItem < 0) {
                   console.error(`[BACKEND] Skipping item validation failed during update (Total_Item invalid: ${totalItem}):`, item);
                   skip = true;
              }

             if (skip) {
                 continue; // Skip insertion for this item if validation failed
             }
             // --- End Detailed Validation Logging ---


             const itemValues = [
                 presupuestoId, // Enlazar con el ID del presupuesto principal
                 productoId, // Producto_id (null para personalizados)
                 cantidad, // Cantidad (null for personalized)
                 precioUnitario, // Unit Price (null for personalized)
                 descuentoPorcentaje, // Discount
                 totalItem, // Total Item
                 item.Descripcion_Personalizada || null, // Personalized Description (null for products)
                 precioUnitarioPersonalizado, // Personalized Unit Price (null for products)
                 cantidadPersonalizada, // Personalized Quantity (null for products)
             ];

             await req.db.execute(insertItemSql, itemValues); // Ejecutar inserción para cada ítem
             console.log(`[BACKEND] Ítem insertado para Presupuesto ID ${presupuestoId} durante actualización.`);
         }
      } else {
           console.log(`[BACKEND] No items to process for update insertion.`);
      }


      // If everything was successful, commit the transaction
      await req.db.commit();
      console.log(`[BACKEND] Transaction committed for updating budget ID ${presupuestoId}.`);


      // Enviar respuesta de éxito
      res.json({ success: { id: presupuestoId, changes: updateResult.affectedRows } });

    } catch (error) {
      console.error(`[BACKEND] Error al actualizar presupuesto con ID ${presupuestoId}:`, error);
      // En caso de error, hacer rollback
      await req.db.rollback();
      console.error('[BACKEND] Transaction rolled back.');
      let userMessage = 'Error interno del servidor al actualizar presupuesto.';
       // Manejar error si hay registros asociados que impidan la eliminación principal (si no se eliminaron por CASCADE o explícitamente)
       if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            userMessage = 'No se puede eliminar el presupuesto porque tiene registros asociados inesperados.'; // Deberían haberse eliminado ítems, pero como precaución
       } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
       } else if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Numero')) {
            userMessage = 'Error: El número de presupuesto ya existe.';
       } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
           userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
       }
      res.status(500).json({ error: userMessage });
    }
  });


  // Eliminar un presupuesto por ID, incluyendo sus ítems
  router.delete('/:id', async (req, res) => {
    const presupuestoId = req.params.id;

    try {
      // Iniciar una transacción
      await req.db.beginTransaction();

      // 1. Eliminar los ítems asociados al presupuesto
      // Si configuraste ON DELETE CASCADE en la clave foránea Presupuesto_id en la tabla Presupuesto_Items
      // al crear las tablas en MySQL, la base de datos eliminará automáticamente los ítems
      // cuando elimines el presupuesto principal.
      // Sin embargo, es buena práctica (y replica tu manejador IPC) eliminarlos explícitamente dentro de la transacción.
      const deleteItemsSql = `DELETE FROM Presupuesto_Items WHERE Presupuesto_id = ?`;
      await req.db.execute(deleteItemsSql, [presupuestoId]); // No necesitamos el resultado
      console.log(`[BACKEND] Ítems eliminados para Presupuesto ID ${presupuestoId} durante eliminación.`);


      // 2. Eliminar el presupuesto principal
      const deletePresupuestoSql = `DELETE FROM Presupuestos WHERE id = ?`;
      const [result] = await req.db.execute(deletePresupuestoSql, [presupuestoId]);

      // Verificar si se eliminó alguna fila principal
      if (result.affectedRows === 0) {
        await req.db.rollback();
        return res.status(404).json({ error: `No se encontró presupuesto con ID ${presupuestoId} para eliminar.` });
      }
      console.log(`[BACKEND] Presupuesto principal con ID ${presupuestoId} eliminado. Changes: ${result.affectedRows}`);


      // Si todo fue exitoso, confirmar la transacción
      await req.db.commit();
      console.log(`[BACKEND] Transaction committed for deleting budget ID ${presupuestoId}.`);

      // Enviar respuesta de éxito
      res.json({ success: { id: presupuestoId, changes: result.affectedRows } });

    } catch (error) {
      console.error(`[BACKEND] Error al eliminar presupuesto con ID ${presupuestoId}:`, error);
      // En caso de error, hacer rollback
      await req.db.rollback();
      console.error('[BACKEND] Transaction rolled back.');
      let userMessage = 'Error interno del servidor al eliminar presupuesto.';
       // Manejar error si hay registros asociados que impidan la eliminación principal (si no se eliminaron por CASCADE o explícitamente)
       if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            userMessage = 'No se puede eliminar el presupuesto porque tiene registros asociados inesperados.'; // Deberían haberse eliminado ítems, pero como precaución
       }
      res.status(500).json({ error: userMessage });
    }
  });


module.exports = router;