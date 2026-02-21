// E:\Gestionia\software-gestion-backend\test_auditoria.js
const { obtenerContextoCompleto } = require('../ai_modules/memoriaMilo');
const { preguntarA_MiloLocal } = require('../milo_motor');

async function examenMilo() {
    // 🚩 CAMBIÁ ESTOS DATOS POR LOS DEL CLIENTE QUE ENCONTRASTE
    const ID_CLIENTE = 157; 
    const MAIL_CLIENTE = 'compras@osvaldotommasi.com';

    console.log(`🔍 Extrayendo cada mail y chat de ${MAIL_CLIENTE}...`);
    
    // Obtenemos la memoria modularizada
    const memoria = await obtenerContextoCompleto(ID_CLIENTE, MAIL_CLIENTE);

    if (memoria.mails.length === 0 && memoria.chats.length === 0) {
        console.log("⚠️ Este cliente no tiene suficiente historial para la prueba.");
        process.exit();
    }

    const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Eres Milo, la memoria viviente de Labeltech. Tu tarea es demostrar que conoces a este cliente a la perfección.
Hablas en español rioplatense. No inventes nada; si no está en los datos, decilo.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Milo, necesito un informe de inteligencia sobre el cliente con mail ${MAIL_CLIENTE}.
Acá tenés los registros encontrados:

CHATS: ${JSON.stringify(memoria.chats)}
MAILS: ${JSON.stringify(memoria.mails)}

TAREA:
1. ¿De qué hablamos la última vez? (Mencioná fechas o temas específicos).
2. ¿Qué productos o servicios nos suele pedir según los correos?
3. ¿Hubo algún problema, queja o consulta técnica importante en el pasado?
4. ¿Cómo es el tono de la relación? ¿Es un cliente difícil, es amable, es puramente técnico?

Demostrame que leíste todo.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

    console.log("🧠 Milo está leyendo el historial en tu RTX 3080...");
    const respuesta = await preguntarA_MiloLocal(prompt);
    
    console.log("\n🕵️ DOSSIER DE CLIENTE POR MILO:");
    console.log("==================================================");
    console.log(respuesta);
    console.log("==================================================");
    process.exit();
}

examenMilo();