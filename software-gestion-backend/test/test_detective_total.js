// E:\Gestionia\software-gestion-backend\test\test_detective_total.js
const pool = require('../db').pool; // Subimos un nivel para encontrar db.js
const { obtenerContextoCompleto } = require('../ai_modules/memoriaMilo'); // Ajustado el path
const { preguntarA_MiloLocal } = require('../milo_motor'); // Ajustado el path

async function miloEscaneoTotal() {
    console.log("🚀 INICIANDO ESCANEO TOTAL DE CLIENTES - Modo Detective...");
    const tiempoInicio = Date.now();

    try {
        // 1. Traemos TODOS los clientes basándonos en el mapa oficial
        const [clientes] = await pool.query("SELECT id, Empresa, Mail FROM clientes");
        console.log(`📋 Total de clientes a investigar: ${clientes.length}`);
        console.log("--------------------------------------------------");

        let encontrados = 0;

        for (let i = 0; i < clientes.length; i++) {
            const cliente = clientes[i];
            const progreso = `[${i + 1}/${clientes.length}]`;

            // 2. Obtenemos la memoria (WhatsApp + Mails) del cliente
            const memoria = await obtenerContextoCompleto(cliente.id, cliente.Mail);

            // 3. Verificamos si hay historial real para procesar
            if (memoria.chats.length === 0 && memoria.mails.length === 0) {
                continue; 
            }

            console.log(`${progreso} 🔎 Investigando a: ${cliente.Empresa || 'Sin Nombre'}...`);

            const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Eres Milo, el detective comercial de Labeltech. Tu misión es detectar VENTAS PERDIDAS o PROMESAS OLVIDADAS.
Analiza la conversación y busca hilos sueltos. 
Si el cliente no habla hace mucho pero la última charla quedó en "veremos", avísame.
Habla en español rioplatense. Sé muy breve y directo.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Milo, analicemos este historial de "${cliente.Empresa}":

DATOS: ${JSON.stringify(memoria)}

TAREA:
1. ¿Hay alguna oportunidad de venta que quedó "en el aire"?
2. ¿Cuándo fue la última vez que mostraron interés real?
3. Acción recomendada (ej: "Llamalo para cerrar el tema del Ribbon").

Si no hay nada concreto para vender o reclamar, responde estrictamente: "NADA".
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

            // 4. Llamada a la RTX 3080/3070 local
            const respuesta = await preguntarA_MiloLocal(prompt);

            if (respuesta && !respuesta.includes("NADA")) {
                encontrados++;
                console.log(`\n🚨 ¡ALERTA DE OPORTUNIDAD! (#${encontrados})`);
                console.log(`🏢 Cliente: ${cliente.Empresa} (${cliente.Mail})`);
                console.log(`💡 Informe de Milo:\n${respuesta}`);
                console.log("--------------------------------------------------");
            }
        }

        const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(2);
        console.log(`\n🏁 Escaneo finalizado en ${tiempoTotal} segundos.`);
        console.log(`✅ Se analizaron todos los clientes con historial.`);
        console.log(`📈 Total de oportunidades detectadas: ${encontrados}`);

    } catch (error) {
        console.error("❌ Error crítico en el escaneo:", error.message);
    } finally {
        process.exit();
    }
}

miloEscaneoTotal();