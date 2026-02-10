// src/components/ListaUsuarios.js
import React, { useState, useEffect } from 'react';

// Acceder a la API expuesta globalmente por el script de precarga
const electronAPI = window.electronAPI;

function ListaUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUserData, setNewUserData] = useState({
        username: '',
        password: '',
        role: 'usuario', // Valor por defecto para el rol
    });
    const [savingData, setSavingData] = useState(false);

    // Define los roles disponibles para el selector
    const rolesDisponibles = ['admin', 'usuario']; // Puedes ajustar esto según tus necesidades

    // Función para obtener la lista de usuarios del backend
    const fetchUsuarios = async () => {
        setLoading(true);
        setError(null);
        try {
            // Asume que tienes un endpoint GET /api/usuarios en tu backend
            // y que apiRequest en preload.js maneja la comunicación HTTP.
            const data = await electronAPI.apiRequest('GET', '/usuarios');
            setUsuarios(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Error al cargar la lista de usuarios.');
            setUsuarios([]); // Limpiar la lista en caso de error
        } finally {
            setLoading(false);
        }
    };

    // Cargar usuarios al montar el componente
    useEffect(() => {
        fetchUsuarios();
        // No necesitamos limpiar listeners IPC si usamos el patrón apiRequest basado en Promises
    }, []);

    // Maneja cambios en el formulario de nuevo usuario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUserData({ ...newUserData, [name]: value });
    };

    // Maneja el envío del formulario para agregar nuevo usuario
    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setSavingData(true);
        setError(null);

        // Validación básica
        if (!newUserData.username || !newUserData.password || !newUserData.role) {
            setError('Usuario, contraseña y rol son obligatorios.');
            setSavingData(false);
            return;
        }

        try {
            // Asume que tienes un endpoint POST /api/usuarios en tu backend
            const response = await electronAPI.apiRequest('POST', '/usuarios', newUserData);
            console.log('Usuario agregado:', response);

            // Limpiar formulario y ocultarlo
            setNewUserData({ username: '', password: '', role: 'usuario' });
            setShowAddForm(false);
            // Recargar la lista de usuarios
            fetchUsuarios();

        } catch (err) {
            console.error('Error adding user:', err);
            setError(err.message || 'Error al agregar el usuario.');
        } finally {
            setSavingData(false);
        }
    };

    // TODO: Implementar funciones para editar y eliminar usuarios si es necesario más adelante.
    // Necesitarías estados para el usuario en edición, un formulario de edición, y endpoints PUT/DELETE en el backend.

    return (
        <div className="container">
            <h2>Gestión de Usuarios</h2>

            {/* Botón para mostrar/ocultar el formulario de agregar */}
            <button onClick={() => setShowAddForm(!showAddForm)} disabled={loading || savingData}>
                {showAddForm ? 'Cancelar' : 'Agregar Nuevo Usuario'}
            </button>

            {/* Formulario para Agregar Nuevo Usuario (Condicional) */}
            {showAddForm && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                    <h3>Agregar Nuevo Usuario</h3>
                    {savingData && <p style={{ color: '#bbdefb' }}>Guardando usuario...</p>}
                    <form onSubmit={handleAddUserSubmit}>
                        <div>
                            <label htmlFor="new-username">Usuario:</label>
                            <input
                                type="text"
                                id="new-username"
                                name="username"
                                value={newUserData.username}
                                onChange={handleInputChange}
                                required
                                disabled={savingData}
                            />
                        </div>
                        <div>
                            <label htmlFor="new-password">Contraseña:</label>
                            <input
                                type="password"
                                id="new-password"
                                name="password"
                                value={newUserData.password}
                                onChange={handleInputChange}
                                required
                                disabled={savingData}
                            />
                        </div>
                         <div>
                            <label htmlFor="new-role">Rol:</label>
                            <select
                                id="new-role"
                                name="role"
                                value={newUserData.role}
                                onChange={handleInputChange}
                                required
                                disabled={savingData}
                            >
                                {rolesDisponibles.map(role => (
                                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                            <button type="submit" disabled={savingData}>Agregar Usuario</button>
                             {/* El botón Cancelar ya es el mismo botón de alternancia */}
                        </div>
                    </form>
                </div>
            )}

            {/* Mostrar errores */}
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

            {/* Lista de Usuarios Existentes */}
            <div style={{ marginTop: '20px' }}>
                <h3>Usuarios Existentes</h3>
                {loading && <p>Cargando usuarios...</p>}

                {!loading && usuarios.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Rol</th>
                                {/* Puedes añadir columnas para created_at/updated_at si quieres mostrarlas */}
                                {/* <th>Fecha Creación</th> */}
                                {/* <th>Última Actualización</th> */}
                                {/* TODO: Columna para Acciones (Editar/Eliminar) */}
                                {/* <th>Acciones</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(usuario => (
                                <tr key={usuario.id}>
                                    <td>{usuario.id}</td>
                                    <td>{usuario.username}</td>
                                    <td>{usuario.role.charAt(0).toUpperCase() + usuario.role.slice(1)}</td>
                                    {/* Formatear y mostrar fechas si las incluyes */}
                                    {/* <td>{usuario.created_at ? new Date(usuario.created_at).toLocaleDateString() : 'N/A'}</td> */}
                                    {/* <td>{usuario.updated_at ? new Date(usuario.updated_at).toLocaleDateString() : 'N/A'}</td> */}
                                    {/* TODO: Celdas para botones de acción */}
                                    {/* <td>
                                        <button disabled={savingData}>Editar</button>
                                        <button disabled={savingData}>Eliminar</button>
                                    </td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    !loading && !error && <p>No hay usuarios registrados.</p>
                )}
            </div>
        </div>
    );
}

export default ListaUsuarios;