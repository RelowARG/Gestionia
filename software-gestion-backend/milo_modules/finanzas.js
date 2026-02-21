// E:\Gestionia\software-gestion-backend\milo_modules\finanzas.js
const pool = require('../db').pool;

async function obtenerBalanceFinanciero() {
    try {
        const [ingresos] = await pool.query(`
            SELECT SUM(Total_ARS) as total FROM (
                SELECT Total_ARS FROM ventas WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                UNION ALL
                SELECT Total_ARS FROM ventasx WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ) as t
        `);

        const [gastos] = await pool.query(`
            SELECT SUM(Monto_Pesos) as total FROM gastos 
            WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        return {
            ingresos: ingresos[0].total || 0,
            gastos: gastos[0].total || 0,
            balance: (ingresos[0].total || 0) - (gastos[0].total || 0)
        };
    } catch (error) {
        console.error("Error en milo_modules/finanzas:", error);
        return { ingresos: 0, gastos: 0, balance: 0 };
    }
}

module.exports = { obtenerBalanceFinanciero };