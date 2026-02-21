// E:\Gestionia\software-gestion-backend\test_comercial.js
const { obtenerConcienciaComercial } = require('../ai_modules/memoriaMilo');
const { preguntarA_MiloLocal } = require('../milo_motor');

async function ejecutarAnalisisMilo() {
    console.log("📊 Milo está recalibrando los datos comerciales de Labeltech...");
    
    try {
        const datos = await obtenerConcienciaComercial();
        
        if (!datos || datos.length === 0) {
            console.log("⚠️ No se encontraron productos.");
            process.exit();
        }

        let listado = datos.map(p => {
            const costo = Number(p.Costo_Referencia);
            const venta = Number(p.Precio_Venta_Final);
            const lista = Number(p.Precio_Lista);
            
            // Si el costo es 0, Milo debe saber que falta el dato
            const costoTxt = costo > 0 ? `$${costo.toFixed(2)}` : 'DATO FALTANTE';
            
            return `- [${p.codigo}] ${p.Descripcion}:\n  Venta Real (o Lista): $${venta.toFixed(2)} | Costo: ${costoTxt} | Vendidos: ${p.Unidades_Vendidas} | Stock: ${p.Stock_Actual}`;
        }).join('\n');

        const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Eres Milo, el estratega de Labeltech. Analiza rentabilidad real.
Si el Costo es 'DATO FALTANTE', advierte que no puedes calcular margen pero analiza el stock.
Si el precio de Venta Real es igual al de Lista, significa que no hay historial de descuentos aún.
Habla en español rioplatense.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Milo, acá tenés los datos limpios. Analizá dónde podemos ajustar para ganar más:

${listado}

TAREA:
1. Rentabilidad: ¿Cuáles son los 3 productos con margen más claro hoy?
2. Riesgos: ¿Qué productos tienen mucho stock y no tenemos su costo de compra (DATO FALTANTE)?
3. Estrategia: ¿A qué producto le subirías el precio basándote en que se vende mucho?
4. El consejo del socio para cerrar la semana.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

        console.log("🧠 Milo procesando en tu RTX 3080...");
        const respuesta = await preguntarA_MiloLocal(prompt);
        
        console.log("\n📈 INFORME RECALIBRADO DE MILO:");
        console.log("==================================================");
        console.log(respuesta);
        console.log("==================================================");

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        process.exit();
    }
}

ejecutarAnalisisMilo();