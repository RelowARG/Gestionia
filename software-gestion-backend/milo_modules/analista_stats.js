// E:\Gestionia\software-gestion-backend\milo_modules\analista_stats.js
const pool = require('../db').pool;

/**
 * Traduce la lógica de Statistics.js a datos para Milo.
 */
async function obtenerResumenEstadistico() {
    try {
        // 1. Mejores Clientes (Top 5 por USD)
        const [topClientes] = await pool.query(`
            SELECT c.Empresa, SUM(v.Total_USD) as total_usd
            FROM clientes c
            JOIN ventas v ON v.Cliente_id = c.id
            GROUP BY c.id ORDER BY total_usd DESC LIMIT 5
        `);

        // 2. Rotación de Stock (Productos para comprar)
        // Filtramos por recomendación 'Comprar Más' o 'Sin Stock'
        const [rotacion] = await pool.query(`
            SELECT p.codigo, p.Descripcion, IFNULL(s.Cantidad, 0) as stock
            FROM productos p
            LEFT JOIN stock s ON p.id = s.Producto_id
            WHERE s.Cantidad <= 5 -- Lógica simplificada de alerta
            LIMIT 5
        `);

        // 3. Clientes Inactivos (No compran hace 6 meses)
        const [inactivos] = await pool.query(`
            SELECT Empresa, Mail FROM clientes 
            WHERE id NOT IN (
                SELECT Cliente_id FROM ventas WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 6 DAY)
            ) LIMIT 5
        `);

        return {
            topClientes,
            alertaStock: rotacion,
            clientesRecuperables: inactivos
        };
    } catch (error) {
        console.error("Error en milo_modules/analista_stats:", error);
        return null;
    }
}

module.exports = { obtenerResumenEstadistico };