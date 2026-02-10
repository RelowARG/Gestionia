// src/components/Login.js (Modificado para almacenar el token)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Acceder a la API expuesta globalmente
const electronAPI = window.electronAPI;

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await electronAPI.apiRequest('POST', '/login', { username, password });

            if (response.success) {
                console.log('Login exitoso:', response.user);
                // --- NUEVO: Almacenar el token y la información del usuario ---
                localStorage.setItem('authToken', response.token); // Guardar el token
                localStorage.setItem('currentUser', JSON.stringify(response.user)); // Guardar info del usuario
                // --- FIN NUEVO ---

                if (onLoginSuccess) {
                    onLoginSuccess(response.user);
                }
                navigate('/');

            } else {
                setError(response.message || 'Error desconocido al iniciar sesión.');
            }

        } catch (err) {
            console.error('Error al intentar iniciar sesión:', err);
            setError(err.message || 'Error de conexión o del servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="username">Usuario:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="password">Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Login;