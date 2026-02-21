// E:\Gestionia\software-gestion-backend\test_balance.js
const { obtenerConcienciaComercial, obtenerBalanceFinanciero } = require('../ai_modules/memoriaMilo');
const { preguntarA_MiloLocal } = require('../milo_motor');

async function analisisTotal() {
    console.log("📈 Milo está auditando las cuentas de Labeltech...");
    
    try {
        const balance = await obtenerBalanceFinanciero();
        const productos = await obtenerConcienciaComercial();
        
        let resumenProductos = productos.slice(0, 10).map(p => 
            `- [${p.codigo}] ${p.Descripcion}: Venta $${Number(p.Precio_Venta_Final).toFixed(2)} | Costo: $${Number(p.Costo_Referencia).toFixed(2)}`
        ).join('\n');

        const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Eres Milo, el Director Financiero de Labeltech. Tu objetivo es la rentabilidad neta.
Hablas en español rioplatense (Argentina). Eres serio con los números pero motivador.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Milo, acá tenés la situación de los últimos 30 días en la fábrica:

INGRESOS TOTALES (Ventas A + X): $${Number(balance.ingresos).toLocaleString('es-AR')}
GASTOS TOTALES (Operativos/Gastos): $${Number(balance.gastos).toLocaleString('es-AR')}
BALANCE NETO: $${Number(balance.balance).toLocaleString('es-AR')}

MARGENES DE PRODUCTOS TOP:
${resumenProductos}

TAREA:
1. Análisis del Balance: ¿Cómo estamos de salud financiera este mes?
2. Punto de Equilibrio: Mirando los márgenes, ¿ves productos que "empujan" el negocio hacia arriba y otros que son un lastre?
3. Estrategia de Caja: Si el balance es bajo o negativo, ¿qué producto deberíamos salir a vender mañana mismo para revertirlo?
4. El consejo del socio: Una acción concreta para mejorar la rentabilidad.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

        console.log("🧠 Milo está haciendo cálculos de rentabilidad...");
        const respuesta = await preguntarA_MiloLocal(prompt);
        
        console.log("\n💰 AUDITORÍA FINANCIERA DE MILO:");
        console.log("==================================================");
        console.log(respuesta);
        console.log("==================================================");

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        process.exit();
    }
}

analisisTotal();