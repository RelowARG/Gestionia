const fs = require('fs');
const { preguntarA_MiloLocal } = require('../milo_motor');

async function testConciencia() {
    const conocimiento = fs.readFileSync('./ai_modules/conocimiento_negocio.txt', 'utf8');
    
    const prompt = `
    ${conocimiento}
    
    TAREA:
    Como estratega de Labeltech, analizá los datos de arriba. 
    1. ¿Cuál es el producto con mejor margen?
    2. ¿Ves algún producto cuyo precio de venta esté muy cerca del costo o sea peligroso?
    Responde en español rioplatense.
    `;

    console.log("🧠 Milo analizando márgenes y costos...");
    const respuesta = await preguntarA_MiloLocal(prompt);
    console.log("\n💡 ANALISIS ESTRATEGICO:");
    console.log(respuesta);
}

testConciencia();