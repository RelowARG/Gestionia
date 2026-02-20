// software-gestion-backend/importar_excel.js
const fs = require('fs');
const xlsx = require('xlsx');
const dbMiddleware = require('./db'); 
const pool = dbMiddleware.pool;

const NOMBRE_ARCHIVO = 'client 2.xlsx';

async function adaptarBaseDeDatos() {
    try {
        await pool.query("ALTER TABLE Leads_Antiguos ADD COLUMN email VARCHAR(150) DEFAULT NULL");
    } catch (e) {}
}

async function iniciarInyeccionExcel() {
    console.log("🚀 Iniciando Aspiradora de Excel (Modo Cazador de Emails con Regex)...");
    await adaptarBaseDeDatos();

    if (!fs.existsSync(NOMBRE_ARCHIVO)) {
        console.log(`❌ No se encontró el archivo '${NOMBRE_ARCHIVO}'.`);
        process.exit();
    }

    console.log(`📖 Abriendo el archivo Excel...`);
    const workbook = xlsx.readFile(NOMBRE_ARCHIVO);
    
    let insertados = 0, omitidos = 0, yaEranClientes = 0;

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const filas = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        for (const fila of filas) {
            if (!fila || fila.length === 0) continue;

            let nombre = fila[1]; 
            let telefonoRaw = fila[3] || fila[4] || ""; 
            let emailEncontrado = null;

            // 🕵️ CAZADOR DE EMAILS MEJORADO (CON PINZA REGEX)
            for (const celda of fila) {
                if (typeof celda === 'string' && celda.includes('@')) {
                    // Esta fórmula mágica recorta SOLO el email de la cadena de texto gigante
                    const matchEmail = celda.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
                    if (matchEmail && matchEmail[1]) {
                        emailEncontrado = matchEmail[1].toLowerCase().trim().substring(0, 150); // Cortamos a 150 por seguridad extrema
                        break; 
                    }
                }
            }

            // A veces el nombre también quedaba pegado en un choclo gigante, lo limpiamos un poco
            let nombreLimpio = String(nombre || 'Sin Nombre').trim();
            if (nombreLimpio.length > 80) nombreLimpio = "Empresa Ceyal";

            let telefono = "";
            if (typeof telefonoRaw === 'string' || typeof telefonoRaw === 'number') {
                telefono = String(telefonoRaw).replace(/\D/g, ''); 
                if (telefono.length >= 8) { 
                    if (telefono.startsWith('54') && !telefono.startsWith('549')) telefono = telefono.replace(/^54/, '549');
                    if ((telefono.startsWith('11') || telefono.startsWith('2') || telefono.startsWith('3')) && telefono.length >= 10) {
                        telefono = '549' + telefono;
                    }
                }
            }

            // Si tiene un teléfono válido (>=10) O si tiene un email válido, lo procesamos
            if ((telefono.length >= 10) || emailEncontrado) {
                
                let esCliente = false;
                
                // Filtro 1: Buscamos por teléfono en Clientes
                if (telefono.length >= 10) {
                    const ultimos8 = telefono.slice(-8);
                    const [res] = await pool.query(`SELECT Empresa FROM Clientes WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ? LIMIT 1`, [`%${ultimos8}%`]);
                    if (res.length > 0) esCliente = true;
                }

                // Filtro 2: Buscamos por Email en Clientes (Con parche Anti-Caídas)
                if (!esCliente && emailEncontrado) {
                    try {
                        const [res] = await pool.query(`SELECT Empresa FROM Clientes WHERE Email = ? LIMIT 1`, [emailEncontrado]);
                        if (res.length > 0) esCliente = true;
                    } catch (error) {
                        if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
                    }
                }

                if (esCliente) {
                    yaEranClientes++;
                    continue;
                }

                // Filtro 3: Evitar duplicados en la propia tabla del Minero (Leads_Antiguos)
                let queryDuplicado = `SELECT id FROM Leads_Antiguos WHERE `;
                let paramsDuplicado = [];
                if (telefono.length >= 10 && emailEncontrado) {
                    queryDuplicado += `telefono LIKE ? OR email = ? LIMIT 1`;
                    paramsDuplicado = [`%${telefono.slice(-8)}%`, emailEncontrado];
                } else if (telefono.length >= 10) {
                    queryDuplicado += `telefono LIKE ? LIMIT 1`;
                    paramsDuplicado = [`%${telefono.slice(-8)}%`];
                } else {
                    queryDuplicado += `email = ? LIMIT 1`;
                    paramsDuplicado = [emailEncontrado];
                }

                const [yaImportado] = await pool.query(queryDuplicado, paramsDuplicado);
                
                if (yaImportado.length > 0) {
                    omitidos++;
                    continue;
                }

                const nombreEnriquecido = `${nombreLimpio} (Base Histórica Ceyal)`;
                const telFinal = telefono.length >= 10 ? telefono : null;

                // Ahora sí insertamos tranquilos
                await pool.query('INSERT INTO Leads_Antiguos (nombre, telefono, email) VALUES (?, ?, ?)', [nombreEnriquecido, telFinal, emailEncontrado]);
                insertados++;
            } else {
                omitidos++; 
            }
        }
    }

    console.log(`\n✅ ¡Extracción de Mails y Teléfonos Completada a prueba de balas!`);
    console.log(`⛏️  Nuevos Leads (con tel o mail) listos: ${insertados}`);
    console.log(`🛡️  Omitidos (Ya eran tus clientes actuales): ${yaEranClientes}`);
    console.log(`⚠️  Omitidos (Sin ningún dato de contacto útil): ${omitidos}`);
    process.exit();
}

iniciarInyeccionExcel();