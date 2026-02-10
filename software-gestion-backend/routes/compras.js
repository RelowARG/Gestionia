// routes/compras.js
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Compras

// Helper para obtener ítems de compra por Compra_id
async function getCompraItemsByCompraId(db, compraId) {
    const [itemRows, itemFields] = await db.execute(`
        SELECT
            ci.id, ci.Compra_id, ci.Producto_id, ci.Cantidad, ci.Precio_Unitario, ci.Total_Item,
            p.codigo, p.Descripcion
        FROM Compra_Items ci
        JOIN Productos p ON ci.Producto_id = p.id
        WHERE ci.Compra_id = ?
        ORDER BY ci.id ASC`, [compraId]);

    // Safely parse numerical values for items
    const parsedItems = itemRows.map(item => ({
        ...item,
        Cantidad: item.Cantidad !== null && item.Cantidad !== undefined && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null,
        Precio_Unitario: item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario) : null,
        Total_Item: item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null,
    }));

    return parsedItems;
}

// Helper para obtener una compra principal por ID (sin ítems)
async function getCompraByIdBasic(db, compraId) {
    const [compraRows, compraFields] = await db.execute(`
        SELECT
            c.id, c.Fecha, c.Fact_Nro, c.Proveedor_id, c.Estado, c.MontoTotal, c.Cotizacion_Dolar, c.Total_ARS, c.Pago,
            p.Empresa AS Nombre_Proveedor, p.Cuit AS Cuit_Proveedor
        FROM Compras c
        JOIN Proveedores p ON c.Proveedor_id = p.id
        WHERE c.id = ?`, [compraId]);

    if (compraRows.length === 0) {
        return null;
    }

    const compraData = compraRows[0];
    // Safely parse numerical values for the main purchase data
    const parsedCompraData = {
        ...compraData,
        MontoTotal: compraData.MontoTotal !== null && compraData.MontoTotal !== undefined && !isNaN(parseFloat(compraData.MontoTotal)) ? parseFloat(compraData.MontoTotal) : null,
        Cotizacion_Dolar: compraData.Cotizacion_Dolar !== null && compraData.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(compraData.Cotizacion_Dolar)) ? parseFloat(compraData.Cotizacion_Dolar) : null,
        Total_ARS: compraData.Total_ARS !== null && compraData.Total_ARS !== undefined && !isNaN(parseFloat(compraData.Total_ARS)) ? parseFloat(compraData.Total_ARS) : null,
        Pago: compraData.Pago || 'deuda', // Ensure default value
        Cuit_Proveedor: compraData.Cuit_Proveedor || 'N/A' // Ensure default value
    };

    return parsedCompraData;
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


// Obtener compras pendientes (estado 'pedido' o pago 'deuda') - MOVED THIS ROUTE UP
// THIS ROUTE MUST BE BEFORE '/:id'
router.get('/pending', async (req, res) => {
  try {
    // Consulta para obtener compras con estado 'pedido' o pago 'deuda'
    const [rows, fields] = await req.db.execute(`
      SELECT
          c.id, c.Fecha, c.Fact_Nro, c.Estado, c.MontoTotal, c.Pago,
          p.Empresa AS Nombre_Proveedor
      FROM Compras c
      JOIN Proveedores p ON c.Proveedor_id = p.id
      WHERE c.Estado = 'pedido' OR c.Pago = 'deuda'
      ORDER BY c.Fecha DESC, c.id DESC;`);

    // Parsear los campos numéricos
    const pendingCompras = rows.map(row => ({
        ...row,
        MontoTotal: parseFloat(row.MontoTotal) || 0, // Convertir a float, default 0
        Pago: row.Pago || 'deuda', // Asegurar valor por defecto
        // Total_ARS y Cotizacion_Dolar no están en esta consulta, no necesitan parsing aquí
    }));


    res.json(pendingCompras);
  } catch (error) {
    console.error('Error al obtener compras pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener compras pendientes.' });
  }
});

// Obtener compras por Proveedor ID, con filtros opcionales de fecha - MOVED THIS ROUTE UP
// THIS ROUTE MUST BE BEFORE '/:id'
router.get('/by-proveedor/:proveedorId', async (req, res) => {
  const proveedorId = req.params.proveedorId;
  const { startDate, endDate } = req.query; // Obtener filtros de fecha

  let sql = `
    SELECT
        c.id, c.Fecha, c.Fact_Nro, c.Estado, c.MontoTotal, c.Cotizacion_Dolar, c.Total_ARS, c.Pago,
        p.Empresa AS Nombre_Proveedor, p.Cuit AS Cuit_Proveedor
        -- Items no incluidos en listado por proveedor por eficiencia.
    FROM Compras c
    JOIN Proveedores p ON c.Proveedor_id = p.id
    WHERE c.Proveedor_id = ?
  `;

  const params = [proveedorId];
  const whereClauses = [];

  // Añadir filtros de fecha si están presentes
  if (startDate && endDate) {
    whereClauses.push(`c.Fecha BETWEEN ? AND ?`);
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClauses.push(`c.Fecha >= ?`);
    params.push(startDate);
  } else if (endDate) {
    whereClauses.push(`c.Fecha <= ?`);
    params.push(endDate);
  }

  if (whereClauses.length > 0) {
    sql += ` AND ` + whereClauses.join(' AND ');
  }

  sql += ` ORDER BY c.Fecha DESC, c.id DESC;`; // Ordenar resultados

  try {
    const [rows, fields] = await req.db.execute(sql, params);

     // Parsear los campos numéricos
    const comprasParsed = rows.map(row => ({
        ...row,
        MontoTotal: parseFloat(row.MontoTotal) || 0, // Convertir a float, default 0
        Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || 0, // Convertir a float, default 0
        Total_ARS: parseFloat(row.Total_ARS) || 0, // Convertir a float, default 0
        Pago: row.Pago || 'deuda', // Asegurar valor por defecto
        Cuit_Proveedor: row.Cuit_Proveedor || 'N/A' // Asegurar valor por defecto
    }));

    res.json(comprasParsed); // Enviar las compras encontradas
  } catch (error) {
    console.error(`Error al obtener compras para proveedor ID ${proveedorId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al obtener compras por proveedor.' });
  }
});

// Obtener TODAS las compras, con filtros de fecha y detalles de ítems
// Esta ruta replica la lógica de get-all-compras-filtered que incluía ítems.
// THIS ROUTE MUST BE BEFORE '/:id'
router.get('/filtered', async (req, res) => {
    const { startDate, endDate } = req.query; // Obtener filtros de fecha

    let sql = `
        SELECT
            c.id, c.Fecha, c.Fact_Nro, c.Proveedor_id, c.Estado, c.MontoTotal, c.Cotizacion_Dolar, c.Total_ARS, c.Pago,
            p.Empresa AS Nombre_Proveedor, p.Cuit AS Cuit_Proveedor,
            -- Usamos JSON_ARRAYAGG para agregar los ítems como un array JSON
            -- JSON_OBJECT para cada ítem
             -- *** CORRECCIÓN PARA MANEJAR ITEMS NULL ***
            IF(COUNT(ci.id) > 0,
               JSON_ARRAYAGG(
                   JSON_OBJECT(
                       'id', ci.id,
                       'Compra_id', ci.Compra_id,
                       'Producto_id', ci.Producto_id,
                       'Cantidad', ci.Cantidad,
                       'Precio_Unitario', ci.Precio_Unitario,
                       'Total_Item', ci.Total_Item,
                       'codigo', pr.codigo,
                       'Descripcion', pr.Descripcion
                   )
               ),
               JSON_ARRAY() -- Devolver un array vacío si no hay ítems
            ) AS items_json
        FROM Compras c
        JOIN Proveedores p ON c.Proveedor_id = p.id
        LEFT JOIN Compra_Items ci ON c.id = ci.Compra_id
        LEFT JOIN Productos pr ON ci.Producto_id = pr.id -- Unir con Productos para detalles de ítems
    `;


    const params = [];
    const whereClauses = [];

    // Añadir filtros de fecha si están presentes
    if (startDate && endDate) {
        whereClauses.push(`c.Fecha BETWEEN ? AND ?`);
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClauses.push(`c.Fecha >= ?`);
        params.push(startDate);
    } else if (endDate) {
        whereClauses.push(`c.Fecha <= ?`);
        params.push(endDate);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` GROUP BY c.id`; // Agrupar por compra para que JSON_ARRAYAGG funcione
    sql += ` ORDER BY c.Fecha DESC, c.id DESC;`; // Ordenar resultados

    try {
        const [rows, fields] = await req.db.execute(sql, params);

        // Procesar los resultados para parsear el JSON de ítems y los números
        const comprasWithItems = rows.map(row => {
             // Safely parse numerical values for the main purchase data
             const parsedCompraData = {
                 ...row,
                 MontoTotal: row.MontoTotal !== null && row.MontoTotal !== undefined && !isNaN(parseFloat(row.MontoTotal)) ? parseFloat(row.MontoTotal) : null,
                 Cotizacion_Dolar: row.Cotizacion_Dolar !== null && row.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(row.Cotizacion_Dolar)) ? parseFloat(row.Cotizacion_Dolar) : null,
                 Total_ARS: row.Total_ARS !== null && row.Total_ARS !== undefined && !isNaN(parseFloat(row.Total_ARS)) ? parseFloat(row.Total_ARS) : null,
                 Pago: row.Pago || 'deuda', // Ensure default value
                 Cuit_Proveedor: row.Cuit_Proveedor || 'N/A' // Ensure default value
             };

            // El JSON de items ya viene como un array de la base de datos (o un array vacío)
            const items = (row.items_json || []).map(item => ({
                ...item,
                Cantidad: item.Cantidad !== null && item.Cantidad !== undefined && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null,
                Precio_Unitario: item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario) : null,
                Total_Item: item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null,
            }));

            // Remover la propiedad _json si no la quieres en la respuesta final
            delete parsedCompraData.items_json;

            return {
                ...parsedCompraData,
                items: items
            };
        });


        res.json(comprasWithItems); // Enviar las compras encontradas con ítems
    } catch (error) {
        console.error('Error al obtener todas las compras filtradas:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener listado de compras.' });
    }
});


// Obtener las 10 compras más recientes
router.get('/', async (req, res) => {
  try {
    const [rows, fields] = await req.db.execute(`
      SELECT
          c.id, c.Fecha, c.Fact_Nro, c.Estado, c.MontoTotal, c.Cotizacion_Dolar, c.Total_ARS, c.Pago,
          p.Empresa AS Nombre_Proveedor,
          p.Cuit AS Cuit_Proveedor
      FROM Compras c
      JOIN Proveedores p ON c.Proveedor_id = p.id
      ORDER BY c.Fecha DESC, c.id DESC
      LIMIT 10`); // Limitar a las últimas 10 compras

    // Parsear los campos numéricos y asegurar formato de fecha si es necesario (aunque la DB ya debería dar YYYY-MM-DD)
    const comprasParsed = rows.map(row => ({
        ...row,
        MontoTotal: parseFloat(row.MontoTotal) || 0, // Convertir a float, default 0 if null/invalid
        Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || 0, // Convertir a float, default 0
        Total_ARS: parseFloat(row.Total_ARS) || 0, // Convertir a float, default 0
        Pago: row.Pago || 'deuda', // Asegurar valor por defecto si es null
        Cuit_Proveedor: row.Cuit_Proveedor || 'N/A' // Asegurar valor por defecto si es null
        // Fecha ya debería venir en formato YYYY-MM-DD de la DB si el tipo de columna es DATE
    }));

    res.json(comprasParsed);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener compras.' });
  }
});

// Obtener una compra específica por su ID, incluyendo sus ítems
router.get('/:id', async (req, res) => {
  const compraId = req.params.id;

  try {
    await req.db.beginTransaction(); // Iniciar transacción

    // Consulta para obtener los datos de la compra principal usando el helper
    const compraData = await getCompraByIdBasic(req.db, compraId);

    if (!compraData) {
      await req.db.rollback();
      return res.status(404).json({ error: `Compra con ID ${compraId} no encontrada.` });
    }

    // Obtener los ítems asociados a esta compra usando la función helper
    const itemRows = await getCompraItemsByCompraId(req.db, compraId); // getCompraItemsByCompraId already parses items

    await req.db.commit(); // Confirmar transacción

    // Combinar los datos del presupuesto principal con sus ítems
    const fullCompraData = {
      ...compraData, // compraData is already parsed by getCompraByIdBasic
      items: itemRows || [] // itemRows are already parsed by getCompraItemsByCompraId
    };

    res.json(fullCompraData);

  } catch (error) {
    console.error(`Error al obtener compra con ID ${compraId}:`, error);
    await req.db.rollback(); // Hacer rollback en caso de error
    res.status(500).json({ error: 'Error interno del servidor al obtener compra.' });
  }
});


// Agregar una nueva compra, incluyendo ítems y gestionando movimiento de CashFlow y actualización de precio
router.post('/', async (req, res) => {
  // Obtener los datos de la compra y sus ítems del cuerpo de la solicitud
  const {
    Fecha, Fact_Nro, Proveedor_id, Estado, MontoTotal, Cotizacion_Dolar, Total_ARS, Pago,
    items // Array de ítems de producto
  } = req.body;

  // Validación básica (similar al manejador IPC)
  if (!Fecha || !Fact_Nro || !Proveedor_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
      return res.status(400).json({ error: 'Fecha, Fact Nro, Proveedor, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son campos obligatorios para Compras.' });
  }
  if (MontoTotal !== undefined && MontoTotal !== null && MontoTotal !== '' && isNaN(parseFloat(MontoTotal))) {
      return res.status(400).json({ error: 'Monto Total debe ser un número válido si se proporciona.' });
  }
   if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) {
       return res.status(400).json({ error: 'Total ARS debe ser un número válido si se proporciona.' });
   }

    // Formatear la fecha a YYYY-MM-DD
    const formattedFecha = formatDateToYYYYMMDD(Fecha);
    if (!formattedFecha) {
        return res.status(400).json({ error: 'Formato de fecha no válido.' });
    }


  try {
    // Iniciar una transacción
    await req.db.beginTransaction();

    // 1. Insertar la compra principal
    const insertCompraSql = `
      INSERT INTO Compras (Fecha, Fact_Nro, Proveedor_id, Estado, MontoTotal, Cotizacion_Dolar, Total_ARS, Pago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;

    const compraValues = [
      formattedFecha, // Usar la fecha formateada
      Fact_Nro,
      parseInt(Proveedor_id, 10),
      Estado,
      MontoTotal !== '' && MontoTotal !== null ? parseFloat(MontoTotal) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== '' && Total_ARS !== null ? parseFloat(Total_ARS) : null,
      Pago
    ];

    const [result] = await req.db.execute(insertCompraSql, compraValues);
    const nuevaCompraId = result.insertId; // Obtener el ID generado para la compra principal

    // 2. Insertar los ítems de la compra - Insertar uno por uno
    const insertItemSql = `
      INSERT INTO Compra_Items (Compra_id, Producto_id, Cantidad, Precio_Unitario, Total_Item)
      VALUES (?, ?, ?, ?, ?);`;

    // Lógica para actualizar stock - Definir la sentencia SQL de stock aquí
    const updateStockSql = `
        INSERT INTO Stock (Producto_id, Cantidad)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
        Cantidad = Cantidad + VALUES(Cantidad);`;

    for (const item of items) {
        // Validar cada ítem antes de intentar insertarlo
        if (
            item.Producto_id === undefined || item.Producto_id === null || item.Producto_id === '' ||
            item.Cantidad === undefined || item.Cantidad === null || isNaN(parseFloat(item.Cantidad)) || parseFloat(item.Cantidad) <= 0 ||
            // Permitir Precio_Unitario ser 0 o null/undefined
            (item.Precio_Unitario !== undefined && item.Precio_Unitario !== null && item.Precio_Unitario !== '' && (isNaN(parseFloat(item.Precio_Unitario)) || parseFloat(item.Precio_Unitario) < 0)) ||
            // Permitir Total_Item ser 0 o null/undefined
            (item.Total_Item !== undefined && item.Total_Item !== null && item.Total_Item !== '' && (isNaN(parseFloat(item.Total_Item)) || parseFloat(item.Total_Item) < 0))
        ) {
            console.error('Skipping item due to invalid or missing numerical data (Cantidad must be > 0):', item);
            continue; // Skip this item
        }

        const itemValues = [
            nuevaCompraId, // Enlazar con el ID de la compra principal
            parseInt(item.Producto_id, 10),
            parseFloat(item.Cantidad),
             // Guardar 0 si Precio_Unitario es '', null o undefined, de lo contrario parsear float
             item.Precio_Unitario !== undefined && item.Precio_Unitario !== null && item.Precio_Unitario !== '' ? parseFloat(item.Precio_Unitario) : 0,
             // Guardar 0 si Total_Item es '', null o undefined, de lo contrario parsear float
             item.Total_Item !== undefined && item.Total_Item !== null && item.Total_Item !== '' ? parseFloat(item.Total_Item) : 0
        ];


        await req.db.execute(insertItemSql, itemValues); // Ejecutar inserción para cada ítem

        // Actualizar stock para este ítem de producto
        // Solo si el ítem es un producto y tiene cantidad > 0
        if (item.Producto_id !== null && item.Cantidad > 0) {
             const stockValues = [
                 parseInt(item.Producto_id, 10),
                 parseFloat(item.Cantidad)
             ];
             try {
                  const [stockResult] = await req.db.execute(updateStockSql, stockValues);
                  if (stockResult.affectedRows === 0 && stockResult.warningStatus === 0 && stockResult.insertId === 0) {
                       // Esto podría indicar que no se encontró el Producto_id en la tabla Stock (si no hay ON DUPLICATE KEY)
                       // o que la cantidad existente ya era la misma (si hubiera una lógica de UPDATE más compleja).
                       // Si usas ON DUPLICATE KEY UPDATE, affectedRows puede ser 1 (si se insertó) o 2 (si se actualizó).
                       // Si es 0, podría ser un problema o que el producto no existe en Stock.
                       // Considera crear la entrada en Stock si no existe.
                       console.warn(`Stock update for Producto_id ${item.Producto_id} reported 0 affected/inserted rows. Check if product exists in Stock table.`);
                       // Opcional: Intentar insertar si la actualización no afectó filas (si no existe)
                       // const insertStockSql = `INSERT IGNORE INTO Stock (Producto_id, Cantidad) VALUES (?, ?)`;
                       // await req.db.execute(insertStockSql, stockValues);

                   } else {
                       console.log(`Stock updated for Producto_id ${item.Producto_id}. Changes: ${stockResult.affectedRows}, InsertID: ${stockResult.insertId}`);
                   }

             } catch (stockError) {
                  console.error(`Error al actualizar stock para Producto_id ${item.Producto_id} al agregar compra:`, stockError);
                  // Decide if this should cause a rollback. For now, just log and continue.
                  // throw stockError; // Uncomment to force rollback on stock error
             }
        }
    }

    // 3. Gestionar el Movimiento de CashFlow asociado SOLO si Pago es 'abonado'
     if (Pago === 'abonado') {
         // Obtener el nombre del proveedor para la descripción del movimiento
         const proveedor = await getCompraByIdBasic(req.db, nuevaCompraId); // Reutilizamos el helper para obtener datos con nombre del proveedor
         const proveedorName = proveedor ? proveedor.Nombre_Proveedor : 'Proveedor Desconocido';

         const insertMovimientoSql = `
             INSERT INTO Movimientos (Fecha, Tipo, Subtipo, Referencia, Referencia_Id, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
         `;
         const referencia = `Fact Nro: ${Fact_Nro}`;
         const descripcionManual = `Compra a ${proveedorName}`;
         const notas = `Estado: ${Estado}, Pago: ${Pago}`;

         const movimientoValues = [
             formattedFecha, // Usar la fecha formateada
             'compra',
             'pago proveedor',
             referencia,
             nuevaCompraId, // Enlazar con el ID de la compra
             parseInt(Proveedor_id, 10), // Enlazar con el ID del proveedor
             'proveedor',
              // *** CORRECCIÓN: Usar un valor predeterminado para Forma_Pago si Pago no es una forma válida ***
              Pago, // Asumiendo que 'Pago' puede ser 'efectivo', 'MP', etc. Si no, necesitas un mapeo o valor por defecto.
             descripcionManual,
             MontoTotal !== '' && MontoTotal !== null && !isNaN(parseFloat(MontoTotal)) ? parseFloat(MontoTotal) : null, // Monto Total USD de la compra
             Total_ARS !== '' && Total_ARS !== null && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null, // Total ARS de la compra
             parseFloat(Cotizacion_Dolar),
             notas
         ];
         await req.db.execute(insertMovimientoSql, movimientoValues);
     }

    // ----------------------------------------------------
    // --- BEGIN: Automatic Price Update Logic            ---
    // ----------------------------------------------------
    console.log("Starting automatic price update check...");
    const purchasedProductIds = [...new Set(items.map(item => item.Producto_id))];

    for (const productId of purchasedProductIds) {
        console.log(`Checking price update for Product ID: ${productId}`);
        // Find the item details from the current purchase for this product
        const purchasedItem = items.find(item => item.Producto_id === productId);
        // Check if purchasedItem exists and Precio_Unitario is a valid positive number
        if (!purchasedItem || purchasedItem.Precio_Unitario === null || purchasedItem.Precio_Unitario === undefined || purchasedItem.Precio_Unitario === '' || isNaN(parseFloat(purchasedItem.Precio_Unitario)) || parseFloat(purchasedItem.Precio_Unitario) <= 0) {
            console.warn(` -> Skipping price update for Product ID ${productId}: Missing or invalid positive Precio_Unitario (${purchasedItem?.Precio_Unitario}) in purchase.`);
            continue; // Skip if price info is missing or not positive
        }


        const newCostPerUnit = parseFloat(purchasedItem.Precio_Unitario);


        // Get current product data (including eti_x_rollo and current costs)
        const [currentProductRows] = await req.db.execute(
            'SELECT eti_x_rollo, costo_x_1000, costo_x_rollo FROM Productos WHERE id = ?',
            [productId]
        );

        if (currentProductRows.length === 0) {
            console.warn(` -> Skipping price update for Product ID ${productId}: Product not found.`);
            continue; // Skip if product doesn't exist (shouldn't happen if FKs are set)
        }

        const currentProduct = currentProductRows[0];
        const etiPerRoll = currentProduct.eti_x_rollo !== null ? parseFloat(currentProduct.eti_x_rollo) : null;
        const currentCost1000 = currentProduct.costo_x_1000 !== null ? parseFloat(currentProduct.costo_x_1000) : null;
        const currentCostRoll = currentProduct.costo_x_rollo !== null ? parseFloat(currentProduct.costo_x_rollo) : null;

        if (etiPerRoll === null || isNaN(etiPerRoll) || etiPerRoll <= 0) {
            console.warn(` -> Skipping price update for Product ID ${productId}: Invalid or missing eti_x_rollo (${etiPerRoll}). Cannot calculate costs.`);
            continue; // Cannot calculate costs/price without eti_x_rollo
        }

        // Calculate the NEW costs based on the purchase unit price (which is essentially cost_x_rollo now)
        const newCostPerRoll = newCostPerUnit; // Cost per unit IS the cost per roll in purchases
        const newCostPer1000 = (newCostPerRoll / etiPerRoll) * 1000; // Calculate cost per 1000 from cost per roll

        // Check if the cost per roll has actually changed (using sufficient precision)
         // Use a small tolerance (epsilon) for floating point comparison
         const epsilon = 0.0001; // Example tolerance
         const costRollChanged = currentCostRoll === null || Math.abs(newCostPerRoll - currentCostRoll) > epsilon;


        if (costRollChanged) {
            console.log(` -> Cost change detected for Product ID ${productId}. Updating cost, price, and history.`);

            // 1. Add OLD cost to history (BEFORE updating the product)
            if (currentCost1000 !== null || currentCostRoll !== null) {
                 const insertHistorySql = `
                     INSERT INTO Producto_Costo_Historico
                         (Producto_id, Fecha_Valido_Desde, costo_x_1000, costo_x_rollo)
                     VALUES (?, NOW(), ?, ?)`;
                 await req.db.execute(insertHistorySql, [
                     productId,
                     currentProduct.costo_x_1000, // Use the original fetched value
                     currentProduct.costo_x_rollo  // Use the original fetched value
                 ]);
                 console.log(`  --> Added historical cost for Product ID ${productId}.`);
            }

            // 2. Calculate the new price (costo_x_rollo * 2)
            const newPrice = newCostPerRoll * 2;

            // 3. Update the product with the new costs and new price
            const updateProductSql = `
                UPDATE Productos
                SET
                    costo_x_1000 = ?,
                    costo_x_rollo = ?,
                    precio = ?
                WHERE id = ?`;

            const updateValues = [
                newCostPer1000.toFixed(4), // Store with precision
                newCostPerRoll.toFixed(4), // Store with precision
                newPrice.toFixed(2),      // Store price with 2 decimals
                productId
            ];

            await req.db.execute(updateProductSql, updateValues);
            console.log(`  --> Updated Product ID ${productId} with new costs and price (${newPrice.toFixed(2)}).`);

        } else {
            console.log(` -> No cost change detected for Product ID ${productId}. Price remains unchanged.`);
        }
    }
    console.log("Finished automatic price update check.");
    // --------------------------------------------------
    // --- END: Automatic Price Update Logic            ---
    // --------------------------------------------------


    // Si todo fue exitoso, confirmar la transacción
    await req.db.commit();

    // Enviar respuesta de éxito con el ID de la nueva compra
    res.status(201).json({ success: { id: nuevaCompraId } });

  } catch (error) {
    console.error('Error al agregar compra:', error);
    // En caso de error, hacer rollback
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al agregar compra.';
    // Manejar errores específicos (ej: FK para Proveedor_id o Producto_id en ítems, Fact_Nro duplicado)
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Proveedor o Producto seleccionado en los ítems no válido.';
      // *** AÑADIR ESTA VERIFICACIÓN ESPECÍFICA ***
     } else if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage && error.sqlMessage.includes('uq_proveedor_factura')) {
         userMessage = 'Error: Ya existe una compra registrada con ese número de factura para este proveedor.';
     // *** FIN DE LA VERIFICACIÓN ***
     } else if (error.code === 'ER_PARSE_ERROR') {
          // Incluir el mensaje de error de MySQL para depuración
          userMessage = `Error de sintaxis SQL al agregar ítems: ${error.sqlMessage}`;
     } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos: ${error.sqlMessage}`;
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar una compra existente por su ID, incluyendo la re-inserción de ítems y gestión de movimiento de CashFlow
// Esta ruta es para la edición completa de la compra.
// !! NO SE INCLUYE AQUÍ LA ACTUALIZACIÓN AUTOMÁTICA DE PRECIOS EN LA EDICIÓN !!
// La actualización de precios solo se gatilla al CREAR una compra nueva.
router.put('/:id', async (req, res) => {
  const compraId = req.params.id;
  const {
    Fecha, Fact_Nro, Proveedor_id, Estado, MontoTotal, Cotizacion_Dolar, Total_ARS, Pago,
    items // Array de ítems actualizados
  } = req.body;

   // Validación básica
   if (!Fecha || !Fact_Nro || !Proveedor_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Fact Nro, Proveedor, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para actualizar Compras.' });
   }
   if (MontoTotal !== undefined && MontoTotal !== null && MontoTotal !== '' && isNaN(parseFloat(MontoTotal))) {
       return res.status(400).json({ error: 'Monto Total debe ser un número válido si se proporciona.' });
   }
    if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) {
        return res.status(400).json({ error: 'Total ARS debe ser un número válido si se proporciona.' });
    }

    // Formatear la fecha a YYYY-MM-DD
    const formattedFecha = formatDateToYYYYMMDD(Fecha);
    if (!formattedFecha) {
        return res.status(400).json({ error: 'Formato de fecha no válido.' });
    }


  try {
    // Iniciar una transacción
    await req.db.beginTransaction();

    // *** INICIO: Lógica de Reversión de Stock ***
     // 1. Obtener los ítems *actuales* de la compra ANTES de actualizarlos/eliminarlos
     const selectCurrentItemsSql = `SELECT Producto_id, Cantidad FROM Compra_Items WHERE Compra_id = ?`;
     const [currentItemsRows] = await req.db.execute(selectCurrentItemsSql, [compraId]);

     // 2. Revertir el stock para cada ítem actual
     const reverseStockSql = `
         UPDATE Stock
         SET Cantidad = GREATEST(0, Cantidad - ?) -- Evita stock negativo si es posible
         WHERE Producto_id = ?;`;

     for (const currentItem of currentItemsRows) {
         if (currentItem.Producto_id !== null && currentItem.Cantidad > 0) {
             const reverseStockValues = [
                 parseFloat(currentItem.Cantidad),
                 parseInt(currentItem.Producto_id, 10)
             ];
             try {
                  const [reverseResult] = await req.db.execute(reverseStockSql, reverseStockValues);
                   console.log(`Stock revertido para Producto_id ${currentItem.Producto_id}. Cambios: ${reverseResult.affectedRows}`);
                   if (reverseResult.affectedRows === 0) {
                        console.warn(`  -> No se encontró o no se pudo revertir stock para Producto_id ${currentItem.Producto_id}.`);
                   }
             } catch (reverseError) {
                  console.error(`Error al revertir stock para Producto_id ${currentItem.Producto_id} al actualizar compra:`, reverseError);
                   // Considera si este error debe detener la transacción
                   // throw reverseError; // Descomenta para forzar rollback si la reversión falla
             }
         }
     }
     // *** FIN: Lógica de Reversión de Stock ***

    // 3. Actualizar la compra principal
    const updateCompraSql = `
      UPDATE Compras
      SET
        Fecha = ?, Fact_Nro = ?, Proveedor_id = ?, Estado = ?, MontoTotal = ?,
        Cotizacion_Dolar = ?, Total_ARS = ?, Pago = ?
      WHERE id = ?`;

    const compraValues = [
      formattedFecha, // Usar la fecha formateada
      Fact_Nro,
      parseInt(Proveedor_id, 10),
      Estado,
      MontoTotal !== '' && MontoTotal !== null ? parseFloat(MontoTotal) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== '' && Total_ARS !== null ? parseFloat(Total_ARS) : null,
      Pago,
      compraId // Usar el ID de la compra a actualizar
    ];

    const [updateResult] = await req.db.execute(updateCompraSql, compraValues);

     // Opcional: Verificar si la compra principal existía antes de seguir
     if (updateResult.affectedRows === 0) {
          await req.db.rollback();
          return res.status(404).json({ error: `No se encontró compra con ID ${compraId} para actualizar.` });
     }


    // 4. Eliminar los ítems existentes para esta compra
    const deleteItemsSql = `DELETE FROM Compra_Items WHERE Compra_id = ?`;
    await req.db.execute(deleteItemsSql, [compraId]); // No necesitamos el resultado, solo que se ejecute

    // 5. Insertar los nuevos ítems - Insertar uno por uno
    const insertItemSql = `
      INSERT INTO Compra_Items (Compra_id, Producto_id, Cantidad, Precio_Unitario, Total_Item)
      VALUES (?, ?, ?, ?, ?);`;

    // Lógica para actualizar stock (ahora solo SUMA el nuevo stock)
     const addStockSql = `
         INSERT INTO Stock (Producto_id, Cantidad)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
         Cantidad = Cantidad + VALUES(Cantidad);`;


    for (const item of items) {
         // Validar cada ítem antes de intentar insertarlo (misma validación que en POST)
         if (
             item.Producto_id === undefined || item.Producto_id === null || item.Producto_id === '' ||
             item.Cantidad === undefined || item.Cantidad === null || isNaN(parseFloat(item.Cantidad)) || parseFloat(item.Cantidad) <= 0 ||
             // Permitir Precio_Unitario ser 0 o null/undefined
             (item.Precio_Unitario !== undefined && item.Precio_Unitario !== null && item.Precio_Unitario !== '' && (isNaN(parseFloat(item.Precio_Unitario)) || parseFloat(item.Precio_Unitario) < 0)) ||
             // Permitir Total_Item ser 0 o null/undefined
             (item.Total_Item !== undefined && item.Total_Item !== null && item.Total_Item !== '' && (isNaN(parseFloat(item.Total_Item)) || parseFloat(item.Total_Item) < 0))
         ) {
             console.error('Skipping item due to invalid or missing numerical data during update (Cantidad must be > 0):', item);
             continue; // Skip this item
         }


        const itemValues = [
            compraId, // Enlazar con el ID de la compra principal
            parseInt(item.Producto_id, 10),
            parseFloat(item.Cantidad),
             // Guardar 0 si Precio_Unitario es '', null o undefined, de lo contrario parsear float
             item.Precio_Unitario !== undefined && item.Precio_Unitario !== null && item.Precio_Unitario !== '' ? parseFloat(item.Precio_Unitario) : 0,
             // Guardar 0 si Total_Item es '', null o undefined, de lo contrario parsear float
             item.Total_Item !== undefined && item.Total_Item !== null && item.Total_Item !== '' ? parseFloat(item.Total_Item) : 0
        ];


        await req.db.execute(insertItemSql, itemValues); // Ejecutar inserción para cada ítem

         // Añadir el nuevo stock para este ítem de producto
         if (item.Producto_id !== null && item.Cantidad > 0) {
              const stockValues = [
                  parseInt(item.Producto_id, 10),
                  parseFloat(item.Cantidad)
              ];
              try {
                   const [stockResult] = await req.db.execute(addStockSql, stockValues); // Usar la SQL que SUMA
                    if (stockResult.affectedRows === 0 && stockResult.warningStatus === 0 && stockResult.insertId === 0) {
                        console.warn(`Stock addition for Producto_id ${item.Producto_id} reported 0 affected/inserted rows during update. Check if product exists in Stock table.`);
                    } else {
                       console.log(`Stock added for Producto_id ${item.Producto_id} during update. Changes: ${stockResult.affectedRows}, InsertID: ${stockResult.insertId}`);
                   }
              } catch (stockError) {
                   console.error(`Error al agregar stock para Producto_id ${item.Producto_id} al actualizar compra:`, stockError);
                    // throw stockError; // Descomenta para forzar rollback si la adición de stock falla
              }
         }
    }


    // 6. Gestionar el Movimiento de CashFlow asociado basado en el estado de Pago
     // Primero, buscar si ya existe un movimiento asociado a esta compra
     const [movimientoRows, movimientoFields] = await req.db.execute(`
         SELECT id FROM Movimientos WHERE Referencia_Id = ? AND Tipo = 'compra'`, [compraId]);
     const movimientoExistenteId = movimientoRows.length > 0 ? movimientoRows[0].id : null;

      // Obtener los datos actualizados de la compra principal (con nombre del proveedor)
      const updatedCompraData = await getCompraByIdBasic(req.db, compraId); // Reutilizamos el helper
      if (!updatedCompraData) {
           await req.db.rollback();
           return res.status(500).json({ error: 'Error interno: No se pudieron obtener datos de la compra actualizada para gestionar movimiento.' });
      }

      const proveedorName = updatedCompraData.Nombre_Proveedor || 'Proveedor Desconocido';
      const referencia = `Fact Nro: ${updatedCompraData.Fact_Nro}`;
      const descripcionManual = `Compra a ${proveedorName}`;
      const notas = `Estado: ${updatedCompraData.Estado}, Pago: ${updatedCompraData.Pago}`; // Usar el estado actualizado
      const montoUSD = updatedCompraData.MontoTotal !== null ? parseFloat(updatedCompraData.MontoTotal) : null;
      const montoARS = updatedCompraData.Total_ARS !== null ? parseFloat(updatedCompraData.Total_ARS) : null;
      const cotizacion = updatedCompraData.Cotizacion_Dolar !== null ? parseFloat(updatedCompraData.Cotizacion_Dolar) : null;

          // Formatear la fecha del movimiento si updatedCompraData.Fecha no está en YYYY-MM-DD
          const formattedFechaMovimiento = formatDateToYYYYMMDD(updatedCompraData.Fecha);
          if (!formattedFechaMovimiento) {
               await req.db.rollback();
               return res.status(500).json({ error: 'Error interno: Formato de fecha de compra no válido para gestionar movimiento.' });
          }


     if (Pago === 'abonado' && !movimientoExistenteId) {
         // Crear nuevo movimiento si ahora está pagada y no existía movimiento
         const insertMovimientoSql = `
             INSERT INTO Movimientos (Fecha, Tipo, Subtipo, Referencia, Referencia_Id, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
         `;
         const movimientoValues = [
             formattedFechaMovimiento, // Usar la fecha formateada
             'compra', 'pago proveedor', referencia, compraId, parseInt(updatedCompraData.Proveedor_id, 10), 'proveedor',
             // *** CORRECCIÓN: Usar un valor predeterminado para Forma_Pago si Pago no es una forma válida ***
              Pago, // Asumiendo que 'Pago' puede ser 'efectivo', 'MP', etc. Si no, necesitas un mapeo o valor por defecto.
             descripcionManual, montoUSD, montoARS, cotizacion, notas
         ];
         await req.db.execute(insertMovimientoSql, movimientoValues);

     } else if (Pago !== 'abonado' && movimientoExistenteId) {
         // Eliminar movimiento existente si ahora no está pagada y existía movimiento
         const deleteMovimientoSql = `DELETE FROM Movimientos WHERE Referencia_Id = ? AND Tipo = 'compra'`;
         await req.db.execute(deleteMovimientoSql, [compraId]);

     } else if (Pago === 'abonado' && movimientoExistenteId) {
         // Actualizar movimiento existente si sigue pagada y existía movimiento
         const updateMovimientoSql = `
             UPDATE Movimientos
             SET Fecha = ?, Subtipo = ?, Referencia = ?, Cliente_Proveedor_id = ?, Tipo_Cliente_Proveedor = ?, Forma_Pago = ?, Descripcion_Manual = ?, Monto_USD = ?, Monto_ARS = ?, Cotizacion_Dolar = ?, Notas = ?
             WHERE Referencia_Id = ? AND Tipo = 'compra';
         `;
         const updateMovimientoValues = [
             formattedFechaMovimiento, // Usar la fecha formateada
             'pago proveedor', referencia, parseInt(updatedCompraData.Proveedor_id, 10), 'proveedor',
              // *** CORRECCIÓN: Usar un valor predeterminado para Forma_Pago si Pago no es una forma válida ***
              Pago, // Asumiendo que 'Pago' puede ser 'efectivo', 'MP', etc. Si no, necesitas un mapeo o valor por defecto.
             descripcionManual, montoUSD, montoARS, cotizacion, notas,
             compraId
         ];
         await req.db.execute(updateMovimientoSql, updateMovimientoValues);
     }
     // Si Pago no es 'abonado' y no existía movimiento, no se hace nada.


    // Si todo fue exitoso, confirmar la transacción
    await req.db.commit();

    // Enviar respuesta de éxito
    res.json({ success: { id: compraId, changes: updateResult.affectedRows } });

  } catch (error) {
    console.error(`Error al actualizar compra con ID ${compraId}:`, error);
    // En caso de error, hacer rollback
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al actualizar compra.';
    // Manejar errores específicos (ej: FK, Fact_Nro duplicado)
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Proveedor o Producto seleccionado en los ítems no válido.';
      // *** AÑADIR ESTA VERIFICACIÓN ESPECÍFICA ***
      } else if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage && error.sqlMessage.includes('uq_proveedor_factura')) {
         userMessage = 'Error: Ya existe una compra registrada con ese número de factura para este proveedor.';
      // *** FIN DE LA VERIFICACIÓN ***
     } else if (error.code === 'ER_PARSE_ERROR') {
          // Incluir el mensaje de error de MySQL para depuración
          userMessage = `Error de sintaxis SQL al actualizar ítems: ${error.sqlMessage}`;
     } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos: ${error.sqlMessage}`;
     }
    res.status(500).json({ error: userMessage });
  }
});


// Actualizar el estado y/o pago de una compra pendiente por su ID (ruta específica para "pendientes")
// Esta ruta solo actualiza los campos Estado y Pago y gestiona el Movimiento asociado.
router.put('/pending/:id', async (req, res) => {
    const compraId = req.params.id;
    const { Estado, Pago } = req.body; // Esperamos solo Estado y/o Pago

    const updates = [];
    const values = [];

    // Validación básica: al menos un campo debe estar presente
    if (Estado === undefined && Pago === undefined) {
        return res.status(400).json({ error: 'No se proporcionó Estado o Pago para actualizar.' });
    }
    // Validar los campos si están presentes
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

    let sql = `UPDATE Compras SET ${updates.join(', ')} WHERE id = ?;`;
    values.push(compraId);

    try {
        await req.db.beginTransaction(); // Iniciar transacción

        // 1. Actualizar la compra con los nuevos Estado y Pago
        const [updateResult] = await req.db.execute(sql, values);

        if (updateResult.affectedRows === 0) {
             await req.db.rollback();
             return res.status(404).json({ error: `No se encontró compra pendiente con ID ${compraId} para actualizar.` });
        }

        // 2. Gestionar el Movimiento de CashFlow asociado basado en el NUEVO estado de Pago
        // Primero, obtener los datos actualizados de la compra, incluyendo Proveedor_id, Fact_Nro, Fecha, MontoTotal, Total_ARS, Cotizacion_Dolar
         const updatedCompraData = await getCompraByIdBasic(req.db, compraId); // Reutilizamos el helper
         if (!updatedCompraData) {
              await req.db.rollback();
              return res.status(500).json({ error: 'Error interno: No se pudieron obtener datos de la compra actualizada para gestionar movimiento.' });
         }

         const proveedorName = updatedCompraData.Nombre_Proveedor || 'Proveedor Desconocido';
         const referencia = `Fact Nro: ${updatedCompraData.Fact_Nro}`;
         const descripcionManual = `Compra a ${proveedorName}`;
         const notas = `Estado: ${updatedCompraData.Estado}, Pago: ${updatedCompraData.Pago}`; // Usar el estado actualizado
         const montoUSD = updatedCompraData.MontoTotal !== null ? parseFloat(updatedCompraData.MontoTotal) : null;
         const montoARS = updatedCompraData.Total_ARS !== null ? parseFloat(updatedCompraData.Total_ARS) : null;
         const cotizacion = updatedCompraData.Cotizacion_Dolar !== null ? parseFloat(updatedCompraData.Cotizacion_Dolar) : null;

         // Formatear la fecha del movimiento si updatedCompraData.Fecha no está en YYYY-MM-DD
         const formattedFechaMovimiento = formatDateToYYYYMMDD(updatedCompraData.Fecha);
         if (!formattedFechaMovimiento) {
              await req.db.rollback();
              return res.status(500).json({ error: 'Error interno: Formato de fecha de compra no válido para gestionar movimiento.' });
         }


         // Buscar si ya existe un movimiento asociado a esta compra
         const [movimientoRows, movimientoFields] = await req.db.execute(`
             SELECT id FROM Movimientos WHERE Referencia_Id = ? AND Tipo = 'compra'`, [compraId]);
         const movimientoExistenteId = movimientoRows.length > 0 ? movimientoRows[0].id : null;


         if (updatedCompraData.Pago === 'abonado' && !movimientoExistenteId) {
             // Crear nuevo movimiento si ahora está pagada y no existía movimiento
             const insertMovimientoSql = `
                 INSERT INTO Movimientos (Fecha, Tipo, Subtipo, Referencia, Referencia_Id, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
             `;
             const movimientoValues = [
                 formattedFechaMovimiento, // Usar la fecha formateada
                 'compra', 'pago proveedor', referencia, compraId, parseInt(updatedCompraData.Proveedor_id, 10), 'proveedor',
                 // *** CORRECCIÓN: Usar un valor predeterminado para Forma_Pago si Pago no es una forma válida ***
                 updatedCompraData.Pago, // Asumiendo que 'Pago' puede ser 'efectivo', 'MP', etc. Si no, necesitas un mapeo o valor por defecto.
                 descripcionManual, montoUSD, montoARS, cotizacion, notas
             ];
             await req.db.execute(insertMovimientoSql, movimientoValues);

         } else if (updatedCompraData.Pago !== 'abonado' && movimientoExistenteId) {
             // Eliminar movimiento existente si ahora no está pagada y existía movimiento
             const deleteMovimientoSql = `DELETE FROM Movimientos WHERE Referencia_Id = ? AND Tipo = 'compra'`;
             await req.db.execute(deleteMovimientoSql, [compraId]);

         } else if (updatedCompraData.Pago === 'abonado' && movimientoExistenteId) {
             // Actualizar movimiento existente si sigue pagada y existía movimiento
             const updateMovimientoSql = `
                 UPDATE Movimientos
                 SET Fecha = ?, Subtipo = ?, Referencia = ?, Cliente_Proveedor_id = ?, Tipo_Cliente_Proveedor = ?, Forma_Pago = ?, Descripcion_Manual = ?, Monto_USD = ?, Monto_ARS = ?, Cotizacion_Dolar = ?, Notas = ?
                 WHERE Referencia_Id = ? AND Tipo = 'compra';
             `;
             const updateMovimientoValues = [
                 formattedFechaMovimiento, // Usar la fecha formateada
                 'pago proveedor', referencia, parseInt(updatedCompraData.Proveedor_id, 10), 'proveedor',
                  // *** CORRECCIÓN: Usar un valor predeterminado para Forma_Pago si Pago no es una forma válida ***
                  updatedCompraData.Pago, // Asumiendo que 'Pago' puede ser 'efectivo', 'MP', etc. Si no, necesitas un mapeo o valor por defecto.
                 descripcionManual, montoUSD, montoARS, cotizacion, notas,
                 compraId
             ];
             await req.db.execute(updateMovimientoSql, updateMovimientoValues);
         }
         // Si Pago no es 'abonado' y no existía movimiento, no se hace nada.


        await req.db.commit(); // Confirmar transacción

        res.json({ success: { id: compraId, changes: updateResult.affectedRows } });

    } catch (error) {
        console.error(`Error al actualizar compra pendiente con ID ${compraId}:`, error);
        await req.db.rollback(); // Hacer rollback
         let userMessage = 'Error interno del servidor al actualizar compra pendiente.';
         if (error.code === 'ER_NO_REFERENCED_ROW_2') {
              userMessage = 'Error: Proveedor seleccionado no válido.';
         } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
              userMessage = `Error de formato de datos: ${error.sqlMessage}`;
         }
        res.status(500).json({ error: userMessage });
    }
});


// Eliminar una compra por ID, incluyendo sus ítems y movimiento de CashFlow
router.delete('/:id', async (req, res) => {
  const compraId = req.params.id;

  try {
    // Iniciar una transacción
    await req.db.beginTransaction();

     // *** INICIO: Lógica de Reversión de Stock ***
     // 1. Obtener los ítems de la compra ANTES de eliminarlos
     const selectItemsSql = `SELECT Producto_id, Cantidad FROM Compra_Items WHERE Compra_id = ?`;
     const [itemsToReverse] = await req.db.execute(selectItemsSql, [compraId]);

     // 2. Revertir el stock para cada ítem
     const reverseStockSql = `
         UPDATE Stock
         SET Cantidad = GREATEST(0, Cantidad - ?) -- Evita stock negativo si es posible
         WHERE Producto_id = ?;`;

     for (const item of itemsToReverse) {
         if (item.Producto_id !== null && item.Cantidad > 0) {
             const reverseStockValues = [
                 parseFloat(item.Cantidad),
                 parseInt(item.Producto_id, 10)
             ];
             try {
                 const [reverseResult] = await req.db.execute(reverseStockSql, reverseStockValues);
                 console.log(`Stock revertido para Producto_id ${item.Producto_id} al eliminar compra. Cambios: ${reverseResult.affectedRows}`);
                  if (reverseResult.affectedRows === 0) {
                       console.warn(`  -> No se encontró o no se pudo revertir stock para Producto_id ${item.Producto_id}.`);
                  }
             } catch (reverseError) {
                  console.error(`Error al revertir stock para Producto_id ${item.Producto_id} al eliminar compra:`, reverseError);
                  // Considera si este error debe detener la transacción
                  // throw reverseError; // Descomenta para forzar rollback si la reversión falla
             }
         }
     }
     // *** FIN: Lógica de Reversión de Stock ***


     // 3. Eliminar el Movimiento de CashFlow asociado (si existe)
     const deleteMovimientoSql = `DELETE FROM Movimientos WHERE Referencia_Id = ? AND Tipo = 'compra'`;
     await req.db.execute(deleteMovimientoSql, [compraId]); // No necesitamos el resultado

    // 4. Eliminar los ítems asociados a la compra
    const deleteItemsSql = `DELETE FROM Compra_Items WHERE Compra_id = ?`;
    await req.db.execute(deleteItemsSql, [compraId]); // No necesitamos el resultado

    // 5. Eliminar la compra principal
    const deleteCompraSql = `DELETE FROM Compras WHERE id = ?`;
    const [result] = await req.db.execute(deleteCompraSql, [compraId]);

    // Verificar si se eliminó la compra principal
    if (result.affectedRows === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `No se encontró compra con ID ${compraId} para eliminar.` });
    }

    // Si todo fue exitoso, confirmar la transacción
    await req.db.commit();

    // Enviar respuesta de éxito
    res.json({ success: { id: compraId, changes: result.affectedRows } });

  } catch (error) {
    console.error(`Error al eliminar compra con ID ${compraId}:`, error);
    // En caso de error, hacer rollback
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al eliminar compra.';
     // Manejar error si hay registros asociados que impidan la eliminación principal (si no se eliminaron por CASCADE o explícitamente)
     if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          userMessage = 'Error: No se puede eliminar la compra debido a registros asociados inesperados.'; // Deberían haberse eliminado ítems y movimiento, pero como precaución
     }
    res.status(500).json({ error: userMessage });
  }
});


module.exports = router;