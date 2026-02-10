// software-gestion-backend/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

// CAMBIO IMPORTANTE: Usamos { } porque db.js ahora exporta varias cosas
const { dbMiddleware } = require('./db'); 

// Importa los módulos de rutas
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
const iaRoutes = require('./routes/ia');
const { initScheduler } = require('./ai_modules/scheduler');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors()); 

// Usa el middleware de base de datos
app.use(dbMiddleware);

// ==========================================
// 🔓 ZONA PÚBLICA (IA y Login)
// ==========================================

// La IA va PRIMERO para evitar problemas de token
console.log("Cargando rutas de IA...");
app.use('/api/ia', iaRoutes);

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos.' });

    try {
        const [rows] = await req.db.execute('SELECT * FROM Usuarios WHERE username = ?', [username]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const FAKE_AUTH_TOKEN = 'fake-auth-token'; 
        res.json({ 
            success: true, 
            message: 'Login exitoso.', 
            user: { id: user.id, username: user.username, role: user.role }, 
            token: FAKE_AUTH_TOKEN 
        });

    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ==========================================
// 🔒 ZONA PRIVADA (Requiere Token)
// ==========================================

const authenticateToken = (req, res, next) => {
    // Excepción extra por seguridad
    if (req.path === '/login' || req.path.startsWith('/ia')) return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token !== 'fake-auth-token') {
         return res.status(403).json({ error: 'Token inválido o no proporcionado.' });
    }
    next(); 
};

app.use('/api', authenticateToken);

// Rutas protegidas
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

// Inicia el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    initScheduler(); // Inicia el cron de la IA
});