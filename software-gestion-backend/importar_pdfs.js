// software-gestion-backend/importar_pdfs.js
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const dbMiddleware = require('./db');
const pool = dbMiddleware.pool;

const carpetaPDFs = path.join(__dirname, 'presupuestos_viejos');

const apiKeys = [process.env.MINER_API_KEY, process.env.MINER_API_KEY_2].filter(Boolean);
let currentKeyIndex = 0;

if (apiKeys.length === 0) {
    console.error("❌ No configuraste ninguna MINER_API_KEY en el .env");
    process.exit();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function adaptarBaseDeDatos() {
    try {
        await pool.query("ALTER TABLE Leads_Antiguos ADD COLUMN email VARCHAR(150) DEFAULT NULL");
    } catch (e) {}
}

// 🧠 FUNCIÓN SENIOR: ROTACIÓN POR AGOTAMIENTO (FAILOVER)
async function llamarIAConRotacion(prompt, pdfPart) {
    let intentos = 0;
    
    while (intentos < apiKeys.length) {
        try {
            const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
            const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await aiModel.generateContent([prompt, pdfPart]);
            return result.response.text().trim();
            
        } catch (error) {
            // Si el error es de cuota (429) o límite, rotamos la llave
            if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('ResourceExhausted')) {
                console.log(`   ⚠️ Llave ${currentKeyIndex + 1} agotada. Rotando a la siguiente llave...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                intentos++;
            } else {
                throw error; // Si es un error de formato de PDF, lo lanzamos
            }
        }
    }
    throw new Error('Todas las llaves están agotadas (Error 429).');
}

async function procesarDirectorio() {
    console.log("🚀 Script Senior v7: Rotación Inteligente (Failover) + Mails...");
    await adaptarBaseDeDatos();

    const archivos = fs.readdirSync(carpetaPDFs).filter(file => file.endsWith('.pdf'));
    if (archivos.length === 0) {
        console.log("⚠️ No hay PDFs en la carpeta.");
        process.exit();
    }

    console.log(`🔍 Se encontraron ${archivos.length} PDFs. Iniciando minería...`);

    let insertados = 0, omitidos = 0, procesadosEnLote = 0;

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];

        try {
            console.log(`\n👁️  Analizando: ${archivo} (Usando Llave ${currentKeyIndex + 1})`);
            
            const filePath = path.join(carpetaPDFs, archivo);
            const fileBase64 = fs.readFileSync(filePath).toString("base64");
            const pdfPart = { inlineData: { data: fileBase64, mimeType: "application/pdf" } };

            const prompt = `
                Sos un experto en extracción de datos. Extraé estos 5 datos del PDF adjunto en formato JSON estricto sin markdown:
                - "empresa": Nombre del cliente (A la derecha de "Cliente").
                - "contacto": Nombre de la persona (A la derecha de "Contacto"). Si no hay, null.
                - "telefono": Buscá cualquier número de teléfono/celular. Si no hay, null.
                - "email": Buscá cualquier correo electrónico (@). Si no hay, null.
                - "producto": Debajo de "Descripción", resumí en máximo 5 palabras los productos.
                FORMATO: {"empresa": "Ejemplo","contacto": "Juan","telefono": "112233","email": "a@a.com","producto": "Cinta"}
            `;

            // Llamamos a la función que rota solita si se queda sin tokens
            let respuesta = await llamarIAConRotacion(prompt, pdfPart);
            respuesta = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
            const datosExtraidos = JSON.parse(respuesta);

            let telefonoFinal = null;
            if (datosExtraidos.telefono && datosExtraidos.telefono !== "null") {
                let tel = String(datosExtraidos.telefono).replace(/\D/g, '');
                if (tel.startsWith('54') && !tel.startsWith('549')) tel = tel.replace(/^54/, '549');
                if ((tel.startsWith('11') || tel.startsWith('2') || tel.startsWith('3')) && tel.length === 10) tel = '549' + tel;
                if (tel.length >= 10) telefonoFinal = tel;
            }

            let emailFinal = null;
            if (datosExtraidos.email && datosExtraidos.email.includes('@')) {
                emailFinal = datosExtraidos.email.toLowerCase().trim();
            }

            if (telefonoFinal || emailFinal) {
                let esCliente = false;
                if (telefonoFinal) {
                    const ult = telefonoFinal.slice(-8);
                    const [res] = await pool.query(`SELECT Empresa FROM Clientes WHERE REPLACE(REPLACE(REPLACE(Telefono, '-', ''), ' ', ''), '+', '') LIKE ? LIMIT 1`, [`%${ult}%`]);
                    if (res.length > 0) esCliente = true;
                }
                if (!esCliente && emailFinal) {
                    const [res] = await pool.query(`SELECT Empresa FROM Clientes WHERE Email = ? LIMIT 1`, [emailFinal]);
                    if (res.length > 0) esCliente = true;
                }

                if (esCliente) {
                    console.log(`   ⏭️ Ya es cliente actual.`);
                    omitidos++;
                } else {
                    let nombreEnriquecido = datosExtraidos.empresa || "Cliente sin nombre";
                    if (datosExtraidos.contacto && datosExtraidos.contacto.length > 1) nombreEnriquecido += ` (At: ${datosExtraidos.contacto})`;
                    nombreEnriquecido += ` - Cotizamos: ${datosExtraidos.producto}`;

                    await pool.query('INSERT INTO Leads_Antiguos (nombre, telefono, email) VALUES (?, ?, ?)', [nombreEnriquecido, telefonoFinal, emailFinal]);
                    console.log(`   ✅ Guardado: ${nombreEnriquecido} | Tel: ${telefonoFinal || 'No'} | Mail: ${emailFinal || 'No'}`);
                    insertados++;
                    procesadosEnLote++; // Solo contamos como procesado exitoso si gastó tokens útiles
                }
            } else {
                console.log(`   ⚠️ Sin Teléfono ni Email válidos.`);
                omitidos++;
            }

        } catch (error) {
            if (error.message.includes('429')) {
                console.error(`   ❌ TODAS LAS LLAVES AGOTADAS. Forzando descanso de 1 hora...`);
                // Si agotamos todo, forzamos el lote para que descanse
                procesadosEnLote = 5; 
            } else {
                console.error(`   ❌ Error en ${archivo}:`, error.message);
                omitidos++;
            }
        }

        // --- EL FRENO LENTO (5 exitosos por hora o llaves quemadas) ---
        if (procesadosEnLote >= 5 && i !== archivos.length - 1) {
            console.log(`\n⏳ Lote completado (o llaves agotadas). Descansando 1 HORA para enfriar la API...`);
            await delay(3600000); // 3.600.000 ms = 1 hora
            procesadosEnLote = 0; 
            console.log(`\n▶️ Retomando minería...`);
        }
    }

    console.log(`\n✅ ¡Minería Lenta completada! Nuevos: ${insertados}`);
    process.exit();
}

procesarDirectorio();