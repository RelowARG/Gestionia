// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Verificación de seguridad al montar
    useEffect(() => {
        if (!window.electronAPI) {
            setError("CRÍTICO: No se pudo cargar la API del sistema (preload.js). Verifica la consola.");
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!window.electronAPI) {
             setError("Error de sistema: API no disponible.");
             setLoading(false);
             return;
        }

        try {
            const response = await window.electronAPI.apiRequest('POST', '/login', { username, password });

            if (response.success) {
                console.log('Login exitoso:', response.user);
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                
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
                {error && <p style={{ color: '#ef9a9a', fontWeight: 'bold' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button type="submit" disabled={loading || !!(error && error.includes("CRÍTICO"))}>
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Login;