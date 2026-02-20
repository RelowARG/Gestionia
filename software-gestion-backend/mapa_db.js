// software-gestion-backend/mapa_db.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;

async function generarMapa() {
    console.log("🔍 Iniciando escáner profundo de la base de datos...");

    try {
        // Consultamos la tabla maestra de MySQL (INFORMATION_SCHEMA)
        const [columnas] = await pool.query(`
            SELECT 
                TABLE_NAME, 
                COLUMN_NAME, 
                DATA_TYPE, 
                CHARACTER_MAXIMUM_LENGTH, 
                IS_NULLABLE, 
                COLUMN_KEY, 
                EXTRA 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
        `);

        if (columnas.length === 0) {
            console.log("⚠️ No se encontraron tablas en la base de datos.");
            process.exit();
        }

        // Agrupamos las columnas por cada tabla
        const mapa = {};
        for (const col of columnas) {
            if (!mapa[col.TABLE_NAME]) {
                mapa[col.TABLE_NAME] = [];
            }
            mapa[col.TABLE_NAME].push(col);
        }

        // Armamos el documento Markdown
        let markdown = "# 🗺️ Mapa Oficial de la Base de Datos - Gestionia\n\n";
        markdown += `*Generado el: ${new Date().toLocaleString()}*\n\n---\n\n`;

        for (const tabla in mapa) {
            markdown += `## 🗄️ Tabla: \`${tabla}\`\n\n`;
            markdown += `| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |\n`;
            markdown += `|---------|--------------|--------|-------|-------|\n`;
            
            for (const col of mapa[tabla]) {
                let tipo = col.CHARACTER_MAXIMUM_LENGTH ? `${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH})` : col.DATA_TYPE;
                let nulo = col.IS_NULLABLE === 'YES' ? 'Sí' : '**NO**';
                let llave = col.COLUMN_KEY ? `**${col.COLUMN_KEY}**` : "-";
                let extra = col.EXTRA ? col.EXTRA : "-";
                
                markdown += `| \`${col.COLUMN_NAME}\` | ${tipo} | ${nulo} | ${llave} | ${extra} |\n`;
            }
            markdown += "\n---\n\n";
        }

        // Guardamos el archivo en tu computadora
        const archivoSalida = path.join(__dirname, 'mapa_base_datos.md');
        fs.writeFileSync(archivoSalida, markdown);

        console.log(`\n✅ ¡Radiografía completada con éxito!`);
        console.log(`📄 Se generó el archivo: mapa_base_datos.md`);
        console.log(`Total de tablas escaneadas: ${Object.keys(mapa).length}`);
        process.exit();

    } catch (error) {
        console.error("❌ Error al escanear la base de datos:", error.message);
        process.exit();
    }
}

generarMapa();