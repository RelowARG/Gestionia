// E:\Gestionia\software-gestion-backend\milo_modules\historial.js
const pool = require('../db').pool;

async function obtenerContextoCompleto(clienteId, emailCliente) {
    try {
        const [chats] = await pool.query(
            "SELECT Mensaje, Fecha FROM historial_conversaciones WHERE Cliente_id = ? ORDER BY Fecha DESC LIMIT 10",
            [clienteId]
        );
        let mails = [];
        if (emailCliente) {
            const [rows] = await pool.query(
                "SELECT asunto, cuerpo_texto, fecha FROM historial_emails WHERE direccion_cliente = ? ORDER BY fecha DESC LIMIT 5",
                [emailCliente]
            );
            mails = rows;
        }
        return { chats: chats.reverse(), mails };
    } catch (error) {
        console.error("Error en milo_modules/historial:", error);
        return { chats: [], mails: [] };
    }
}

module.exports = { obtenerContextoCompleto };