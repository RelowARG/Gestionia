// routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Ya tienes bcrypt instalado según package.json

// Helper para hashear contraseñas
const hashPassword = async (password) => {
    const saltRounds = 10; // Número de rondas de sal para bcrypt
    return bcrypt.hash(password, saltRounds);
};

// Rutas para la gestión de Usuarios

// Obtener todos los usuarios (solo para administradores, por ejemplo)
// NOTA: Deberías añadir lógica de autorización aquí para restringir el acceso
router.get('/', async (req, res) => {
    try {
        // Implementar lógica de autorización: solo administradores pueden listar usuarios
        // if (req.user.role !== 'admin') { // Suponiendo que la información del usuario se adjunta a req.user
        //     return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        // }

        // No seleccionar el hash de la contraseña por seguridad
        const [rows, fields] = await req.db.execute('SELECT id, username, role FROM Usuarios');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener usuarios.' });
    }
});

// Obtener un usuario específico por ID (solo para administradores o el propio usuario)
router.get('/:id', async (req, res) => {
    const userId = req.params.id;

    // Implementar lógica de autorización: solo administradores o el usuario con el ID solicitado
    // if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
    //     return res.status(403).json({ error: 'Acceso denegado.' });
    // }

    try {
        // No seleccionar el hash de la contraseña por seguridad
        const [rows, fields] = await req.db.execute('SELECT id, username, role FROM Usuarios WHERE id = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `Usuario con ID ${userId} no encontrado.` });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(`Error al obtener usuario por ID ${userId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al obtener usuario.' });
    }
});

// Agregar un nuevo usuario (solo para administradores)
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

    // Implementar lógica de autorización: solo administradores pueden crear usuarios
    // if (req.user.role !== 'admin') {
    //     return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    // }

    // Validación básica
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Usuario, contraseña y rol son obligatorios.' });
    }

    try {
        const hashedPassword = await hashPassword(password); // Hashear la contraseña

        const sql = `INSERT INTO Usuarios (username, password, role) VALUES (?, ?, ?)`;
        const values = [username, hashedPassword, role];

        const [result] = await req.db.execute(sql, values);
        // No devolver el hash de la contraseña en la respuesta
        res.status(201).json({ success: { id: result.insertId, username: username, role: role } });
    } catch (error) {
        console.error('Error al agregar usuario:', error);
        let userMessage = 'Error interno del servidor al agregar usuario.';
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('username')) {
            userMessage = 'Error: El nombre de usuario ya existe.';
        }
        res.status(500).json({ error: userMessage });
    }
});

// Actualizar un usuario existente por ID (solo para administradores o el propio usuario)
router.put('/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, password, role } = req.body; // Password es opcional en actualización

    // Implementar lógica de autorización: solo administradores o el usuario con el ID solicitado
    // if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
    //     return res.status(403).json({ error: 'Acceso denegado.' });
    // }

    // Validación básica
    if (!username || !role) {
        return res.status(400).json({ error: 'Usuario y rol son obligatorios para actualizar.' });
    }

    let sql = `UPDATE Usuarios SET username = ?, role = ?`;
    const values = [username, role];

    if (password) { // Si se proporciona una nueva contraseña, hashearla
        const hashedPassword = await hashPassword(password);
        sql += `, password = ?`;
        values.push(hashedPassword);
    }

    sql += ` WHERE id = ?`;
    values.push(userId);

    try {
        const [result] = await req.db.execute(sql, values);

        if (result.affectedRows === 0) {
            // Verificar si el usuario existe pero no hubo cambios (o si no existe)
             const [checkRows] = await req.db.execute('SELECT id FROM Usuarios WHERE id = ?', [userId]);
             if (checkRows.length === 0) {
                 return res.status(404).json({ error: `Usuario con ID ${userId} no encontrado para actualizar.` });
             } else {
                  // Usuario encontrado pero no hubo cambios en los datos proporcionados
                 res.json({ success: { id: userId, changes: 0, message: 'Usuario encontrado, pero no se realizaron cambios.' } });
             }
        } else {
             // Usuario actualizado
             res.json({ success: { id: userId, changes: result.affectedRows } });
        }

    } catch (error) {
        console.error(`Error al actualizar usuario con ID ${userId}:`, error);
        let userMessage = 'Error interno del servidor al actualizar usuario.';
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('username')) {
            userMessage = 'Error: El nombre de usuario ya existe.';
        }
        res.status(500).json({ error: userMessage });
    }
});

// Eliminar un usuario por ID (solo para administradores)
router.delete('/:id', async (req, res) => {
    const userId = req.params.id;

    // Implementar lógica de autorización: solo administradores pueden eliminar usuarios
    // if (req.user.role !== 'admin') {
    //     return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    // }

     // Opcional: Prevenir la eliminación del último administrador o de uno mismo
     // const [adminCount] = await req.db.execute("SELECT COUNT(*) as count FROM Usuarios WHERE role = 'admin'");
     // if (req.user.id === parseInt(userId, 10)) {
     //      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta si eres el último administrador.' });
     // }
     // if (adminCount[0].count === 1 && (await req.db.execute("SELECT role FROM Usuarios WHERE id = ?", [userId]))[0][0].role === 'admin') {
     //     return res.status(400).json({ error: 'No se puede eliminar el último usuario administrador.' });
     // }


    const sql = `DELETE FROM Usuarios WHERE id = ?`;

    try {
        const [result] = await req.db.execute(sql, [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `No se encontró usuario con ID ${userId} para eliminar.` });
        }

        // Considerar qué hacer con los registros creados/modificados por este usuario (si implementas el paso 4)
        // Podrías establecerlos a NULL, a un usuario genérico "eliminado", o impedir la eliminación si tienen registros asociados.
        // Si implementas FKs con ON DELETE, la base de datos manejará esto.

        res.json({ success: { id: userId, changes: result.affectedRows } });
    } catch (error) {
        console.error(`Error al eliminar usuario con ID ${userId}:`, error);
        let userMessage = 'Error interno del servidor al eliminar usuario.';
         // Manejar error si el usuario tiene registros asociados (si implementaste FKs)
         if (error.code === 'ER_ROW_IS_REFERENCED_2') {
              userMessage = 'No se puede eliminar el usuario porque tiene registros asociados (ventas, etc.).';
         }
        res.status(500).json({ error: userMessage });
    }
});


module.exports = router;