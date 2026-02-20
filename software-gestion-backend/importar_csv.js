// software-gestion-backend/importar_csv.js
const fs = require('fs');
const csv = require('csv-parser');
const dbMiddleware = require('./db'); 
const pool = dbMiddleware.pool;

async function importarLeads() {
    console.log("🚀 Iniciando importación del CSV...");

    try {
        // 1. Creamos la tabla si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Leads_Antiguos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255),
                telefono VARCHAR(50),
                contactado BOOLEAN DEFAULT 0,
                fecha_importacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const resultados = [];
        
        // 2. Leemos el archivo
        fs.createReadStream('pribo-i4w6i.csv')
            .pipe(csv())
            .on('data', (data) => resultados.push(data))
            .on('end', async () => {
                let insertados = 0;
                let omitidos = 0;

                for (const fila of resultados) {
                    // Extraemos nombre y teléfono de las columnas del CSV
                    let nombre = fila['Display Name'] || fila['First Name'];
                    let telefonoRaw = fila['Mobile Phone'] || fila['Home Phone'] || fila['Business Phone'];
                    
                    if (nombre && telefonoRaw) {
                        // Limpiamos el número (solo dígitos)
                        let telefono = telefonoRaw.replace(/\D/g, '');
                        
                        // Parche para celulares argentinos
                        if (telefono.startsWith('54') && !telefono.startsWith('549')) {
                            telefono = telefono.replace(/^54/, '549');
                        }
                        if ((telefono.startsWith('11') || telefono.startsWith('2') || telefono.startsWith('3')) && telefono.length === 10) {
                            telefono = '549' + telefono;
                        }

                        if (telefono.length >= 10) {
                            // Insertamos en la nueva tabla
                            await pool.query('INSERT INTO Leads_Antiguos (nombre, telefono) VALUES (?, ?)', [nombre, telefono]);
                            insertados++;
                        } else {
                            omitidos++;
                        }
                    } else {
                        omitidos++;
                    }
                }
                console.log(`✅ ¡Importación completada!`);
                console.log(`📊 Leads guardados exitosamente: ${insertados}`);
                console.log(`⚠️ Filas omitidas (sin número válido): ${omitidos}`);
                process.exit();
            });

    } catch (error) {
        console.error("❌ Error en la base de datos:", error);
        process.exit(1);
    }
}

importarLeads();