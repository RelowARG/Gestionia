// software-gestion-backend/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuramos el "Cartero" con las llaves de tu .env
const transporter = nodemailer.createTransport({
    service: 'gmail', // Podés cambiarlo si usás Outlook o un correo de servidor propio (ej: Hostinger)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarCorreoMilo(destinatario, asunto, cuerpoTexto) {
    try {
        const mailOptions = {
            from: `"Milo de Labeltech" <${process.env.EMAIL_USER}>`, // El nombre que verá el cliente
            to: destinatario,
            subject: asunto,
            text: cuerpoTexto // Enviamos en texto plano para que no caiga en Promociones
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Mail enviado con éxito a: ${destinatario} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando mail a ${destinatario}:`, error.message);
        return false;
    }
}

// Bloque de prueba (solo se ejecuta si corrés este archivo directamente)
if (require.main === module) {
    console.log("Probando motor de correos...");
    // Cambiá este mail por uno tuyo personal para hacer la prueba
    enviarCorreoMilo('juliangrlw@gmail.com', '¡Hola desde Gestionia!', 'Si te llega esto, Milo ya sabe mandar mails. ¡Abrazo!')
        .then(() => process.exit());
}

module.exports = { enviarCorreoMilo };