// routes/ventas.js (Revisado - CON COSTO HISTÓRICO EN /filtered Y CON DESCUENTO EN Venta_Items)
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Ventas (Factura A)

// Helper para obtener ítems de venta por Venta_id
async function getVentaItemsByVentaId(db, ventaId) {
    // Fetch items associated with a specific Venta_id
    const [itemRows, itemFields] = await db.execute(`
        SELECT
            vi.id, vi.Venta_id, vi.Producto_id, vi.Cantidad, vi.Precio_Unitario_Venta,
            vi.Descripcion_Personalizada, vi.Precio_Unitario_Personalizada, vi.Cantidad_Personalizada,
            vi.Total_Item, vi.Descuento_Porcentaje, -- <-- AHORA SELECCIONAMOS EL DESCUENTO
            p.codigo, p.Descripcion AS Producto_Descripcion, p.costo_x_rollo, p.costo_x_1000, p.eti_x_rollo
        FROM Venta_Items vi
        LEFT JOIN Productos p ON vi.Producto_id = p.id
        WHERE vi.Venta_id = ?
        ORDER BY vi.id ASC`, [ventaId]);

    // Add 'type' property to each item based on whether Producto_id is null
    // Also parse numerical fields for safety
    const itemsWithType = itemRows.map(item => ({
        ...item,
        Cantidad: parseFloat(item.Cantidad) || null,
        Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
        Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
        Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
        Total_Item: parseFloat(item.Total_Item) || null,
        Descuento_Porcentaje: parseFloat(item.Descuento_Porcentaje) || null, // <-- PARSEAMOS EL DESCUENTO
        type: item.Producto_id !== null ? 'product' : 'custom'
    }));

    return itemsWithType;
}

// Obtener ventas pendientes (para el dashboard/home) - No necesita ítems completos
router.get('/pending', async (req, res) => {
  try {
    const [rows, fields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Total, v.Total_ARS,
          c.Empresa AS Nombre_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      WHERE v.Estado IN ('en maquina', 'pedido', 'listo') OR v.Pago IN ('seña', 'debe')
      ORDER BY v.Fecha DESC, v.id DESC`);

    const parsedVentas = rows.map(venta => ({
        ...venta,
        Total: parseFloat(venta.Total) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));

    res.json(parsedVentas);
  } catch (error) {
    console.error('Error al obtener ventas pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas pendientes.' });
  }
});

// Obtener ventas por Cliente ID, con filtros opcionales de fecha - No necesita ítems completos
router.get('/by-client/:clientId', async (req, res) => {
  const clientId = req.params.clientId;
  const { startDate, endDate } = req.query;

  let sql = `
    SELECT
        v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
        c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
    FROM Ventas v
    JOIN Clientes c ON v.Cliente_id = c.id
    WHERE v.Cliente_id = ?
  `;

  const params = [clientId];
  const whereClauses = [];

  if (startDate && endDate) {
    whereClauses.push(`v.Fecha BETWEEN ? AND ?`);
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClauses.push(`v.Fecha >= ?`);
    params.push(startDate);
  } else if (endDate) {
    whereClauses.push(`v.Fecha <= ?`);
    params.push(endDate);
  }

  if (whereClauses.length > 0) {
    sql += ` AND ` + whereClauses.join(' AND ');
  }

  sql += ` ORDER BY v.Fecha DESC, v.id DESC;`;

  try {
    const [rows, fields] = await req.db.execute(sql, params);
     const parsedVentas = rows.map(venta => ({
        ...venta,
        Subtotal: parseFloat(venta.Subtotal) || null,
        IVA: parseFloat(venta.IVA) || null,
        Total: parseFloat(venta.Total) || null,
        Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));
    res.json(parsedVentas);
  } catch (error) {
    console.error(`Error al obtener ventas para cliente ID ${clientId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas por cliente.' });
  }
});

// Obtener TODAS las ventas, con filtros de fecha E ITEMS (CON COSTO HISTÓRICO Y DESCUENTO)
router.get('/filtered', async (req, res) => {
    const { startDate, endDate } = req.query;

    let sql = `
        SELECT
            v.id, v.Fecha, v.Fact_Nro, v.Cliente_id, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
            c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente,
            JSON_ARRAYAGG(
                 CASE WHEN vi.id IS NOT NULL THEN
                    JSON_OBJECT(
                        'id', vi.id,
                        'Venta_id', vi.Venta_id,
                        'Producto_id', vi.Producto_id,
                        'Cantidad', vi.Cantidad,
                        'Precio_Unitario_Venta', vi.Precio_Unitario_Venta,
                        'Descripcion_Personalizada', vi.Descripcion_Personalizada,
                        'Precio_Unitario_Personalizada', vi.Precio_Unitario_Personalizada,
                        'Cantidad_Personalizada', vi.Cantidad_Personalizada,
                        'Total_Item', vi.Total_Item,
                        'Descuento_Porcentaje', vi.Descuento_Porcentaje, -- <-- SELECCIONAMOS EL DESCUENTO EN EL JSON
                        'type', CASE WHEN vi.Producto_id IS NOT NULL THEN 'product' ELSE 'custom' END,
                        'codigo', p.codigo,
                        'Producto_Descripcion', p.Descripcion,
                        'costo_historico_x_1000', COALESCE(pch.costo_x_1000, p.costo_x_1000),
                        'costo_historico_x_rollo', COALESCE(pch.costo_x_rollo, p.costo_x_rollo)
                    )
                ELSE NULL END
            ) AS items_json
        FROM Ventas v
        JOIN Clientes c ON v.Cliente_id = c.id
        LEFT JOIN Venta_Items vi ON v.id = vi.Venta_id
        LEFT JOIN Productos p ON vi.Producto_id = p.id
        LEFT JOIN Producto_Costo_Historico pch ON vi.Producto_id = pch.Producto_id
            AND pch.Fecha_Valido_Desde = (
                SELECT MAX(pch_inner.Fecha_Valido_Desde)
                FROM Producto_Costo_Historico pch_inner
                WHERE pch_inner.Producto_id = vi.Producto_id
                  AND pch_inner.Fecha_Valido_Desde <= v.Fecha
            )
    `;

    const params = [];
    const whereClauses = [];

    if (startDate && endDate) {
        whereClauses.push(`v.Fecha BETWEEN ? AND ?`);
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClauses.push(`v.Fecha >= ?`);
        params.push(startDate);
    } else if (endDate) {
        whereClauses.push(`v.Fecha <= ?`);
        params.push(endDate);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` GROUP BY v.id`;
    sql += ` ORDER BY v.Fecha DESC, v.id DESC;`;

    try {
        const [rows, fields] = await req.db.execute(sql, params);

        const ventasWithItems = rows.map(row => {
             const parsedVentaData = {
                 ...row,
                 Subtotal: parseFloat(row.Subtotal) || null,
                 IVA: parseFloat(row.IVA) || null,
                 Total: parseFloat(row.Total) || null,
                 Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || null,
                 Total_ARS: parseFloat(row.Total_ARS) || null,
             };

             let items = [];
             if (row.items_json) {
                 try {
                    const parsedJson = Array.isArray(row.items_json) ? row.items_json : JSON.parse(row.items_json);
                    if (Array.isArray(parsedJson)) {
                         items = parsedJson
                           .filter(item => item !== null)
                           .map(item => ({
                               ...item,
                               Cantidad: parseFloat(item.Cantidad) || null,
                               Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
                               Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
                               Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
                               Total_Item: parseFloat(item.Total_Item) || null,
                               Descuento_Porcentaje: parseFloat(item.Descuento_Porcentaje) || null, // <-- PARSEAMOS EL DESCUENTO DEL JSON
                               costo_historico_x_1000: parseFloat(item.costo_historico_x_1000) || null,
                               costo_historico_x_rollo: parseFloat(item.costo_historico_x_rollo) || null,
                           }));
                    } else {
                        console.warn(`items_json for venta ID ${row.id} was not an array:`, parsedJson);
                    }
                 } catch (parseError) {
                      console.error(`Error parsing items_json for venta ID ${row.id}:`, parseError, 'JSON string:', row.items_json);
                      items = [];
                  }
             }

             delete parsedVentaData.items_json;

             return { ...parsedVentaData, items: items };
         });

        res.json(ventasWithItems);
    } catch (error) {
        console.error('Error al obtener todas las ventas filtradas con costo histórico y descuento:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener listado de ventas con costo histórico y descuento.' });
    }
});


// Obtener las 10 ventas más recientes (para la lista principal) - No necesita ítems completos
router.get('/', async (req, res) => {
  try {
    const [rows, fields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      ORDER BY v.Fecha DESC, v.id DESC
      LIMIT 10`);

    const parsedVentas = rows.map(venta => ({
       ...venta,
       Subtotal: parseFloat(venta.Subtotal) || null,
       IVA: parseFloat(venta.IVA) || null,
       Total: parseFloat(venta.Total) || null,
       Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
       Total_ARS: parseFloat(venta.Total_ARS) || null,
   }));

    res.json(parsedVentas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas.' });
  }
});

// Obtener una venta específica por su ID, incluyendo sus ítems (CON DESCUENTO)
router.get('/:id', async (req, res) => {
  const ventaId = req.params.id;

  try {
    // Start transaction
    await req.db.beginTransaction();

    // Fetch main sale data
    const [ventaRows, ventaFields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Cliente_id, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      WHERE v.id = ?`, [ventaId]);

    if (ventaRows.length === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `Venta con ID ${ventaId} no encontrada.` });
    }

    const ventaData = ventaRows[0];
    // Fetch associated items using the helper function (now includes discount)
    const itemRows = await getVentaItemsByVentaId(req.db, ventaId);

    // Commit transaction
    await req.db.commit();

     const parsedVentaData = {
        ...ventaData,
        Subtotal: parseFloat(ventaData.Subtotal) || null,
        IVA: parseFloat(ventaData.IVA) || null,
        Total: parseFloat(ventaData.Total) || null,
        Cotizacion_Dolar: parseFloat(ventaData.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(ventaData.Total_ARS) || null,
    };

    // Combine main sale data with its items
    const fullVentaData = {
      ...parsedVentaData,
      items: itemRows || [] // itemRows are already parsed by the helper and include discount
    };

    res.json(fullVentaData);

  } catch (error) {
    console.error(`Error al obtener venta con ID ${ventaId}:`, error);
    await req.db.rollback();
    res.status(500).json({ error: 'Error interno del servidor al obtener venta.' });
  }
});


// Agregar una nueva venta, incluyendo ítems y actualizando stock (GUARDA DESCUENTO)
router.post('/', async (req, res) => {
  const {
    Fecha, Cliente_id, Estado, Pago, Subtotal, IVA, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;
  console.log('[Backend] Items recibidos en POST /ventas:', items);

  // Validation for required fields (assuming discount can be 0)
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para Ventas.' });
  }
   // Optional validation for numerical fields
   if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
   if (IVA !== undefined && IVA !== null && IVA !== '' && isNaN(parseFloat(IVA))) { return res.status(400).json({ error: 'IVA inválido.' }); }
   if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
   if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }


  try {
    await req.db.beginTransaction();

    // 1. Generate the next sequential Fact_Nro
    let nextNumber = 1;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
        const [rows] = await req.db.execute('SELECT Fact_Nro FROM Ventas ORDER BY CAST(Fact_Nro AS UNSIGNED) DESC, Fact_Nro DESC LIMIT 1');
        let lastNumericValue = 0;
        if (rows.length > 0 && rows[0].Fact_Nro) {
             const parsedLast = parseInt(rows[0].Fact_Nro, 10);
             if (!isNaN(parsedLast)) {
                 lastNumericValue = parsedLast;
             }
        }
         if (attempts === 0) {
              nextNumber = lastNumericValue + 1;
         } else {
              nextNumber++;
         }

        const generatedFactNro = String(nextNumber);
        const [existingRows] = await req.db.execute('SELECT Fact_Nro FROM Ventas WHERE Fact_Nro = ?', [generatedFactNro]);

        if (existingRows.length === 0) {
            isUnique = true;
        } else {
            console.warn(`[Backend] Generated Fact_Nro ${generatedFactNro} already exists. Retrying.`);
            attempts++;
        }
    }

    if (!isUnique) {
        throw new Error('Failed to generate a unique Fact_Nro after multiple attempts.');
    }

    const finalGeneratedFactNro = String(nextNumber);

    // 2. Insert the main Venta record
    const insertVentaSql = `
      INSERT INTO Ventas (Fecha, Fact_Nro, Cliente_id, Estado, Pago, Subtotal, IVA, Total, Cotizacion_Dolar, Total_ARS)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

    const ventaValues = [
      Fecha,
      finalGeneratedFactNro,
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      IVA !== null && IVA !== '' && !isNaN(parseFloat(IVA)) ? parseFloat(IVA) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
    ];

    const [result] = await req.db.execute(insertVentaSql, ventaValues);
    const nuevaVentaId = result.insertId;

    // 3. Insert the items associated with the new Venta (INCLUYE DESCUENTO)
    if (items.length > 0) {
      // Añadimos Descuento_Porcentaje a la sentencia INSERT de items
      const insertItemSql = `
        INSERT INTO Venta_Items (Venta_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item, Descuento_Porcentaje)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;

      const stockUpdates = [];

      for (const item of items) {
          let productoIdToSave = null;
          let cantidadProductoToSave = null;
          let precioUnitarioVentaProductoToSave = null;
          let descripcionPersonalizadaToSave = null;
          let precioUnitarioPersonalizadaToSave = null;
          let cantidadPersonalizadaToSave = null;
          // Asegurarnos de obtener el descuento del item
          let descuentoPorcentajeToSave = item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : 0.00;

          // Re-calculamos Total_Item en el backend para asegurar consistencia
          let totalItemToSave = 0;

          if (item.type === 'product') {
              productoIdToSave = item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null;
              cantidadProductoToSave = item.Cantidad !== null && item.Cantidad !== undefined ? parseFloat(item.Cantidad) : null;
              precioUnitarioVentaProductoToSave = item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined ? parseFloat(item.Precio_Unitario_Venta) : null;

              // Calcular Total_Item para producto con descuento
              if (cantidadProductoToSave !== null && precioUnitarioVentaProductoToSave !== null) {
                   const subtotalProducto = cantidadProductoToSave * precioUnitarioVentaProductoToSave;
                   const effectiveDescuento = Math.max(0, Math.min(100, descuentoPorcentajeToSave));
                   totalItemToSave = subtotalProducto * (1 - effectiveDescuento / 100);
              }


              // Add to stock updates only for product items with valid quantity
              if (productoIdToSave !== null && cantidadProductoToSave > 0) {
                 stockUpdates.push({
                     Producto_id: productoIdToSave,
                     Cantidad_Vendida: cantidadProductoToSave
                 });
              }
          } else if (item.type === 'custom') {
              descripcionPersonalizadaToSave = item.Descripcion_Personalizada || null;
              precioUnitarioPersonalizadaToSave = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined ? parseFloat(item.Precio_Unitario_Personalizada) : null;
              cantidadPersonalizadaToSave = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? parseFloat(item.Cantidad_Personalizada) : null;

               // Calcular Total_Item para item personalizado (sin descuento en este ejemplo)
               if (cantidadPersonalizadaToSave !== null && precioUnitarioPersonalizadaToSave !== null) {
                    totalItemToSave = cantidadPersonalizadaToSave * precioUnitarioPersonalizadaToSave;
               }
               // Si ítems personalizados tuvieran descuento, calcularlo aquí:
               // const descuentoPersonalizado = item.Descuento_Porcentaje_Personalizado !== undefined && item.Descuento_Porcentaje_Personalizado !== null && item.Descuento_Porcentaje_Personalizado !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje_Personalizado)) ? parseFloat(item.Descuento_Porcentaje_Personalizado) : 0.00;
               // if (cantidadPersonalizadaToSave !== null && precioUnitarioPersonalizadaToSave !== null) {
               //    const subtotalPersonalizado = cantidadPersonalizadaToSave * precioUnitarioPersonalizadaToSave;
               //    const effectiveDescuentoPers = Math.max(0, Math.min(100, descuentoPersonalizado));
               //    totalItemToSave = subtotalPersonalizado * (1 - effectiveDescuentoPers / 100);
               // }
          }

          // Add values for this item to the batch insert array (INCLUIMOS DESCUENTO Y TOTAL CALCULADO EN BACKEND)
          await req.db.execute(insertItemSql, [
              nuevaVentaId,
              productoIdToSave,
              cantidadProductoToSave,
              precioUnitarioVentaProductoToSave,
              descripcionPersonalizadaToSave,
              precioUnitarioPersonalizadaToSave,
              cantidadPersonalizadaToSave,
              parseFloat(totalItemToSave.toFixed(2)), // Guardar Total_Item calculado en backend
              descuentoPorcentajeToSave, // <-- GUARDAMOS EL DESCUENTO
          ]);
      }

       // Update stock for sold product items
       const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad - ? WHERE Producto_id = ?;`;
       for (const update of stockUpdates) {
           try {
                const [stockResult] = await req.db.execute(updateStockSql, [update.Cantidad_Vendida, update.Producto_id]);
                 if (stockResult.affectedRows === 0) {
                      console.warn(`No se encontró entrada de stock para Producto_id ${update.Producto_id} al vender. Stock no actualizado.`);
                 }
           } catch (stockError) {
                console.error(`Error al actualizar stock para Producto_id ${update.Producto_id}:`, stockError);
                // Consider rolling back transaction if stock update fails critically
           }
       }
    }

    await req.db.commit();

    res.status(201).json({ success: { id: nuevaVentaId, Fact_Nro: finalGeneratedFactNro } });

  } catch (error) {
    console.error('Error al agregar venta:', error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al agregar venta.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Fact_Nro')) {
          userMessage = 'Error: El número de factura generado ya existe. Intente de nuevo.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     } else if (error.message.includes('Failed to generate a unique Fact_Nro')) {
          userMessage = error.message;
     } else if (error.code === 'ER_BAD_FIELD_ERROR') {
          userMessage = 'Error en la base de datos: Falta la columna de descuento en Venta_Items o hay un error de sintaxis.';
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar una venta existente por su ID (Actualiza DESCUENTO y re-calcula Total_Item)
router.put('/:id', async (req, res) => {
  const ventaId = req.params.id;
  const {
    Fecha, Cliente_id, Estado, Pago, Subtotal, IVA, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;

  // Validation
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para actualizar Ventas.' });
  }
    if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
    if (IVA !== undefined && IVA !== null && IVA !== '' && isNaN(parseFloat(IVA))) { return res.status(400).json({ error: 'IVA inválido.' }); }
    if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
    if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }

  try {
    await req.db.beginTransaction();

    // 1. Update main sale details (excluding Fact_Nro)
    const updateVentaSql = `
      UPDATE Ventas
      SET
        Fecha = ?, Cliente_id = ?, Estado = ?, Pago = ?, Subtotal = ?, IVA = ?, Total = ?,
        Cotizacion_Dolar = ?, Total_ARS = ?
      WHERE id = ?;`;

    const ventaValues = [
      Fecha,
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      IVA !== null && IVA !== '' && !isNaN(parseFloat(IVA)) ? parseFloat(IVA) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
      ventaId
    ];

    const [updateResult] = await req.db.execute(updateVentaSql, ventaValues);

     if (updateResult.affectedRows === 0) {
          await req.db.rollback();
          return res.status(404).json({ error: `No se encontró venta con ID ${ventaId} para actualizar.` });
     }

    // --- Stock Reversal Logic ---
    // 2. Get existing product items BEFORE deleting them to calculate stock reversal
    const [existingProductItems] = await req.db.execute(
        `SELECT Producto_id, Cantidad FROM Venta_Items WHERE Venta_id = ? AND Producto_id IS NOT NULL`,
        [ventaId]
    );

    // 3. Revert stock based on OLD items
    const stockAdjustmentSql = `UPDATE Stock SET Cantidad = Cantidad + ? WHERE Producto_id = ?;`;
    for (const oldItem of existingProductItems) {
        try {
            await req.db.execute(stockAdjustmentSql, [oldItem.Cantidad, oldItem.Producto_id]);
        } catch (stockError) {
            console.error(`Error reverting stock for Producto_id ${oldItem.Producto_id} (Venta Edit):`, stockError);
            // Consider rollback if critical
        }
    }


    // 4. Delete existing items for this Venta
    const deleteItemsSql = `DELETE FROM Venta_Items WHERE Venta_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaId]);

    // 5. Insert the NEW items provided in the request body (INCLUYE DESCUENTO y re-calcula Total_Item)
    const insertItemSql = `
      INSERT INTO Venta_Items (Venta_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item, Descuento_Porcentaje)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`; // <-- Añadimos Descuento_Porcentaje aquí


    const newStockUpdates = []; // Stock updates based on NEW items

    if (items.length > 0) {
        for (const item of items) {
            // Prepare item data (same logic as in POST)
            let productoIdToSave = null;
            let cantidadProductoToSave = null;
            let precioUnitarioVentaProductoToSave = null;
            let descripcionPersonalizadaToSave = null;
            let precioUnitarioPersonalizadaToSave = null;
            let cantidadPersonalizadaToSave = null;
             // Asegurarnos de obtener el descuento del item
            let descuentoPorcentajeToSave = item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : 0.00;

            // Re-calculamos Total_Item en el backend para asegurar consistencia
            let totalItemToSave = 0;

            if (item.type === 'product') {
                productoIdToSave = item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null;
                cantidadProductoToSave = item.Cantidad !== null && item.Cantidad !== undefined ? parseFloat(item.Cantidad) : null;
                precioUnitarioVentaProductoToSave = item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined ? parseFloat(item.Precio_Unitario_Venta) : null;

                 // Calcular Total_Item para producto con descuento
                if (cantidadProductoToSave !== null && precioUnitarioVentaProductoToSave !== null) {
                    const subtotalProducto = cantidadProductoToSave * precioUnitarioVentaProductoToSave;
                    const effectiveDescuento = Math.max(0, Math.min(100, descuentoPorcentajeToSave));
                    totalItemToSave = subtotalProducto * (1 - effectiveDescuento / 100);
               }

                // Add to NEW stock updates
                if (productoIdToSave !== null && cantidadProductoToSave > 0) {
                    newStockUpdates.push({
                        Producto_id: productoIdToSave,
                        Cantidad_Vendida: cantidadProductoToSave
                    });
                }
            } else if (item.type === 'custom') {
                descripcionPersonalizadaToSave = item.Descripcion_Personalizada || null;
                precioUnitarioPersonalizadaToSave = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined ? parseFloat(item.Precio_Unitario_Personalizada) : null;
                cantidadPersonalizadaToSave = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? parseFloat(item.Cantidad_Personalizada) : null;

                // Calcular Total_Item para item personalizado (sin descuento en este ejemplo)
                if (cantidadPersonalizadaToSave !== null && precioUnitarioPersonalizadaToSave !== null) {
                    totalItemToSave = cantidadPersonalizadaToSave * precioUnitarioPersonalizadaToSave;
               }
               // Si ítems personalizados tuvieran descuento, calcularlo aquí:
               // const descuentoPersonalizado = item.Descuento_Porcentaje_Personalizado !== undefined && item.Descuento_Porcentaje_Personalizado !== null && item.Descuento_Porcentaje_Personalizado !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje_Personalizado)) ? parseFloat(item.Descuento_Porcentaje_Personalizado) : 0.00;
               // if (cantidadPersonalizadaToSave !== null && precioUnitarioPersonalizadaToSave !== null) {
               //    const subtotalPersonalizado = cantidadPersonalizadaToSave * precioUnitarioPersonalizadaToSave;
               //    const effectiveDescuentoPers = Math.max(0, Math.min(100, descuentoPersonalizado));
               //    totalItemToSave = subtotalPersonalizado * (1 - effectiveDescuentoPers / 100);
               // }
            }

            // Execute insert for the new item (INCLUIMOS DESCUENTO Y TOTAL CALCULADO EN BACKEND)
             await req.db.execute(insertItemSql, [
                 ventaId, // Link to the updated Venta ID
                 productoIdToSave,
                 cantidadProductoToSave,
                 precioUnitarioVentaProductoToSave,
                 descripcionPersonalizadaToSave,
                 precioUnitarioPersonalizadaToSave,
                 cantidadPersonalizadaToSave,
                 parseFloat(totalItemToSave.toFixed(2)), // Guardar Total_Item calculado en backend
                 descuentoPorcentajeToSave, // <-- GUARDAMOS EL DESCUENTO
             ]);
        }
    }

    // 6. Subtract stock based on NEW items
    const stockSubtractionSql = `UPDATE Stock SET Cantidad = Cantidad - ? WHERE Producto_id = ?;`;
    for (const newItemUpdate of newStockUpdates) {
        try {
            await req.db.execute(stockSubtractionSql, [newItemUpdate.Cantidad_Vendida, newItemUpdate.Producto_id]);
        } catch (stockError) {
            console.error(`Error subtracting new stock for Producto_id ${newItemUpdate.Producto_id} (Venta Edit):`, stockError);
            // Consider rollback if critical
        }
    }

    await req.db.commit();

    res.json({ success: { id: ventaId, changes: updateResult.affectedRows } });

  } catch (error) {
    console.error(`Error al actualizar venta con ID ${ventaId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al actualizar venta.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     } else if (error.code === 'ER_BAD_FIELD_ERROR') {
          userMessage = 'Error en la base de datos: Falta la columna de descuento en Venta_Items o hay un error de sintaxis.';
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar el estado y/o pago de una venta pendiente por su ID - No necesita descuento de items
router.put('/pending/:id', async (req, res) => {
    const ventaId = req.params.id;
    const { Estado, Pago } = req.body;

    const updates = [];
    const values = [];

    if (Estado === undefined && Pago === undefined) {
        return res.status(400).json({ error: 'No se proporcionó Estado o Pago para actualizar.' });
    }
     if (Estado !== undefined && (Estado === null || Estado === '')) {
         return res.status(400).json({ error: 'El campo Estado no puede estar vacío si se proporciona.' });
     }
     if (Pago !== undefined && (Pago === null || Pago === '')) {
         return res.status(400).json({ error: 'El campo Pago no puede estar vacío si se proporciona.' });
     }

    if (Estado !== undefined) {
        updates.push('Estado = ?');
        values.push(Estado);
    }
    if (Pago !== undefined) {
        updates.push('Pago = ?');
        values.push(Pago);
    }

    let sql = `UPDATE Ventas SET ${updates.join(', ')} WHERE id = ?;`;
    values.push(ventaId);

    try {
        const [result] = await req.db.execute(sql, values);

        if (result.affectedRows === 0) {
             return res.status(404).json({ error: `No se encontró venta pendiente con ID ${ventaId} para actualizar.` });
        }

        res.json({ success: { id: ventaId, changes: result.affectedRows } });

    } catch (error) {
        console.error(`Error al actualizar venta pendiente con ID ${ventaId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar venta pendiente.' });
    }
});


// Eliminar una venta por ID, incluyendo sus ítems y revirtiendo stock - No necesita descuento de items para eliminar
router.delete('/:id', async (req, res) => {
  const ventaId = req.params.id;

  try {
    await req.db.beginTransaction();

    // 1. Get associated product items to revert stock
    const [productItemsToRevert, fields] = await req.db.execute(`
        SELECT Producto_id, Cantidad
        FROM Venta_Items
        WHERE Venta_id = ? AND Producto_id IS NOT NULL`, [ventaId]);

    // 2. Revert stock quantities
    const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad + ? WHERE Producto_id = ?;`;
    for (const item of productItemsToRevert) {
        try {
             const [stockResult] = await req.db.execute(updateStockSql, [item.Cantidad, item.Producto_id]);
             if (stockResult.affectedRows === 0) {
                  console.warn(`No se encontró entrada de stock para Producto_id ${item.Producto_id} al eliminar venta. Stock no revertido completamente.`);
             }
        } catch (stockError) {
             console.error(`Error al revertir stock para Producto_id ${item.Producto_id}:`, stockError);
             // Consider rolling back if stock reversal is critical
        }
    }

    // 3. Delete associated items
    const deleteItemsSql = `DELETE FROM Venta_Items WHERE Venta_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaId]);

    // 4. Delete the main sale record
    const deleteVentaSql = `DELETE FROM Ventas WHERE id = ?`;
    const [result] = await req.db.execute(deleteVentaSql, [ventaId]);

    if (result.affectedRows === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `No se encontró venta con ID ${ventaId} para eliminar.` });
    }

    await req.db.commit();

    res.json({ success: { id: ventaId, changes: result.affectedRows } });

  } catch (error) {
    console.error(`Error al eliminar venta con ID ${ventaId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al eliminar venta.';
     if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          userMessage = 'Error: No se puede eliminar la venta debido a registros asociados inesperados.';
     } else if (error.code === 'ER_BAD_FIELD_ERROR') {
           userMessage = 'Error en la base de datos: Falta la columna de descuento en Venta_Items o hay un error de sintaxis.';
     }
    res.status(500).json({ error: userMessage });
  }
});


module.exports = router;