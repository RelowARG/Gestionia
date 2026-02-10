// src/components/ventasx/VentaXEditor.js (Nuevo Componente)
import React, { useState, useEffect } from 'react';
import VentaItemsEditorX from './VentaItemsEditorX'; // Adaptado para VentasX
import { format } from 'date-fns';

const electronAPI = window.electronAPI;

function VentaXEditor({ ventaId, onCancel, onSaveSuccess }) {
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);

    const [editedVentaData, setEditedVentaData] = useState({
        id: null,
        Fecha: '',
        Nro_VentaX: '', // Campo específico de VentasX
        Cliente_id: '',
        Estado: '',
        Pago: '',
        Subtotal: '', // Calculado en base a los ítems (igual al Total USD en VentasX)
        // IVA no existe en VentasX
        Total: '', // Total en USD (igual al Subtotal en VentasX)
        Cotizacion_Dolar: '',
        Total_ARS: '',
        items: [],
    });

    const [loading, setLoading] = useState(true);
    const [savingData, setSavingData] = useState(false);
    const [error, setError] = useState(null);

    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [displayClients, setDisplayClients] = useState([]);
    const [clearItemsEditorErrorsTrigger, setClearItemsEditorErrorsTrigger] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setClearItemsEditorErrorsTrigger(0);

            try {
                const ventaXData = await electronAPI.getVentaXById(ventaId); // API para VentasX
                console.log(`Datos de VentaX ID ${ventaId} cargados para editar:`, ventaXData);

                const clientsData = await electronAPI.getClients();
                const productosData = await electronAPI.getProductos();

                setClientes(clientsData);
                setDisplayClients(clientsData);
                setProductos(productosData);

                const formattedFecha = ventaXData.Fecha
                    ? format(new Date(ventaXData.Fecha), 'yyyy-MM-dd')
                    : '';

                const clientForEdit = clientsData.find(c => c.id === ventaXData.Cliente_id);
                if (clientForEdit) {
                    setClientSearchTerm(`${clientForEdit.Codigo || ''} - ${clientForEdit.Empresa || ''}`);
                } else {
                    setClientSearchTerm('');
                }

                setEditedVentaData({
                    id: ventaXData.id,
                    Fecha: formattedFecha || '',
                    Nro_VentaX: ventaXData.Nro_VentaX || '', // Usar Nro_VentaX
                    Cliente_id: ventaXData.Cliente_id || '',
                    Estado: ventaXData.Estado || '',
                    Pago: ventaXData.Pago || '',
                    Subtotal: ventaXData.Subtotal !== null ? String(ventaXData.Subtotal) : '',
                    // IVA no se carga
                    Total: ventaXData.Total !== null ? String(ventaXData.Total) : '',
                    Cotizacion_Dolar: ventaXData.Cotizacion_Dolar !== null ? String(ventaXData.Cotizacion_Dolar) : '',
                    Total_ARS: ventaXData.Total_ARS !== null ? String(ventaXData.Total_ARS) : '',
                    items: ventaXData.items || [],
                });

            } catch (err) {
                console.error(`Error al cargar datos para VentaX ID ${ventaId}:`, err);
                setError(err.message || 'Error al cargar los datos de la Venta X para editar.');
                if (onCancel) onCancel();
            } finally {
                setLoading(false);
            }
        };

        if (ventaId !== null && ventaId !== undefined && ventaId > 0) {
            fetchData();
        } else {
            console.warn("VentaXEditor recibió un ventaId inválido:", ventaId);
            setError("No se especificó una Venta X válida para editar.");
            setLoading(false);
            if (onCancel) onCancel();
        }
    }, [ventaId, onCancel]);

    useEffect(() => {
        console.log('[VentaXEditor] Recalculando totales...');

        const subtotal = parseFloat(editedVentaData.Subtotal);
        const cotizacion = parseFloat(editedVentaData.Cotizacion_Dolar);

        let calculatedTotalUSD = '';
        // En VentasX, Total USD es igual al Subtotal si este es válido
        if (!isNaN(subtotal)) {
            calculatedTotalUSD = subtotal.toFixed(2);
        }

        let calculatedTotalARS = '';
        if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
            calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
        }

        setEditedVentaData(prevState => {
            if (prevState.Total !== calculatedTotalUSD || prevState.Total_ARS !== calculatedTotalARS) {
                console.log(`[VentaXEditor] Actualizando totales: Total USD ${calculatedTotalUSD}, Total ARS ${calculatedTotalARS}`);
                return {
                    ...prevState,
                    Total: calculatedTotalUSD, // Total USD es igual al Subtotal
                    Total_ARS: calculatedTotalARS,
                };
            }
            return prevState;
        });
    }, [editedVentaData.Subtotal, editedVentaData.Cotizacion_Dolar]); // Dependencias: Subtotal (que viene de items) y Cotizacion_Dolar

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditedVentaData(prevState => ({ ...prevState, [name]: value }));
        setError(null);
    };

    const handleEditedVentaItemsChange = (newItems) => {
        const calculatedSubtotal = newItems.reduce((sum, item) => {
            const itemTotal = parseFloat(item.Total_Item); // Total_Item ya incluye descuentos en VentaItemsEditorX
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
        }, 0).toFixed(2);

        setEditedVentaData(prevState => ({
            ...prevState,
            items: newItems,
            Subtotal: calculatedSubtotal, // Esto activará el useEffect para recalcular Total y Total_ARS
        }));
        setError(null);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSavingData(true);
        setError(null);
        setClearItemsEditorErrorsTrigger(prev => prev + 1);

        if (!editedVentaData.Fecha || !editedVentaData.Cliente_id || !editedVentaData.Estado || !editedVentaData.Pago || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0) {
            setError('Fecha, Cliente, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.');
            setSavingData(false);
            return;
        }
        if (!Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0) {
            setError('La Venta X debe tener al menos un ítem.');
            setSavingData(false);
            return;
        }
        if (editedVentaData.Subtotal !== '' && isNaN(parseFloat(editedVentaData.Subtotal))) {
            setError('Error interno: Subtotal calculado no es un número válido.');
            setSavingData(false);
            return;
        }
        if (editedVentaData.Total !== '' && isNaN(parseFloat(editedVentaData.Total))) {
            setError('Error interno: Total USD calculado no es un número válido.');
            setSavingData(false);
            return;
        }
        if (editedVentaData.Total_ARS !== '' && isNaN(parseFloat(editedVentaData.Total_ARS))) {
            setError('Error interno: Total ARS calculado no es un número válido.');
            setSavingData(false);
            return;
        }

        const formattedFecha = editedVentaData.Fecha ? new Date(editedVentaData.Fecha).toISOString().split('T')[0] : '';
        if (!formattedFecha) {
            setError('Formato de fecha no válido.');
            setSavingData(false);
            return;
        }

        const dataToSend = {
            id: editedVentaData.id,
            Fecha: formattedFecha,
            // Nro_VentaX no se envía para edición usualmente, a menos que el backend lo permita.
            // Si no se debe editar, no se envía. Basado en ListaVentasX, no se envía para update.
            Cliente_id: parseInt(editedVentaData.Cliente_id, 10),
            Estado: editedVentaData.Estado,
            Pago: editedVentaData.Pago,
            Subtotal: editedVentaData.Subtotal !== '' ? parseFloat(editedVentaData.Subtotal) : null,
            // IVA no se envía
            Total: editedVentaData.Total !== '' ? parseFloat(editedVentaData.Total) : null,
            Cotizacion_Dolar: editedVentaData.Cotizacion_Dolar !== '' ? parseFloat(editedVentaData.Cotizacion_Dolar) : null,
            Total_ARS: editedVentaData.Total_ARS !== '' ? parseFloat(editedVentaData.Total_ARS) : null,
            items: editedVentaData.items.map(item => ({ // Adaptado de ListaVentasX
                id: item.id || undefined,
                type: item.type,
                Descuento_Porcentaje: item.type === 'product' && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null,
                Total_Item: item.Total_Item !== null && item.Total_Item !== '' && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null,
                ...(item.type === 'product' && {
                    Producto_id: item.Producto_id,
                    Cantidad: item.Cantidad !== null && item.Cantidad !== '' && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null,
                    Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== '' && !isNaN(parseFloat(item.Precio_Unitario_Venta)) ? parseFloat(item.Precio_Unitario_Venta) : null,
                }),
                ...(item.type === 'custom' && {
                    Descripcion_Personalizada: item.Descripcion_Personalizada,
                    Cantidad_Personalizada: item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' && !isNaN(parseFloat(item.Cantidad_Personalizada)) ? parseFloat(item.Cantidad_Personalizada) : null,
                    Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada) : null,
                }),
            })),
        };

        try {
            const response = await electronAPI.updateVentaX(dataToSend.id, dataToSend); // API para VentasX
            console.log('VentaX actualizada exitosamente:', response.success);
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (err) {
            console.error('Error al actualizar la VentaX:', err);
            setError(err.message || `Error al actualizar la Venta X.`);
        } finally {
            setSavingData(false);
        }
    };

    const handleCancelEdit = () => {
        if (onCancel) {
            onCancel();
        }
        setEditedVentaData({
            id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '', Estado: '', Pago: '',
            Subtotal: '', Total: '', Cotizacion_Dolar: '', Total_ARS: '', items: []
        });
        setError(null);
        setClientSearchTerm('');
        setDisplayClients(clientes);
    };

    const handleClientSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase();
        setClientSearchTerm(term);
        setError(null);

        if (term === '') {
            setDisplayClients(clientes);
        } else {
            const filtered = clientes.filter(client =>
                (client.Codigo && String(client.Codigo).toLowerCase().includes(term)) ||
                (client.Empresa && String(client.Empresa).toLowerCase().includes(term)) ||
                (client.Nombre && String(client.Nombre).toLowerCase().includes(term))
            );
            setDisplayClients(filtered);
        }
        setEditedVentaData(prevState => ({ ...prevState, Cliente_id: '' }));
    };

    const handleClientSelect = (client) => {
        setClientSearchTerm(`${client.Codigo || ''} - ${client.Empresa || ''}`);
        setEditedVentaData(prevState => ({ ...prevState, Cliente_id: client.id }));
        setDisplayClients([]);
        setError(null);
    };

    const getClientDetails = (clientId) => {
        return clientes.find(c => c.id === clientId);
    };

    if (loading) {
        return <p>Cargando datos de la Venta X para editar...</p>;
    }

    if (error && !editedVentaData.id) {
        return (
            <div className="container">
                <p style={{ color: '#ef9a9a' }}>{error}</p>
                <button onClick={handleCancelEdit} style={{ backgroundColor: '#616161', color: 'white' }}>Volver al Listado Global</button>
            </div>
        );
    }

    return (
        <div className="container">
            <h2>Editar Venta X (ID: {ventaId})</h2>
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {savingData && <p>Guardando cambios...</p>}

            <form onSubmit={handleSaveEdit}>
                <div>
                    <label htmlFor={`edit-fecha-${ventaId}`}>Fecha:</label>
                    <input type="date" id={`edit-fecha-${ventaId}`} name="Fecha" value={editedVentaData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                </div>
                <div>
                    <label htmlFor={`edit-nro-ventax-${ventaId}`}>Nro Venta X:</label> {/* Campo Nro_VentaX */}
                    <input type="text" id={`edit-nro-ventax-${ventaId}`} name="Nro_VentaX" value={editedVentaData.Nro_VentaX || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                </div>

                {/* Client Search Section */}
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor={`edit-client-search-input-${ventaId}`}>Buscar/Filtrar Cliente:</label>
                    <input
                        type="text"
                        id={`edit-client-search-input-${ventaId}`}
                        value={clientSearchTerm}
                        onChange={handleClientSearchInputChange}
                        placeholder="Escribe código, nombre o empresa para filtrar..."
                        disabled={savingData || clientes.length === 0}
                    />
                    {clientes.length === 0 && loading && <p style={{ fontSize: '14px', color: '#ffcc80' }}>Cargando clientes...</p>}
                    {clientes.length === 0 && !loading && <p style={{ fontSize: '14px', color: '#ffcc80' }}>No hay clientes disponibles.</p>}
                </div>
                {editedVentaData.Cliente_id ? (
                    <div style={{ fontSize: '0.9rem', color: '#bdbdbd', marginBottom: '10px' }}> {/* Corrected color */}
                        <strong>Cliente Seleccionado:</strong> {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Codigo || 'N/A'} - {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Empresa || 'N/A'} ({getClientDetails(parseInt(editedVentaData.Cliente_id))?.Nombre || 'N/A'})
                        <p style={{ margin: 0, marginLeft: '10px' }}>Cuit: {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Cuit || 'N/A'}</p>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.9rem', color: '#ffcc80', marginBottom: '10px' }}>
                        Seleccione un cliente de la lista de abajo.
                    </p>
                )}
                {clientSearchTerm !== '' && displayClients.length > 0 && !editedVentaData.Cliente_id && (
                    <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c', marginBottom: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Código</th>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Empresa</th>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Cuit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayClients.map(client => (
                                    <tr
                                        key={client.id}
                                        onClick={() => handleClientSelect(client)}
                                        style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '8px' }}>{client.Codigo}</td>
                                        <td style={{ padding: '8px' }}>{client.Empresa}</td>
                                        <td style={{ padding: '8px' }}>{client.Nombre}</td>
                                        <td style={{ padding: '8px' }}>{client.Cuit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {clientSearchTerm !== '' && displayClients.length === 0 && clientes.length > 0 && !editedVentaData.Cliente_id && (
                    <p style={{ fontSize: '14px', color: '#ffcc80', marginTop: '10px' }}>
                        No se encontraron clientes con "{clientSearchTerm}".
                    </p>
                )}

                <div>
                    <label htmlFor={`edit-estado-${ventaId}`}>Estado:</label>
                    <select id={`edit-estado-${ventaId}`} name="Estado" value={editedVentaData.Estado || ''} onChange={handleEditFormChange} disabled={savingData}>
                        <option value="">Seleccione Estado</option>
                        <option value="entregado">Entregado</option>
                        <option value="en maquina">En Máquina</option>
                        <option value="pedido">Pedido</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="listo">Listo</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`edit-pago-${ventaId}`}>Pago:</label>
                    <select id={`edit-pago-${ventaId}`} name="Pago" value={editedVentaData.Pago || ''} onChange={handleEditFormChange} disabled={savingData}>
                        <option value="">Seleccione Pago</option>
                        <option value="abonado">Abonado</option>
                        <option value="seña">Seña</option>
                        <option value="debe">Debe</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`edit-subtotal-${ventaId}`}>Subtotal:</label>
                    <input type="text" id={`edit-subtotal-${ventaId}`} name="Subtotal" value={editedVentaData.Subtotal || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                </div>
                {/* IVA Field removed for VentasX */}
                <div>
                    <label htmlFor={`edit-total-${ventaId}`}>Total USD:</label>
                    <input type="text" id={`edit-total-${ventaId}`} name="Total" value={editedVentaData.Total || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                </div>
                <div>
                    <label htmlFor={`edit-cotizacion-dolar-${ventaId}`}>Cotización Dólar:</label>
                    <input
                        type="number"
                        id={`edit-cotizacion-dolar-${ventaId}`}
                        name="Cotizacion_Dolar"
                        value={editedVentaData.Cotizacion_Dolar || ''}
                        onChange={handleEditFormChange}
                        required
                        disabled={savingData}
                        min="0.01"
                        step="0.01"
                    />
                </div>
                <div>
                    <label htmlFor={`edit-total-ars-${ventaId}`}>Total ARS:</label>
                    <input
                        type="text"
                        id={`edit-total-ars-${ventaId}`}
                        name="Total_ARS"
                        value={editedVentaData.Total_ARS || ''}
                        readOnly
                        disabled={true}
                        style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                    />
                </div>

                {/* VentaItemsEditorX Integration */}
                {(Array.isArray(productos) && productos.length > 0) ? (
                    <VentaItemsEditorX
                        items={editedVentaData.items}
                        onItemsChange={handleEditedVentaItemsChange}
                        productos={productos}
                        savingData={savingData}
                        clearTrigger={clearItemsEditorErrorsTrigger} // Pasamos el trigger
                    />
                ) : (
                    !loading && <p style={{ fontSize: '14px', color: '#ffcc80' }}>Cargando productos o no hay productos disponibles para los ítems. Asegúrese de tener productos cargados.</p>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                    <button type="submit" disabled={savingData || !editedVentaData.Cliente_id || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0 || !Array.isArray(editedVentaData.items) ||editedVentaData.items.length === 0}>
                        Guardar Cambios (Venta X)
                    </button>
                    <button type="button" onClick={handleCancelEdit} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Cancelar Edición</button>
                </div>
            </form>
        </div>
    );
}

export default VentaXEditor;