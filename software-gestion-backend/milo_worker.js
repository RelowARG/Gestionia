const { miloEscaneoTotal } = require('./test/test_detective_total');
const { analisisTotal } = require('./test_balance');

async function rutinaDiariaMilo() {
    console.log("🌞 Buenos días, Labeltech. Milo iniciando rutina diaria...");

    // 1. Ejecutar el Detective de Ventas
    console.log("🔎 Buscando ventas perdidas...");
    await miloEscaneoTotal();

    // 2. Ejecutar Auditoría Financiera
    console.log("💰 Analizando balance del mes...");
    await analisisTotal();

    console.log("✅ Rutina completada. Insights actualizados en la base de datos.");
}

// Ejecutar cada 24 horas (o podés usar node-cron)
rutinaDiariaMilo();