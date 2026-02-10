const mysql = require('mysql2');

// Configuración de la conexión
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Milo200723!', // Tu contraseña
    database: 'software_gestion_db'
};

// 1. Creamos un POOL (esencial para que la IA no bloquee el sistema)
const pool = mysql.createPool(dbConfig);

// 2. Middleware para el servidor web
const dbMiddleware = (req, res, next) => {
    req.db = pool.promise();
    next();
};

// 3. ¡IMPORTANTE! Exportamos ambas cosas
module.exports = {
    dbMiddleware,
    pool
};