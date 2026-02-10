// routes/cashflow.js
const express = require('express');
const router = express.Router();

// Middleware para loggear cualquier solicitud que llegue a este router
router.use((req, res, next) => {
    console.log(`[CashFlow Router] Solicitud recibida: ${req.method} ${req.originalUrl}`);
    next(); // Pasa la solicitud al siguiente manejador en este router
});


// Rutas para la gestión de CashFlow (Movimientos) y Movimientos Manuales

// Helper para obtener una compra principal por ID (sin ítems) - Necesario para cashflow
// Si ya definiste esto en compras.js, puedes importarla si configuras las importaciones/exports
// o duplicarla aquí por simplicidad inicial. Lo duplico aquí por ahora.
async function getCompraByIdBasic(db, compraId) {
    const [compraRows, compraFields] = await db.execute(`
        SELECT
            c.id, c.Fecha, c.Fact_Nro, c.Proveedor_id, c.Estado, c.MontoTotal, c.Cotizacion_Dolar, c.Total_ARS, c.Pago,
            p.Empresa AS Nombre_Proveedor, p.Cuit AS Cuit_Proveedor
        FROM Compras c
        JOIN Proveedores p ON c.Proveedor_id = p.id
        WHERE c.id = ?`, [compraId]);
    return compraRows.length > 0 ? compraRows[0] : null;
}


// Obtener todos los movimientos de CashFlow con filtros (GET principal)
router.get('/movements', async (req, res) => {
     console.log('¡Solicitud recibida en /api/cashflow/movements!'); // Log 1

    try { // Start try block here to catch errors early

        let { startDate, endDate, type, formaPago, clientProviderId } = req.query;

        // --- Normalizar valores de parámetros: tratar 'undefined' y 'null' como null ---
        startDate = (startDate === 'undefined' || startDate === 'null') ? null : startDate;
        endDate = (endDate === 'undefined' || endDate === 'null') ? null : endDate;
        type = (type === 'undefined' || type === 'null') ? null : type;
        formaPago = (formaPago === 'undefined' || formaPago === 'null') ? null : formaPago;
        clientProviderId = (clientProviderId === 'undefined' || clientProviderId === 'null') ? null : clientProviderId;
        // --- Fin Normalización ---


        console.log('[CashFlow - Backend] Query parameters (normalized):', { startDate, endDate, type, formaPago, clientProviderId }); // Log 2

        let filterClientId = null;
        let filterProviderId = null;
        let filterEntityType = null;

        if (clientProviderId && typeof clientProviderId === 'string' && clientProviderId.includes('-')) {
            const [typePrefix, idValue] = clientProviderId.split('-');
            if (idValue) {
                const idNum = parseInt(idValue, 10);
                if (!isNaN(idNum)) {
                    if (typePrefix === 'c') {
                        filterClientId = idNum;
                        filterEntityType = 'cliente';
                    } else if (typePrefix === 'p') {
                        filterProviderId = idNum;
                        filterEntityType = 'proveedor';
                    }
                }
            }
        }

        console.log('[CashFlow - Backend] Parsed entity filters:', { filterClientId, filterProviderId, filterEntityType }); // Log 3


        // Base SQL queries for each type of movement
        // IMPORTANT: These should include their base WHERE clauses (like v.Pago = 'abonado')
        // The addFiltersToQueryPart function will add *additional* filters.

        let manualMovementsSql = `
            SELECT
                m.id AS id,
                m.Fecha AS Fecha,
                m.Tipo AS Tipo,
                m.Subtipo AS Subtipo,
                m.Referencia AS Referencia,
                m.Forma_Pago AS Forma_Pago,
                m.Monto_USD AS Monto_USD,
                m.Monto_ARS AS Monto_ARS,
                m.Cotizacion_Dolar AS Cotizacion_Dolar,
                m.Descripcion_Manual AS Descripcion_Detalle,
                m.Notas AS Notas,
                m.Cliente_Proveedor_id AS Cliente_Proveedor_id,
                m.Tipo_Cliente_Proveedor AS Tipo_Cliente_Proveedor,
                NULL AS Venta_Id,
                NULL AS VentaX_Id,
                NULL AS Compra_Id,
                c.Empresa AS Nombre_Cliente,
                prov.Empresa AS Nombre_Proveedor
            FROM Movimientos m
            LEFT JOIN Clientes c ON m.Cliente_Proveedor_id = c.id AND m.Tipo_Cliente_Proveedor = 'cliente'
            LEFT JOIN Proveedores prov ON m.Cliente_Proveedor_id = prov.id AND m.Tipo_Cliente_Proveedor = 'proveedor'
            WHERE m.Tipo IN ('ingreso manual', 'egreso manual') -- Base condition for manual movements
        `;

        let ventasSql = `
            SELECT
                v.id AS id,
                v.Fecha AS Fecha,
                'venta' AS Tipo,
                'pago cliente' AS Subtipo,
                v.Fact_Nro AS Referencia,
                v.Pago AS Forma_Pago,
                v.Total AS Monto_USD,
                v.Total_ARS AS Monto_ARS,
                v.Cotizacion_Dolar AS Cotizacion_Dolar,
                CONCAT('Venta Factura ', v.Fact_Nro) AS Descripcion_Detalle,
                CONCAT('Estado: ', v.Estado) AS Notas,
                v.Cliente_id AS Cliente_Proveedor_id,
                'cliente' AS Tipo_Cliente_Proveedor,
                v.id AS Venta_Id,
                NULL AS VentaX_Id,
                NULL AS Compra_Id,
                c.Empresa AS Nombre_Cliente,
                NULL AS Nombre_Proveedor
            FROM Ventas v
            JOIN Clientes c ON v.Cliente_id = c.id
            WHERE v.Pago = 'abonado' -- Base condition: only paid sales
        `;

        let ventasXSql = `
            SELECT
                vx.id AS id,
                vx.Fecha AS Fecha,
                'ventaX' AS Tipo,
                'pago cliente' AS Subtipo,
                vx.Nro_VentaX AS Referencia,
                vx.Pago AS Forma_Pago,
                vx.Total AS Monto_USD,
                vx.Total_ARS AS Monto_ARS,
                vx.Cotizacion_Dolar AS Cotizacion_Dolar,
                CONCAT('VentaX Nro ', vx.Nro_VentaX) AS Descripcion_Detalle,
                CONCAT('Estado: ', vx.Estado) AS Notas,
                vx.Cliente_id AS Cliente_Proveedor_id,
                'cliente' AS Tipo_Cliente_Proveedor,
                NULL AS Venta_Id,
                vx.id AS VentaX_Id,
                NULL AS Compra_Id,
                c.Empresa AS Nombre_Cliente,
                NULL AS Nombre_Proveedor
            FROM VentasX vx
            JOIN Clientes c ON vx.Cliente_id = c.id
            WHERE vx.Pago = 'abonado' -- Base condition: only paid Sales X
        `;

        let comprasSql = `
            SELECT
                co.id AS id,
                co.Fecha AS Fecha,
                'compra' AS Tipo,
                'pago proveedor' AS Subtipo,
                co.Fact_Nro AS Referencia,
                co.Pago AS Forma_Pago,
                co.MontoTotal AS Monto_USD,
                co.Total_ARS AS Monto_ARS,
                co.Cotizacion_Dolar AS Cotizacion_Dolar,
                CONCAT('Compra Factura ', co.Fact_Nro) AS Descripcion_Detalle,
                CONCAT('Estado: ', co.Estado, ', Pago: ', co.Pago) AS Notas,
                co.Proveedor_id AS Cliente_Proveedor_id,
                'proveedor' AS Tipo_Cliente_Proveedor,
                NULL AS Venta_Id,
                NULL AS VentaX_Id,
                co.id AS Compra_Id,
                NULL AS Nombre_Cliente,
                prov.Empresa AS Nombre_Proveedor
            FROM Compras co
            JOIN Proveedores prov ON co.Proveedor_id = prov.id
            WHERE co.Pago = 'abonado' -- Base condition: only paid purchases
        `;

        let gastosSql = `
            SELECT
                g.id AS id,
                g.Fecha AS Fecha,
                'egreso manual' AS Tipo,
                g.Tipo AS Subtipo,
                g.Motivo AS Referencia,
                g.Forma_Pago AS Forma_Pago,
                g.Monto_Dolares AS Monto_USD,
                g.Monto_Pesos AS Monto_ARS,
                g.Cotizacion_Dolar AS Cotizacion_Dolar,
                g.Motivo AS Descripcion_Detalle,
                NULL AS Notas,
                NULL AS Cliente_Proveedor_id,
                NULL AS Tipo_Cliente_Proveedor,
                NULL AS Venta_Id,
                NULL AS VentaX_Id,
                NULL AS Compra_Id,
                NULL AS Nombre_Cliente,
                NULL AS Nombre_Proveedor
            FROM Gastos g
            WHERE 1=1 -- Base condition for gastos (always true)
        `;

        const params = [];
        const queryParts = [];

        // Helper function to add dynamic WHERE clauses and parameters to each SQL part
        const addFiltersToQueryPart = (sqlPart, dateField, formaPagoField, entityIdField, entityType) => {
             const clauses = [];
             const currentParams = [];

             // Date filters
             if (startDate && endDate) {
                 clauses.push(`${dateField} BETWEEN ? AND ?`);
                 currentParams.push(startDate, endDate);
             } else if (startDate) {
                 clauses.push(`${dateField} >= ?`);
                 currentParams.push(startDate);
             } else if (endDate) {
                  clauses.push(`${dateField} <= ?`);
                  currentParams.push(endDate);
             }

             // Forma_Pago filter
             if (formaPago) {
                  let fieldToFilter = formaPagoField;
                  // Determine the correct field based on the source table alias
                  if (sqlPart.includes('FROM Movimientos m')) { fieldToFilter = 'm.Forma_Pago'; }
                  else if (sqlPart.includes('FROM Ventas v')) { fieldToFilter = 'v.Pago'; } // Filter using the 'Pago' column for Ventas
                  else if (sqlPart.includes('FROM VentasX vx')) { fieldToFilter = 'vx.Pago'; } // Filter using the 'Pago' column for VentasX
                  else if (sqlPart.includes('FROM Compras co')) { fieldToFilter = 'co.Pago'; } // Filter using the 'Pago' column for Compras
                  else if (sqlPart.includes('FROM Gastos g')) { fieldToFilter = 'g.Forma_Pago'; } // Filter using the 'Forma_Pago' column for Gastos

                  clauses.push(`${fieldToFilter} = ?`);
                  currentParams.push(formaPago);
             }

             // Cliente_Proveedor_id filter (combined)
             if (filterClientId !== null && filterEntityType === 'cliente') {
                 // Apply client filter only if the SQL part is related to clients
                 if (entityType === 'cliente' || entityType === 'manual') { // 'manual' type can be linked to client
                     clauses.push(`${entityIdField} = ?`);
                     currentParams.push(filterClientId);
                 } else {
                     // If filtering by a Client ID but this part of the UNION is not related to clients,
                     // add a clause that is always false to exclude rows from this part.
                     clauses.push('1=0');
                 }
             } else if (filterProviderId !== null && filterEntityType === 'proveedor') {
                  // Apply provider filter only if the SQL part is related to providers
                  if (entityType === 'proveedor' || entityType === 'manual') { // 'manual' type can be linked to provider
                       clauses.push(`${entityIdField} = ?`);
                       currentParams.push(filterProviderId);
                  } else {
                       // If filtering by a Provider ID but this part of the UNION is not related to providers, exclude rows.
                       clauses.push('1=0');
                  }
             }
             // If filterEntityId is null (All Clients/Providers), no clause needed here.


             let finalSqlPart = sqlPart;
             const baseWhereAdded = sqlPart.toUpperCase().includes('WHERE'); // Check if base query already has WHERE

             if (clauses.length > 0) {
                 if (baseWhereAdded) {
                     finalSqlPart += ` AND ` + clauses.join(' AND '); // Append after existing WHERE
                 } else {
                     finalSqlPart += ` WHERE ` + clauses.join(' AND '); // Add a new WHERE
                 }
             }

             return { sqlPart: finalSqlPart, params: currentParams };
        };

        console.log('[CashFlow - Backend] Starting query part construction...'); // Log 4

        // Handle the overall Type filter logic with conditional UNIONing
        // If a specific type is filtered, only include the relevant SELECT query.
        let finalSqlParts = [];
        // Apply filters to each part and add to the final list if the type filter allows
        if (!type || type === 'ingreso manual' || type === 'egreso manual') {
            const { sqlPart, params: currentParams } = addFiltersToQueryPart(manualMovementsSql, 'm.Fecha', 'm.Forma_Pago', 'm.Cliente_Proveedor_id', 'manual');
            params.push(...currentParams);
            queryParts.push(sqlPart);
        }
        if (!type || type === 'venta') {
            const { sqlPart, params: currentParams } = addFiltersToQueryPart(ventasSql, 'v.Fecha', 'v.Pago', 'v.Cliente_id', 'cliente');
            params.push(...currentParams);
            queryParts.push(sqlPart);
        }
         if (!type || type === 'ventaX') {
             const { sqlPart, params: currentParams } = addFiltersToQueryPart(ventasXSql, 'vx.Fecha', 'vx.Pago', 'vx.Cliente_id', 'cliente');
              params.push(...currentParams);
              queryParts.push(sqlPart);
         }
          if (!type || type === 'compra') {
              const { sqlPart, params: currentParams } = addFiltersToQueryPart(comprasSql, 'co.Fecha', 'co.Pago', 'co.Proveedor_id', 'proveedor');
               params.push(...currentParams);
               queryParts.push(sqlPart);
          }
           if (!type || type === 'egreso manual' || type === 'gasto') { // Assuming 'gasto' filter should show manual egress
                const { sqlPart, params: currentParams } = addFiltersToQueryPart(gastosSql, 'g.Fecha', 'g.Forma_Pago', null, null); // Gastos don't link to client/provider
                params.push(...currentParams);
                queryParts.push(sqlPart);
           }

        console.log('[CashFlow - Backend] Query part construction finished.'); // Log 5


        let finalSql = '';
        if (queryParts.length > 0) {
            finalSql = queryParts.join(' UNION ALL ');
            finalSql += ` ORDER BY Fecha DESC, id DESC;`; // Apply ordering to the combined result
        } else {
            // If no query parts were included based on the type filter, return an empty array.
            console.log('[CashFlow - Backend] No query parts included based on filters, returning empty.'); // Log 6
            res.json([]);
            return;
        }

        // Add console logs for debugging the generated SQL
        console.log('[CashFlow - Backend] Final SQL Query:'); // Log 7
        console.log(finalSql); // Log 8: The SQL query string
        console.log('[CashFlow - Backend] Final Parameters:', params); // Log 9: The parameters array


        console.log('[CashFlow - Backend] Attempting DB query execution...'); // Log 10
        // Use req.db.execute for async/await with promise-based database interaction
        const [rows, fields] = await req.db.execute(finalSql, params);
        console.log('[CashFlow - Backend] DB query executed successfully.'); // Log 11


        const movements = rows.map(row => {
            // Determine the display name for Client/Provider
            const relatedEntityName = row.Tipo_Cliente_Proveedor === 'cliente' ? row.Nombre_Cliente :
                                      row.Tipo_Cliente_Proveedor === 'proveedor' ? row.Nombre_Proveedor : 'N/A';

            return {
                ...row,
                // Ensure numerical values are parsed correctly, defaulting to 0 if null/invalid
                Monto_USD: parseFloat(row.Monto_USD) || 0,
                Monto_ARS: parseFloat(row.Monto_ARS) || 0,
                Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || 0,
                Nombre_Cliente_Proveedor: relatedEntityName,
                 // Ensure Descripcion_Detalle is never null/undefined for consistency
                Descripcion_Detalle: row.Descripcion_Detalle || 'Sin detalles',
                Notas: row.Notas || '', // Ensure Notes is not null
            };
        });

        console.log('[CashFlow - Backend] Fetched', movements.length, 'movements.'); // Log 12
        res.json(movements); // Send the results as JSON

    } catch (error) {
        console.error('[CashFlow - Backend] Error caught in /movements handler:', error); // Log 13: Error caught
        // Send an error response
        res.status(500).json({ error: 'Error interno del servidor al obtener movimientos de CashFlow.' });
    }
});

// --- Rutas para la gestión de Movimientos Manuales (CRUD en tabla Movimientos) ---

// Agregar un nuevo movimiento manual
router.post('/manual-movements', async (req, res) => {
    const { Fecha, Tipo, Subtipo, Referencia, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas } = req.body;

     if (!Fecha || !Tipo || !Forma_Pago || Monto_USD === undefined || Monto_USD === null || isNaN(parseFloat(Monto_USD)) || parseFloat(Monto_USD) < 0 || Monto_ARS === undefined || Monto_ARS === null || isNaN(parseFloat(Monto_ARS)) || parseFloat(Monto_ARS) < 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
         return res.status(400).json({ error: 'Fecha, Tipo, Forma de Pago, Monto USD (>=0), Monto ARS (>=0) y Cotización Dólar (>0) son campos obligatorios para movimientos manuales.' });
     }
     if (Tipo !== 'ingreso manual' && Tipo !== 'egreso manual') {
         return res.status(400).json({ error: 'Solo se permite agregar movimientos de tipo "ingreso manual" o "egreso manual" por esta ruta.' });
     }
     if (Cliente_Proveedor_id !== undefined && Cliente_Proveedor_id !== null && Cliente_Proveedor_id !== '' && (Tipo_Cliente_Proveedor === undefined || Tipo_Cliente_Proveedor === null || (Tipo_Cliente_Proveedor !== 'cliente' && Tipo_Cliente_Proveedor !== 'proveedor'))) {
          return res.status(400).json({ error: 'Si se proporciona Cliente_Proveedor_id, Tipo_Cliente_Proveedor debe ser "cliente" o "proveedor".' });
     }
      if (Tipo_Cliente_Proveedor !== undefined && Tipo_Cliente_Proveedor !== null && (Cliente_Proveedor_id === undefined || Cliente_Proveedor_id === null || Cliente_Proveedor_id === '')) {
          return res.status(400).json({ error: 'Si se proporciona Tipo_Cliente_Proveedor, Cliente_Proveedor_id no puede estar vacío.' });
      }


    const sql = `
        INSERT INTO Movimientos (Fecha, Tipo, Subtipo, Referencia, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
        Fecha,
        Tipo,
        Subtipo || null,
        Referencia || null,
        Cliente_Proveedor_id !== '' && Cliente_Proveedor_id !== null ? parseInt(Cliente_Proveedor_id, 10) : null,
        Tipo_Cliente_Proveedor || null,
        Forma_Pago,
        Descripcion_Manual || null,
        parseFloat(Monto_USD),
        parseFloat(Monto_ARS),
        parseFloat(Cotizacion_Dolar),
        Notas || null,
    ];

    try {
        const [result] = await req.db.execute(sql, values);
        res.status(201).json({ success: { id: result.insertId } });
    } catch (error) {
        console.error('Error al agregar movimiento manual:', error);
         if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             let userMessage = 'Error: El Cliente o Proveedor asociado no existe.';
              if (Tipo_Cliente_Proveedor) {
                   userMessage = `Error: El ${Tipo_Cliente_Proveedor} asociado no existe.`;
              }
             return res.status(400).json({ error: userMessage });
         }
        res.status(500).json({ error: 'Error interno del servidor al agregar movimiento manual.' });
    }
});

// Obtener un movimiento específico por su ID (incluye manuales y ligados)
router.get('/movements/:id', async (req, res) => {
    const movimientoId = req.params.id;

    const sql = `
        SELECT
            m.id, m.Fecha, m.Tipo, m.Subtipo, m.Referencia, m.Referencia_Id,
            m.Cliente_Proveedor_id, m.Tipo_Cliente_Proveedor, m.Forma_Pago,
            m.Descripcion_Manual, m.Monto_USD, m.Monto_ARS, m.Cotizacion_Dolar, m.Notas,
            c.Empresa AS Nombre_Cliente,
            prov.Empresa AS Nombre_Proveedor
        FROM Movimientos m
        LEFT JOIN Clientes c ON m.Cliente_Proveedor_id = c.id AND m.Tipo_Cliente_Proveedor = 'cliente'
        LEFT JOIN Proveedores prov ON m.Cliente_Proveedor_id = prov.id AND m.Tipo_Cliente_Proveedor = 'proveedor'
        WHERE m.id = ?;
    `;

    try {
        const [rows, fields] = await req.db.execute(sql, [movimientoId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `Movimiento con ID ${movimientoId} no encontrado.` });
        }

        const movimientoData = rows[0];
        const relatedEntityName = movimientoData.Tipo_Cliente_Proveedor === 'cliente' ? movimientoData.Nombre_Cliente :
                                  movimientoData.Tipo_Cliente_Proveedor === 'proveedor' ? movimientoData.Nombre_Proveedor : null;

        const formattedMovimiento = {
             ...movimientoData,
             Nombre_Cliente_Proveedor: relatedEntityName,
             Monto_USD: parseFloat(movimientoData.Monto_USD),
             Monto_ARS: parseFloat(movimientoData.Monto_ARS),
             Cotizacion_Dolar: parseFloat(movimientoData.Cotizacion_Dolar),
        };

        res.json(formattedMovimiento);
    } catch (error) {
        console.error(`Error al obtener movimiento por ID ${movimientoId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al obtener movimiento.' });
    }
});


// Actualizar un movimiento manual existente por su ID
router.put('/manual-movements/:id', async (req, res) => {
    const movimientoId = req.params.id;
    const { Fecha, Tipo, Subtipo, Referencia, Cliente_Proveedor_id, Tipo_Cliente_Proveedor, Forma_Pago, Descripcion_Manual, Monto_USD, Monto_ARS, Cotizacion_Dolar, Notas } = req.body;

     if (!Fecha || !Tipo || !Forma_Pago || Monto_USD === undefined || Monto_USD === null || isNaN(parseFloat(Monto_USD)) || parseFloat(Monto_USD) < 0 || Monto_ARS === undefined || Monto_ARS === null || isNaN(parseFloat(Monto_ARS)) || parseFloat(Monto_ARS) < 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
         return res.status(400).json({ error: 'Fecha, Tipo, Forma de Pago, Monto USD (>=0), Monto ARS (>=0) y Cotización Dólar (>0) son obligatorios para actualizar movimientos manuales.' });
     }
     if (Tipo !== 'ingreso manual' && Tipo !== 'egreso manual') {
          return res.status(400).json({ error: 'Solo se permite actualizar movimientos de tipo "ingreso manual" o "egreso manual" por esta ruta.' });
     }
     if (Cliente_Proveedor_id !== undefined && Cliente_Proveedor_id !== null && Cliente_Proveedor_id !== '' && (Tipo_Cliente_Proveedor === undefined || Tipo_Cliente_Proveedor === null || (Tipo_Cliente_Proveedor !== 'cliente' && Tipo_Cliente_Proveedor !== 'proveedor'))) {
          return res.status(400).json({ error: 'Si se proporciona Cliente_Proveedor_id, Tipo_Cliente_Proveedor debe ser "cliente" o "proveedor".' });
     }
      if (Tipo_Cliente_Proveedor !== undefined && Tipo_Cliente_Proveedor !== null && (Cliente_Proveedor_id === undefined || Cliente_Proveedor_id === null || Cliente_Proveedor_id === '')) {
          return res.status(400).json({ error: 'Si se proporciona Tipo_Cliente_Proveedor, Cliente_Proveedor_id no puede estar vacío.' });
      }


    const sql = `
        UPDATE Movimientos
        SET Fecha = ?, Tipo = ?, Subtipo = ?, Referencia = ?, Cliente_Proveedor_id = ?, Tipo_Cliente_Proveedor = ?, Forma_Pago = ?, Descripcion_Manual = ?, Monto_USD = ?, Monto_ARS = ?, Cotizacion_Dolar = ?, Notas = ?
        WHERE id = ? AND Tipo IN ('ingreso manual', 'egreso manual');
    `;
    const values = [
        Fecha,
        Tipo,
        Subtipo || null,
        Referencia || null,
        Cliente_Proveedor_id !== '' && Cliente_Proveedor_id !== null ? parseInt(Cliente_Proveedor_id, 10) : null,
        Tipo_Cliente_Proveedor || null,
        Forma_Pago,
        Descripcion_Manual || null,
        parseFloat(Monto_USD),
        parseFloat(Monto_ARS),
        parseFloat(Cotizacion_Dolar),
        Notas || null,
        movimientoId,
    ];

    try {
        const [result] = await req.db.execute(sql, values);

        if (result.affectedRows === 0) {
             const [checkRows] = await req.db.execute(`SELECT id, Tipo FROM Movimientos WHERE id = ?`, [movimientoId]);
             if (checkRows.length > 0) {
                 return res.status(400).json({ error: `El movimiento con ID ${movimientoId} no es un movimiento manual o no hubo cambios.` });
             } else {
                return res.status(404).json({ error: `Movimiento con ID ${movimientoId} no encontrado.` });
             }
        }

        res.json({ success: { id: movimientoId, changes: result.affectedRows } });

    } catch (error) {
        console.error(`Error al actualizar movimiento manual con ID ${movimientoId}:`, error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            let userMessage = 'Error: El Cliente o Proveedor asociado no existe.';
            if (Tipo_Cliente_Proveedor) {
                 userMessage = `Error: El ${Tipo_Cliente_Proveedor} asociado no válido.`;
            }
            return res.status(400).json({ error: userMessage });
        }
        res.status(500).json({ error: 'Error interno del servidor al actualizar movimiento manual.' });
    }
});

// Eliminar un movimiento por ID (Solo manuales)
router.delete('/movements/:id', async (req, res) => {
    const movimientoId = req.params.id;

    const [movimientoRows] = await req.db.execute(`
        SELECT Tipo FROM Movimientos WHERE id = ?`, [movimientoId]);

    if (movimientoRows.length > 0 && movimientoRows[0].Tipo !== 'ingreso manual' && movimientoRows[0].Tipo !== 'egreso manual') {
         return res.status(400).json({ error: 'Solo se pueden eliminar movimientos manuales por esta ruta. Elimine la Venta/VentaX/Compra correspondiente para eliminar su movimiento asociado.' });
    }
     if (movimientoRows.length === 0) {
         return res.status(404).json({ error: `Movimiento con ID ${movimientoId} no encontrado.` });
     }


    const sql = `DELETE FROM Movimientos WHERE id = ?`;

    try {
        const [result] = await req.db.execute(sql, [movimientoId]);

        if (result.affectedRows === 0) {
             return res.status(404).json({ error: `No se encontró movimiento con ID ${movimientoId} para eliminar.` });
        }

        res.json({ success: { id: movimientoId, changes: result.affectedRows } });

    } catch (error) {
        console.error(`Error al eliminar movimiento con ID ${movimientoId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar movimiento.' });
    }
});


module.exports = router;
