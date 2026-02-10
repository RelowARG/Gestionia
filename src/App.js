// src/App.js
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importar tus componentes
import Navbar from './components/Navbar';
import Home from './components/Home';
import ListaClientes from './components/ListaClientes';
import ListaVentas from './components/ListaVentas';
import ListaProductos from './components/ListaProductos';
import ListaProveedores from './components/ListaProveedores';
import ListaCompras from './components/ListaCompras';
import ListaStock from './components/ListaStock';
import ListaPresupuestos from './components/ListaPresupuestos';
import ListaVentasX from './components/ListaVentasX';
// Importar ListaVentasGlobal y VentaEditor
import ListaVentasGlobal from './components/ListaVentasGlobal';
import VentaEditor from './components/ventas/VentaEditor';
// Importar ListaVentasXGlobal y el nuevo VentaXEditor
import ListaVentasXGlobal from './components/ListaVentasXGlobal';
import VentaXEditor from './components/ventasx/VentaXEditor';
import ListaComprasGlobal from './components/ListaComprasGlobal';
import CashFlow from './components/CashFlow';
import Statistics from './components/Statistics';
import Balance from './components/Balance';
import Login from './components/Login';
import ListaUsuarios from './components/ListaUsuarios';

// --- NUEVO COMPONENTE IA ---
import IAWidget from './components/IAWidget';
// ---------------------------

// Importar el archivo CSS
import './styles.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        console.log('[App.js] Checking authentication state...');
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setIsAuthenticated(true);
                setUser(userData);
                console.log('[App.js] User found in localStorage, authenticated:', userData.username);
            } catch (e) {
                console.error('[App.js] Failed to parse user from localStorage', e);
                localStorage.removeItem('currentUser');
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            console.log('[App.js] No user found in localStorage, not authenticated.');
            setIsAuthenticated(false);
            setUser(null);
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        console.log('[App.js] Login successful, setting user:', userData);
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
    };

    const handleLogout = () => {
        console.log('[App.js] Logging out user:', user?.username);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('currentUser');
    };

     const ProtectedRoute = ({ children }) => {
         if (!isAuthenticated) {
             return <Navigate to="/login" replace />;
         }
         return children;
     };


    return (
        <Router>
            <div className="app-container">
                {isAuthenticated && <Navbar onLogout={handleLogout} />}

                <div className="content">
                    <Routes>
                        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />

                        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                        <Route path="/clientes" element={<ProtectedRoute><ListaClientes /></ProtectedRoute>} />
                        <Route path="/proveedores" element={<ProtectedRoute><ListaProveedores /></ProtectedRoute>} />
                        <Route path="/ventas" element={<ProtectedRoute><ListaVentas /></ProtectedRoute>} />
                        <Route path="/compras" element={<ProtectedRoute><ListaCompras /></ProtectedRoute>} />
                        <Route path="/productos" element={<ProtectedRoute><ListaProductos /></ProtectedRoute>} />
                        <Route path="/stock" element={<ProtectedRoute><ListaStock /></ProtectedRoute>} />
                        <Route path="/presupuestos" element={<ProtectedRoute><ListaPresupuestos /></ProtectedRoute>} />
                        <Route path="/ventasx" element={<ProtectedRoute><ListaVentasX /></ProtectedRoute>} />

                        <Route
                            path="/listados-ventas"
                            element={
                                <ProtectedRoute>
                                    {(() => {
                                        const [editingVentaId, setEditingVentaId] = useState(null);
                                        const handleEditFromGlobal = (ventaId) => setEditingVentaId(ventaId);
                                        const handleCancelEdit = () => setEditingVentaId(null);
                                        const handleSaveSuccess = () => setEditingVentaId(null);

                                        return (
                                            editingVentaId ? (
                                                <VentaEditor
                                                    ventaId={editingVentaId}
                                                    onCancel={handleCancelEdit}
                                                    onSaveSuccess={handleSaveSuccess}
                                                />
                                            ) : (
                                                <ListaVentasGlobal onEditSale={handleEditFromGlobal} />
                                            )
                                        );
                                    })()}
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/listados-ventasx"
                            element={
                                <ProtectedRoute>
                                    {(() => {
                                        const [editingVentaXId, setEditingVentaXId] = useState(null);

                                        const handleEditVentaXFromGlobal = (ventaXId) => {
                                            console.log("App.js: Solicitud de edición recibida para Venta X ID:", ventaXId);
                                            setEditingVentaXId(ventaXId);
                                        };

                                        const handleCancelEditVentaX = () => {
                                            console.log("App.js: Edición de Venta X cancelada. Volviendo a la lista.");
                                            setEditingVentaXId(null);
                                        };

                                        const handleSaveSuccessVentaX = () => {
                                            console.log("App.js: Cambios en Venta X guardados. Volviendo a la lista.");
                                            setEditingVentaXId(null);
                                        };

                                        return (
                                            editingVentaXId ? (
                                                <VentaXEditor
                                                    ventaId={editingVentaXId}
                                                    onCancel={handleCancelEditVentaX}
                                                    onSaveSuccess={handleSaveSuccessVentaX}
                                                />
                                            ) : (
                                                <ListaVentasXGlobal onEditSale={handleEditVentaXFromGlobal} />
                                            )
                                        );
                                    })()}
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/listados-compras" element={<ProtectedRoute><ListaComprasGlobal /></ProtectedRoute>} />
                        <Route path="/cashflow" element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />
                        <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
                        <Route path="/estadisticas" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                        <Route path="/usuarios" element={<ProtectedRoute><ListaUsuarios /></ProtectedRoute>} />

                         {isAuthenticated && <Route path="/login" element={<Navigate to="/" replace />} />}

                    </Routes>
                </div>
                
                {/* --- AGREGAR WIDGET DE IA AQUÍ --- */}
                {/* Solo se muestra si el usuario está autenticado */}
                {isAuthenticated && <IAWidget />}
            </div>
        </Router>
    );
}

export default App;