// src/components/ventasx/ImportPresupuestoModalX.js
// Este componente es una duplicación funcional del ImportPresupuestoModal estándar,
// adaptado para ser utilizado dentro del contexto de VentasX.
// Permite seleccionar e importar un presupuesto a una VentaX.

import React, { useState, useEffect } from 'react';
// No necesitamos importar los estilos inline aquí, se manejarán con CSS

const electronAPI = window.electronAPI;

// Modal/Componente para seleccionar e importar un presupuesto a una venta X
function ImportPresupuestoModalX({ onClose, onImport, existingClientId }) {
    // onClose: Función para cerrar el modal
    // onImport: Función callback para pasar los datos del presupuesto seleccionado al componente padre (ListaVentasX)
    // existingClientId: ID del cliente actualmente seleccionado en el formulario de VentaX (opcional, para filtrar)

    const [presupuestos, setPresupuestos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPresupuestoId, setSelectedPresupuestoId] = useState(null);
    const [loadingPresupuestoData, setLoadingPresupuestoData] = useState(false);
    const [presupuestoDataToImport, setPresupuestoDataToImport] = useState(null); // Datos completos del presupuesto seleccionado

    // Fetch the list of budgets when the modal opens
    useEffect(() => {
        const fetchPresupuestos = async () => {
            setLoading(true);
            setError(null);
            try {
                // CORRECCIÓN: Llamar directamente a la función async y await su resultado
                // Usar la nueva API promise-based
                const data = await electronAPI.getPresupuestos(); // New API call (GET /api/presupuestos)
                console.log('Presupuestos loaded for import to VentasX:', data);

                // Optionally filter budgets by the existing client ID if provided
                const filteredPresupuestos = existingClientId
                    ? data.filter(p => p.Cliente_id === parseInt(existingClientId, 10))
                    : data;
                setPresupuestos(filteredPresupuestos);

            } catch (err) {
                // CORRECCIÓN: Manejar errores directamente desde la promesa
                console.error('Error fetching presupuestos for import to VentasX:', err);
                setError(err.message || 'Error al cargar la lista de presupuestos.');
                setPresupuestos([]); // Clear the list on error
            } finally {
                setLoading(false); // Always set loading to false
            }
        };

        fetchPresupuestos(); // Call the async function

        // CORRECCIÓN: No hay listeners IPC 'on' que limpiar aquí con la nueva API
        // return () => { ... }; // REMOVED
    }, [existingClientId]); // Re-fetch if existingClientId changes

    // Fetch the details of the selected budget when selectedPresupuestoId changes
    useEffect(() => {
        if (selectedPresupuestoId === null) {
            setPresupuestoDataToImport(null); // Clear data if no budget is selected
            return;
        }

        const fetchPresupuestoDetails = async () => {
            setLoadingPresupuestoData(true);
            setError(null); // Clear previous errors
            setPresupuestoDataToImport(null); // Clear previous data

            try {
                // CORRECCIÓN: Llamar directamente a la función async y await su resultado
                // Usar la nueva API promise-based
                const data = await electronAPI.getPresupuestoById(selectedPresupuestoId); // New API call (GET /api/presupuestos/:id)
                console.log(`Presupuesto ID ${selectedPresupuestoId} details loaded for import to VentasX:`, data);
                setPresupuestoDataToImport(data); // Store the full budget data

            } catch (err) {
                // CORRECCIÓN: Manejar errores directamente desde la promesa
                console.error(`Error fetching presupuesto ID ${selectedPresupuestoId} for import to VentasX:`, err);
                setError(err.message || `Error al cargar los detalles del presupuesto.`);
                setPresupuestoDataToImport(null); // Clear data on error
            } finally {
                setLoadingPresupuestoData(false);
            }
        };

        fetchPresupuestoDetails(); // Call the async function

        // CORRECCIÓN: No hay listeners IPC 'on' que limpiar aquí con la nueva API
        // return () => { ... }; // REMOVED
    }, [selectedPresupuestoId]); // Re-fetch when a new budget is selected


    // Handle selecting a budget from the list
    const handleSelectPresupuesto = (presupuestoId) => {
        setSelectedPresupuestoId(presupuestoId);
    };

    // Handle the import action
    const handleImportClick = () => {
        if (presupuestoDataToImport) {
            // Pass the fetched budget data back to the parent component (ListaVentasX)
            onImport(presupuestoDataToImport);
            onClose(); // Close the modal after importing
        }
    };


    // Estilos básicos para el modal y overlay (asumiendo que tienes CSS global o los defines aquí)
    // Si ya están definidos en un CSS global, puedes eliminar estos estilos inline.
    // Mantengo los estilos inline como estaban en tu archivo original para evitar cambios visuales inesperados.
    const modalOverlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 1000
    };

    const modalContentStyle = {
        backgroundColor: '#212121', padding: '30px', borderRadius: '8px',
        maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
        color: '#e0e0e0', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)', position: 'relative'
    };

    const primaryButtonStyle = { // Estilo para el botón de Importar
        backgroundColor: '#0288d1', color: 'white', border: 'none',
        borderRadius: '4px', padding: '10px 20px', cursor: 'pointer',
        fontSize: '1rem', fontWeight: 'bold'
    };

     const secondaryButtonStyle = { // Estilo para el botón Cancelar
        backgroundColor: '#616161', color: 'white', border: 'none',
        borderRadius: '4px', padding: '10px 20px', cursor: 'pointer',
        fontSize: '1rem', fontWeight: 'bold'
    };


    return (
        // Usar estilos inline si no tienes CSS global para estas clases
        <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="modal-content" style={modalContentStyle}> {/* Mantener maxWidth inline si es específico de este modal */}
                <h3>Importar Presupuesto a Venta X</h3> {/* Updated UI text */}

                {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
                {loading && <p>Cargando presupuestos...</p>}

                {!loading && presupuestos.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="presupuesto-select">Seleccione un Presupuesto:</label>
                        <select
                            id="presupuesto-select"
                            value={selectedPresupuestoId || ''}
                            onChange={(e) => handleSelectPresupuesto(parseInt(e.target.value, 10))}
                            disabled={loadingPresupuestoData}
                             style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #424242', backgroundColor: '#3a3a3a', color: '#e0e0e0' }} // Estilos para select
                        >
                            <option value="">-- Seleccionar Presupuesto --</option>
                            {presupuestos.map(presupuesto => (
                                <option key={presupuesto.id} value={presupuesto.id}>
                                    {`${presupuesto.Numero} - ${presupuesto.Fecha} - ${presupuesto.Nombre_Cliente}`}
                                </option>
                            ))}
                        </select>
                         {/* Display warning if no budgets found for the selected client */}
                         {existingClientId && presupuestos.length === 0 && !loading && (
                             <p style={{fontSize: '14px', color: '#ffcc80', marginTop: '10px'}}>
                                 No hay presupuestos para el cliente seleccionado.
                             </p>
                         )}
                    </div>
                )}

                 {!loading && presupuestos.length === 0 && !existingClientId && !error && (
                     <p>No hay presupuestos disponibles para importar.</p>
                 )}


                {loadingPresupuestoData && <p>Cargando detalles del presupuesto seleccionado...</p>}

                {/* Display details of the selected budget before importing */}
                {presupuestoDataToImport && !loadingPresupuestoData && (
                    <div style={{ border: '1px solid #424242', padding: '15px', borderRadius: '5px', backgroundColor: '#1e1e1e', marginBottom: '20px' }}>
                        <h4>Detalles del Presupuesto Seleccionado:</h4>
                         <p><strong>Número:</strong> {presupuestoDataToImport.Numero}</p>
                         <p><strong>Fecha:</strong> {presupuestoDataToImport.Fecha}</p>
                         <p><strong>Cliente:</strong> {presupuestoDataToImport.Nombre_Cliente} ({presupuestoDataToImport.Cuit_Cliente})</p>
                         <p><strong>Total (USD):</strong> {presupuestoDataToImport.Total_USD !== null && presupuestoDataToImport.Total_USD !== undefined && !isNaN(parseFloat(presupuestoDataToImport.Total_USD)) ? parseFloat(presupuestoDataToImport.Total_USD).toFixed(2) : 'N/A'}</p> {/* Safely access and format */}
                         <p><strong>Total (ARS):</strong> {presupuestoDataToImport.Total_ARS !== null && presupuestoDataToImport.Total_ARS !== undefined && !isNaN(parseFloat(presupuestoDataToImport.Total_ARS)) ? parseFloat(presupuestoDataToImport.Total_ARS).toFixed(2) : 'N/A'}</p> {/* Safely access and format */}
                         {/* Optionally display a summary of items */}
                         <p style={{marginTop: '10px'}}><strong>Ítems ({presupuestoDataToImport.items.length}):</strong></p>
                         <ul style={{maxHeight: '150px', overflowY: 'auto', paddingLeft: '20px', listStyleType: 'disc'}}>
                             {presupuestoDataToImport.items.map((item, index) => (
                                 <li key={item.id || index} style={{fontSize: '0.9rem', color: '#bbb'}}>
                                     {item.Producto_id !== null
                                         ? `${item.codigo || item.Producto_Descripcion || 'Producto'} - ${item.Descripcion || item.Producto_Descripcion || 'N/A'} (x${item.Cantidad !== null ? item.Cantidad : 'N/A'})`
                                         : `${item.Descripcion_Personalizada || 'Personalizado'} (x${item.Cantidad_Personalizada !== null ? item.Cantidad_Personalizada : 'N/A'})`
                                     }
                                 </li>
                             ))}
                         </ul>
                    </div>
                )}


                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button
                        onClick={handleImportClick}
                        disabled={!presupuestoDataToImport || loadingPresupuestoData}
                        className="primary" // Use primary button style
                    >
                        Importar Presupuesto a Venta X {/* Updated UI text */}
                    </button>
                    <button
                        onClick={onClose}
                        className="secondary" // Use secondary button style
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImportPresupuestoModalX;
