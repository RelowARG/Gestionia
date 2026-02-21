// software-gestion-backend/db.js
require('dotenv').config(); // Cargar variables de entorno desde el archivo .env
const mysql = require('mysql2/promise');

// Configuración de conexión a la base de datos MySQL usando variables de entorno
// Se dejan los valores por defecto a la derecha (||) por seguridad si el .env falla
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Milo200723!',
  database: process.env.DB_NAME || 'software_gestion_db'
};

// 1. Crear Pool para los servicios en segundo plano (WhatsApp, Scheduler, IA)
// Esto permite que los módulos independientes accedan a la DB sin depender del request HTTP
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Middleware para hacer la conexión a la DB disponible en cada solicitud HTTP (Lógica Original)
const dbMiddleware = async (req, res, next) => {
  try {
    req.db = await mysql.createConnection(dbConfig);
    next();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    res.status(500).send('Error interno del servidor al conectar a la base de datos.');
  }
  
  // Cierra la conexión al finalizar la respuesta
  res.on('finish', async () => {
      if (req.db) {
          try {
              await req.db.end();
              // console.log('Conexión a DB cerrada.'); // Opcional: para debug
          } catch (closeError) {
              console.error('Error al cerrar la conexión a DB:', closeError);
          }
      }
  });
};

// Exportamos el middleware como default (para mantener compatibilidad con server.js viejo)
// Y adjuntamos el pool como propiedad
module.exports = dbMiddleware;
module.exports.pool = pool;