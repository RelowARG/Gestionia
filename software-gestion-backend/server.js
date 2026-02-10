// software-gestion-backend/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dbMiddleware = require('./db'); // Importa el middleware de DB

// Importa los módulos de rutas modularizados existentes
const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const proveedoresRoutes = require('./routes/proveedores');
const gastosRoutes = require('./routes/gastos');
const stockRoutes = require('./routes/stock');
const presupuestosRoutes = require('./routes/presupuestos');
const ventasRoutes = require('./routes/ventas');
const ventasXRoutes = require('./routes/ventasx');
const cashflowRoutes = require('./routes/cashflow');
const estadisticasRoutes = require('./routes/estadisticas');
const balanceRoutes = require('./routes/balance');
const comprasRoutes = require('./routes/compras');
const usuariosRoutes = require('./routes/usuarios');

// --- NUEVOS IMPORTS PARA IA Y WHATSAPP ---
const iaRoutes = require('./routes/ia'); // Rutas para el chat y tareas
const { iniciarWhatsApp } = require('./services/whatsappService'); // Servicio de WhatsApp
const { initScheduler } = require('./ai_modules/scheduler'); // Programador de tareas diarias
// -----------------------------------------

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors()); 

// Usa el middleware de conexión a la base de datos
app.use(dbMiddleware);

// --- Middleware de autenticación ---
const authenticateToken = (req, res, next) => {
    // Permitir login y rutas de IA sin token estricto (para facilitar uso del widget)
    if (req.path === '/login' || req.path.startsWith('/ia')) {
        console.log(`[AuthMiddleware] Permitiendo acceso público a: ${req.path}`);
        return next();
    }
     console.log(`[AuthMiddleware] Verificando token para ruta: ${req.method} ${req.path}`);

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.warn('[AuthMiddleware] Acceso denegado: Token no proporcionado.');
        return res.status(401).json({ error: 'No autenticado: Token no proporcionado.' });
    }

    const FAKE_AUTH_TOKEN = 'fake-auth-token'; 

    if (token !== FAKE_AUTH_TOKEN) {
         console.warn('[AuthMiddleware] Acceso denegado: Token inválido.');
         return res.status(403).json({ error: 'No autorizado: Token inválido.' });
    }

    console.log('[AuthMiddleware] Solicitud autenticada (fake) permitida.');
    next(); 
};

app.use('/api', authenticateToken);
// --- FIN Middleware de autenticación ---


// Monta los routers en sus rutas base correspondientes.
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/ventasx', ventasXRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// --- MONTAJE DE NUEVAS RUTAS ---
app.use('/api/ia', iaRoutes);
// ------------------------------


// Ruta de login
app.post('/api/login', async (req, res) => {
    console.log('[LoginEndpoint] Solicitud de login recibida.');
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }

    try {
        const [rows] = await req.db.execute('SELECT * FROM Usuarios WHERE username = ?', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
             const FAKE_AUTH_TOKEN = 'fake-auth-token'; 
             const userInfo = {
                 id: user.id,
                 username: user.username,
                 role: user.role,
             };
             res.json({ success: true, message: 'Inicio de sesión exitoso.', user: userInfo, token: FAKE_AUTH_TOKEN });

        } else {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error('[LoginEndpoint] Error en el endpoint de login:', error);
        res.status(500).json({ error: 'Error interno del servidor al intentar iniciar sesión.' });
    }
});


// Ruta principal de la API
app.get('/api', (req, res) => {
    res.send('Backend de software-gestion V2 está funcionando modularmente (autenticado).');
});


// Inicia el servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend de software-gestion V2 escuchando en todas las interfaces de red en el puerto ${port}`);
  
  // --- INICIAR SERVICIOS BACKGROUND ---
  iniciarWhatsApp(); // Inicia cliente de WhatsApp (mostrará QR en consola)
  initScheduler();   // Inicia el cron job para análisis diario
  // ------------------------------------
});

// Manejo de cierre de DB si el proceso del servidor se detiene
process.on('SIGINT', async () => {
    console.log('Cerrando servidor y saliendo...');
    process.exit(0);
});