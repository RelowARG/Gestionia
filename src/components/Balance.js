// src/components/Balance.js
import React, { useState, useEffect } from 'react';

const electronAPI = window.electronAPI; // Acceder a la API expuesta globalmente

function Balance() {
    const [balanceMetrics, setBalanceMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Effect to fetch balance metrics when the component mounts
    useEffect(() => {
        console.log('[Balance - Frontend] Fetching key balance metrics...');
        setLoading(true);
        setError(null);

        // NUEVO: Función async para obtener las métricas de balance
        const fetchBalanceMetrics = async () => {
            try {
                // Usar await con la nueva función API
                const metricsData = await electronAPI.getKeyBalanceMetrics();
                console.log('[Balance - Frontend] Received getKeyBalanceMetricsResponse:', metricsData);
                setBalanceMetrics(metricsData);
            } catch (err) {
                console.error('[Balance - Frontend] Error fetching balance metrics:', err);
                setError(err.message || 'Error al cargar las métricas de balance.');
                 setBalanceMetrics(null); // Limpiar datos en caso de error
            } finally {
                setLoading(false); // Ocultar loading al finalizar (éxito o error)
            }
        };

        // Llamar a la función async
        fetchBalanceMetrics();

        // Eliminar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        return () => {
             console.log('[Balance - Frontend] Cleaning up listener (no IPC listeners to remove).');
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, []); // Empty dependency array means this effect runs only once on mount


    return (
        <div className="container">
            <h2>Balance General (Métricas Clave)</h2>

            {loading && <p>Cargando métricas de balance...</p>}
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

            {!loading && !error && balanceMetrics && (
                <div style={{ marginTop: '20px' }}>
                    {/* Podríamos usar una tabla o tarjetas para mostrar las métricas */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', // Responsive grid
                        gap: '20px',
                    }}>
                        {/* Tarjeta de Cuentas por Cobrar */}
                        <div style={{ padding: '20px', border: '1px solid #424242', borderRadius: '8px', backgroundColor: '#2c2c2c', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}>
                            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>Cuentas por Cobrar</h3>
                            <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Total Pendiente Clientes (USD): <span style={{ fontWeight: 'bold', color: balanceMetrics.receivables.usd > 0 ? '#ffb74d' : '#e0e0e0' }}>${balanceMetrics.receivables.usd.toFixed(2)}</span>
                            </p>
                             <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Total Pendiente Clientes (ARS): <span style={{ fontWeight: 'bold', color: balanceMetrics.receivables.ars > 0 ? '#ffb74d' : '#e0e0e0' }}>${balanceMetrics.receivables.ars.toFixed(2)}</span>
                            </p>
                             {/* Podrías añadir un enlace o botón para ver el detalle de las ventas pendientes si creas esa vista */}
                             {/* <button style={{marginTop: '10px', fontSize: '0.9rem'}}>Ver Detalle</button> */}
                        </div>

                        {/* Tarjeta de Cuentas por Pagar */}
                        <div style={{ padding: '20px', border: '1px solid #424242', borderRadius: '8px', backgroundColor: '#2c2c2c', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}>
                            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>Cuentas por Pagar</h3>
                            <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Total Deuda Proveedores (USD): <span style={{ fontWeight: 'bold', color: balanceMetrics.payables.usd > 0 ? '#ef9a9a' : '#e0e0e0' }}>${balanceMetrics.payables.usd.toFixed(2)}</span>
                            </p>
                             <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Total Deuda Proveedores (ARS): <span style={{ fontWeight: 'bold', color: balanceMetrics.payables.ars > 0 ? '#ef9a9a' : '#e0e0e0' }}>${balanceMetrics.payables.ars.toFixed(2)}</span>
                            </p>
                             {/* Podrías añadir un enlace o botón para ver el detalle de las compras pendientes si creas esa vista */}
                             {/* <button style={{marginTop: '10px', fontSize: '0.9rem'}}>Ver Detalle</button> */}
                        </div>

                        {/* Tarjeta de Valor del Inventario */}
                        <div style={{ padding: '20px', border: '1px solid #424242', borderRadius: '8px', backgroundColor: '#2c2c2c', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}>
                            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>Valor del Inventario</h3>
                            {/* Solo mostramos USD ya que el backend solo lo calcula en USD por ahora */}
                            <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Valor Estimado a Costo (USD): <span style={{ fontWeight: 'bold', color: balanceMetrics.inventory.usd > 0 ? '#81c784' : '#e0e0e0' }}>${balanceMetrics.inventory.usd.toFixed(2)}</span>
                            </p>
                             {/* Si en el futuro calculas el valor en ARS, podrías añadirlo aquí */}
                             {/* <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
                                Valor Estimado a Costo (ARS): <span style={{ fontWeight: 'bold', color: balanceMetrics.inventory.ars > 0 ? '#81c784' : '#e0e0e0' }}>${balanceMetrics.inventory.ars.toFixed(2)}</span>
                            </p> */}
                             {/* Podrías añadir un enlace o botón para ir a la vista de Stock si es útil */}
                             {/* <button style={{marginTop: '10px', fontSize: '0.9rem'}}>Ver Stock</button> */}
                        </div>

                         {/* NOTA: El Saldo de Caja/Bancos no se incluye en esta etapa por su complejidad */}
                         {/* Si se implementa en el futuro, iría aquí */}
                    </div>

                     {/* Considerar añadir un timestamp o indicación de "Datos actualizados a la fecha de consulta" */}
                     <p style={{ fontSize: '0.9rem', color: '#bbb', textAlign: 'center', marginTop: '30px' }}>
                         Las métricas de balance reflejan los datos al momento de la última actualización.
                     </p>

                </div>
            )}

             {!loading && !error && !balanceMetrics && (
                 <p>No se pudieron cargar las métricas de balance.</p>
             )}

        </div>
    );
}

export default Balance;