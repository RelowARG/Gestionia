// routes/estadisticas.js
const express = require('express');
const router = express.Router();

// Rutas para Estadísticas

// Helper function to get the last sale date for each client across Ventas and VentasX
async function getLastSaleDateForClients(db) {
    const [rows, fields] = await db.execute(`
        SELECT
            c.id AS Cliente_id,
            c.Empresa AS Nombre_Cliente,
            c.Cuit AS Cuit_Cliente,
            MAX(Fecha) AS Ultima_Fecha_Venta
        FROM (
            SELECT Cliente_id, Fecha FROM Ventas WHERE Cliente_id IS NOT NULL AND Fecha IS NOT NULL
            UNION ALL
            SELECT Cliente_id, Fecha FROM VentasX WHERE Cliente_id IS NOT NULL AND Fecha IS NOT NULL
        ) AS AllSales
        JOIN Clientes c ON AllSales.Cliente_id = c.id
        GROUP BY c.id, c.Empresa, c.Cuit
        ORDER BY Ultima_Fecha_Venta DESC;
    `);
    return rows;
}


// 1. Clientes que dejaron de comprar en el último tiempo (ej: 6 meses)
router.get('/inactive-clients', async (req, res) => {
    const months = parseInt(req.query.months, 10) || 6;

    try {
        const allClientsLastSale = await getLastSaleDateForClients(req.db);

        const today = new Date();
        const dateThreshold = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
        const year = dateThreshold.getFullYear();
        const month = (dateThreshold.getMonth() + 1).toString().padStart(2, '0');
        const day = dateThreshold.getDate().toString().padStart(2, '0');
        const dateThresholdFormatted = `${year}-${month}-${day}`;


        const inactiveClients = allClientsLastSale.filter(client => {
            if (!client.Ultima_Fecha_Venta) {
                return true; // Clientes sin ventas son inactivos
            }
            // Convertir la fecha de la DB (que viene como string) a objeto Date para comparar
             const lastSaleDate = new Date(client.Ultima_Fecha_Venta);
             // Convertir dateThresholdFormatted a Date para comparación consistente
             const thresholdDateObj = new Date(dateThresholdFormatted);


            return lastSaleDate < thresholdDateObj; // Clientes cuya última venta es ANTES de la fecha límite
        });

        res.json(inactiveClients);

    } catch (error) {
        console.error('Error al obtener clientes inactivos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener clientes inactivos.' });
    }
});

// 2. Mejores Clientes (por Total USD)
router.get('/top-clients', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;

    // Add a basic check to ensure limit is a positive integer
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'El parámetro limit debe ser un número entero positivo.' });
    }

    try {
        // Construct the query string dynamically with the limit value
        const query = `
            SELECT
                c.id AS Cliente_id,
                c.Empresa AS Nombre_Cliente,
                c.Cuit AS Cuit_Cliente,
                SUM(AllSales.Total) AS Total_Ventas_USD
            FROM (
                SELECT Cliente_id, Total FROM Ventas WHERE Total IS NOT NULL
                UNION ALL
                SELECT Cliente_id, Total FROM VentasX WHERE Total IS NOT NULL
            ) AS AllSales
            JOIN Clientes c ON AllSales.Cliente_id = c.id
            WHERE AllSales.Total IS NOT NULL
            GROUP BY c.id, c.Empresa, c.Cuit
            ORDER BY Total_Ventas_USD DESC
            LIMIT ${limit};`; // Embed the limit directly

        // Execute the query without a parameters array
        const [rows, fields] = await req.db.execute(query);

        res.json(rows);

    } catch (error) {
        console.error('Error al obtener mejores clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener mejores clientes.' });
    }
});

// 3. Mejores Productos (por Cantidad vendida)
router.get('/top-products', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;

    // Add a basic check to ensure limit is a positive integer
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'El parámetro limit debe ser un número entero positivo.' });
    }

    try {
        // Construct the query string dynamically with the limit value
        // Use LEFT JOIN from Productos to include products with no sales
        // Use COALESCE to treat products with no sales as having 0 quantity sold
        const query = `
             SELECT
                 p.id AS Producto_id,
                 p.codigo AS Codigo_Producto,
                 p.Descripcion AS Descripcion_Producto,
                 COALESCE(SUM(AllSoldItems.Cantidad), 0) AS Total_Cantidad_Vendida -- Use COALESCE and SUM
             FROM Productos p
             LEFT JOIN (
                 SELECT Producto_id, Cantidad FROM Venta_Items WHERE Producto_id IS NOT NULL
                 UNION ALL
                 SELECT Producto_id, Cantidad FROM VentasX_Items WHERE Producto_id IS NOT NULL
             ) AS AllSoldItems ON p.id = AllSoldItems.Producto_id
             WHERE p.id IS NOT NULL -- Ensure the product exists
             GROUP BY p.id, p.codigo, p.Descripcion
             ORDER BY Total_Cantidad_Vendida DESC
             LIMIT ${limit};`; // Embed the limit directly


        const [rows, fields] = await req.db.execute(query);

        // --- LOG TEMPORAL PARA DEPURACIÓN ---
        console.log('Datos obtenidos para Productos Más Vendidos:', rows);
        // --- FIN LOG TEMPORAL ---


        res.json(rows);

    } catch (error) {
        console.error('Error al obtener mejores productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener mejores productos.' });
    }
});

// 4. Productos Menos Vendidos (por Cantidad vendida)
router.get('/least-sold-products', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;

    // Add a basic check to ensure limit is a positive integer
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'El parámetro limit debe ser un número entero positivo.' });
    }

    try {
        // Construct the query string dynamically with the limit value
        const query = `
             SELECT
                 p.id AS Producto_id,
                 p.codigo AS Codigo_Producto,
                 p.Descripcion AS Descripcion_Producto,
                 COALESCE(SUM(AllSoldItems.Cantidad), 0) AS Total_Cantidad_Vendida -- Usar COALESCE
             FROM Productos p
             LEFT JOIN (
                 SELECT Producto_id, Cantidad FROM Venta_Items WHERE Producto_id IS NOT NULL
                 UNION ALL
                 SELECT Producto_id, Cantidad FROM VentasX_Items WHERE Producto_id IS NOT NULL
             ) AS AllSoldItems ON p.id = AllSoldItems.Producto_id
             GROUP BY p.id, p.codigo, p.Descripcion
             ORDER BY Total_Cantidad_Vendida ASC
             LIMIT ${limit};`; // Embed the limit directly

        const [rows, fields] = await req.db.execute(query);

        res.json(rows);

    } catch (error) {
        console.error('Error al obtener productos menos vendidos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos menos vendidos.' });
    }
});

// 5. Mejores meses (por Total USD)
router.get('/top-months', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 12;

    // Add a basic check to ensure limit is a positive integer
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'El parámetro limit debe ser un número entero positivo.' });
    }

    try {
        // Construct the query string dynamically with the limit value
        const query = `
             SELECT
                 DATE_FORMAT(Fecha, '%Y-%m') AS Anio_Mes,
                 SUM(Total) AS Total_Ventas_USD,
                 SUM(Total_ARS) AS Total_Ventas_ARS
             FROM (
                 SELECT Fecha, Total, Total_ARS FROM Ventas WHERE Fecha IS NOT NULL
                 UNION ALL
                 SELECT Fecha, Total, Total_ARS FROM VentasX WHERE Fecha IS NOT NULL
             ) AS AllSales
             WHERE Fecha IS NOT NULL AND Total IS NOT NULL
             GROUP BY Anio_Mes
             ORDER BY Total_Ventas_USD DESC
             LIMIT ${limit};`; // Embed the limit directly


        const [rows, fields] = await req.db.execute(query);

        res.json(rows);

    } catch (error) {
        console.error('Error al obtener mejores meses:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener mejores meses.' });
    }
});

// 6. Comparativa de Ventas Mensuales/Anuales
router.get('/sales-comparison', async (req, res) => {
    const period = req.query.period || 'month';

    let groupBy = '';
    if (period === 'month') {
        groupBy = "DATE_FORMAT(Fecha, '%Y-%m')";
    } else if (period === 'year') {
        groupBy = "DATE_FORMAT(Fecha, '%Y')";
    } else {
        return res.status(400).json({ error: 'Período de comparación no válido. Use "month" o "year".' });
    }

    try {
        const [rows, fields] = await req.db.execute(`
            SELECT
                ${groupBy} AS Periodo,
                SUM(Total) AS Total_Ventas_USD,
                SUM(Total_ARS) AS Total_Ventas_ARS
            FROM (
                SELECT Fecha, Total, Total_ARS FROM Ventas WHERE Fecha IS NOT NULL
                UNION ALL
                SELECT Fecha, Total, Total_ARS FROM VentasX WHERE Fecha IS NOT NULL
            ) AS AllSales
            WHERE Fecha IS NOT NULL
            GROUP BY Periodo
            ORDER BY Periodo ASC;`);

        res.json(rows);

    } catch (error) {
        console.error('Error al obtener comparativa de ventas:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener comparativa de ventas.' });
    }
});

// 7. Stock vs. Rotación de Productos
router.get('/stock-rotation', async (req, res) => {
    const months = parseInt(req.query.months, 10) || 12;

    const today = new Date();
    const dateThreshold = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
    const year = dateThreshold.getFullYear();
    const month = (dateThreshold.getMonth() + 1).toString().padStart(2, '0');
    const day = dateThreshold.getDate().toString().padStart(2, '0');
    const dateThresholdFormatted = `${year}-${month}-${day}`;

    // --- LOG: Fecha límite utilizada ---
    console.log('[estadisticas.js - stock-rotation] Fecha límite para ventas:', dateThresholdFormatted);

    try {
        const [rows, fields] = await req.db.execute(`
             SELECT
                 p.id AS Producto_id,
                 p.codigo AS Codigo_Producto,
                 p.Descripcion AS Descripcion_Producto,
                 COALESCE(s.Cantidad, 0) AS Stock_Actual,
                 COALESCE(SUM(CASE WHEN AllSoldItems.Fecha >= ? THEN AllSoldItems.Cantidad ELSE 0 END), 0) AS Total_Cantidad_Vendida_Periodo
             FROM Productos p
             LEFT JOIN Stock s ON p.id = s.Producto_id
             LEFT JOIN (
                 SELECT Producto_id, Cantidad, v.Fecha FROM Venta_Items vi JOIN Ventas v ON vi.Venta_id = v.id WHERE vi.Producto_id IS NOT NULL AND v.Fecha IS NOT NULL
                 UNION ALL
                 SELECT Producto_id, Cantidad, vx.Fecha FROM VentasX_Items vxi JOIN VentasX vx ON vxi.VentaX_id = vx.id WHERE vxi.Producto_id IS NOT NULL AND vx.Fecha IS NOT NULL
             ) AS AllSoldItems ON p.id = AllSoldItems.Producto_id
             WHERE p.id IS NOT NULL -- Asegurarse que el producto existe
             GROUP BY p.id, p.codigo, p.Descripcion, s.Cantidad
             ORDER BY p.codigo ASC;`, [dateThresholdFormatted]);

        // --- LOG: Resultados crudos de la consulta SQL ---
        console.log('[estadisticas.js - stock-rotation] Resultados crudos de la consulta:', rows);


        const totalDaysInPeriod = months * 30.44;
        const totalWeeksInPeriod = totalDaysInPeriod / 7;

        const stockRotationData = rows.map(row => {
            const stockActual = parseFloat(row.Stock_Actual) || 0;
            const totalCantidadVendida = parseFloat(row.Total_Cantidad_Vendida_Periodo) || 0;

            const avgWeeklySales = totalWeeksInPeriod > 0 ? totalCantidadVendida / totalWeeksInPeriod : 0;

            const weeksOfStock = avgWeeklySales > 0 ? stockActual / avgWeeklySales : (stockActual > 0 ? Infinity : 0);

            return {
                ...row,
                Stock_Actual: stockActual,
                Total_Cantidad_Vendida_Periodo: totalCantidadVendida,
                Periodo_Meses: months,
                Semanas_de_Stock: weeksOfStock,
            };
        });

        // --- LOG: Datos después del cálculo en el backend ---
        console.log('[estadisticas.js - stock-rotation] Datos después del cálculo:', stockRotationData);


        res.json(stockRotationData);

    } catch (error) {
        console.error('Error al obtener datos de rotación de stock:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener datos de rotación de stock.' });
    }
});


module.exports = router;
