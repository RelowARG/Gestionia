// db.js
const mysql = require('mysql2/promise');

// Configuración de conexión a la base de datos MySQL
// *** REEMPLAZA CON TUS CREDENCIALES ***
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Milo200723!',
  database: 'software_gestion_db'
};

// Middleware para hacer la conexión a la DB disponible en cada solicitud
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

module.exports = dbMiddleware;