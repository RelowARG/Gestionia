// software-gestion-backend/check_db.js
const { pool } = require('./db');

async function check() {
    try {
        const db = pool.promise();
        console.log("🔌 Conectando a la Base de Datos...");

        // 1. Ver columnas de PRODUCTOS
        console.log("\n📦 TABLA: Productos");
        const [colsProd] = await db.query("SHOW COLUMNS FROM Productos");
        console.log(colsProd.map(c => c.Field).join(", "));

        // 2. Ver columnas de VENTAS
        console.log("\n💰 TABLA: Ventas");
        const [colsVentas] = await db.query("SHOW COLUMNS FROM Ventas");
        console.log(colsVentas.map(c => c.Field).join(", "));

        console.log("\n✅ Listo. Copia esto y pégalo en el chat.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

check();