const { obtenerConcienciaComercial } = require('./ai_modules/memoriaMilo');
const fs = require('fs');

async function actualizarCerebro() {
    console.log("📊 Extrayendo inteligencia comercial para Milo...");
    const datos = await obtenerConcienciaComercial();
    
    let conocimiento = "CONTEXTO COMERCIAL DE LABELTECH:\n";
    datos.forEach(p => {
        const margen = p.Costo_Promedio_Compra 
            ? (((p.Precio_Venta / p.Costo_Promedio_Compra) - 1) * 100).toFixed(2) 
            : 'Desconocido';
            
        conocimiento += `- Producto: ${p.Nombre} | Precio Venta: $${p.Precio_Venta} | Costo Aprox: $${p.Costo_Promedio_Compra || 'N/A'} | Margen: ${margen}%\n`;
    });

    // Guardamos este resumen en un archivo que la IA leerá siempre
    fs.writeFileSync('./ai_modules/conocimiento_negocio.txt', conocimiento);
    console.log("✅ Conocimiento de productos y costos actualizado.");
}

actualizarCerebro();