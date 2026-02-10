// routes/balance.js
const express = require('express');
const router = express.Router();

// Rutas para Balance

// Obtener métricas clave de balance
router.get('/key-metrics', async (req, res) => {
    try {
      // --- Consulta 1: Total Cuentas por Cobrar (Ventas y VentasX pendientes) ---
      const [receivablesRows] = await req.db.execute(`
          SELECT
              SUM(Total) AS Total_Cuentas_Por_Cobrar_USD,
              SUM(Total_ARS) AS Total_Cuentas_Por_Cobrar_ARS
          FROM (
              SELECT Total, Total_ARS, Pago FROM Ventas WHERE LOWER(Pago) != 'abonado' AND Total IS NOT NULL
              UNION ALL
              SELECT Total, Total_ARS, Pago FROM VentasX WHERE LOWER(Pago) != 'abonado' AND Total IS NOT NULL
          ) AS PendingSales;
      `);
      const receivables = receivablesRows[0];

      // --- Consulta 2: Total Cuentas por Pagar (Compras pendientes) ---
      const [payablesRows] = await req.db.execute(`
          SELECT
              SUM(MontoTotal) AS Total_Cuentas_Por_Pagar_USD,
              SUM(Total_ARS) AS Total_Cuentas_Por_Pagar_ARS
          FROM Compras
          WHERE LOWER(Pago) = 'deuda' AND MontoTotal IS NOT NULL;
      `);
      const payables = payablesRows[0];


      // --- Consulta 3: Valor Estimado del Inventario (Stock a Costo USD) ---
      const [inventoryRows] = await req.db.execute(`
          SELECT
              SUM(
                  s.Cantidad * CASE
                      WHEN p.costo_x_rollo IS NOT NULL THEN p.costo_x_rollo
                      WHEN p.costo_x_1000 IS NOT NULL AND p.eti_x_rollo IS NOT NULL AND p.eti_x_rollo > 0 THEN (p.costo_x_1000 / 1000) * p.eti_x_rollo
                      ELSE 0
                  END
              ) AS Valor_Inventario_USD
          FROM Stock s
          JOIN Productos p ON s.Producto_id = p.id
          WHERE s.Cantidad IS NOT NULL AND p.id IS NOT NULL; -- Asegurarse que hay cantidad y producto
      `);
       const inventory = inventoryRows[0];


      const balanceMetrics = {
        receivables: {
           usd: parseFloat(receivables.Total_Cuentas_Por_Cobrar_USD) || 0,
           ars: parseFloat(receivables.Total_Cuentas_Por_Cobrar_ARS) || 0,
        },
        payables: {
           usd: parseFloat(payables.Total_Cuentas_Por_Pagar_USD) || 0,
           ars: parseFloat(payables.Total_Cuentas_Por_Pagar_ARS) || 0,
        },
        inventory: {
           usd: parseFloat(inventory.Valor_Inventario_USD) || 0,
           ars: null
        }
      };

      res.json(balanceMetrics);

    } catch (error) {
      console.error('Error al obtener métricas de balance:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener métricas de balance.' });
    }
  });

module.exports = router;