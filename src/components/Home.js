// src/components/Home.js (Modified for Backend API Communication, Numerical Parsing, Date Formatting, and Table Alignment)
import React, { useState, useEffect, useRef } from 'react';
import PendingItemEditModal from './PendingItemEditModal'; // NUEVO: Importar el componente modal
import { format } from 'date-fns'; // Import the format function from date-fns
import IAPanel from './IAPanel';

const electronAPI = window.electronAPI; // Acceder a la API expuesta globalmente

function Home() {
    const [pendingVentas, setPendingVentas] = useState([]);
    const [pendingVentasX, setPendingVentasX] = useState([]);
    const [pendingCompras, setPendingCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // NUEVO: Estado para controlar la visibilidad del modal de edición
    const [showEditModal, setShowEditModal] = useState(false);
    // NUEVO: Estado para almacenar los datos del elemento pendiente que se está editando
    const [itemToEdit, setItemToEdit] = useState(null); // { id, type: 'venta'|'ventax'|'compra', currentStatus, currentPayment }

    // Eliminamos completedRequests y totalRequests ya que no los necesitamos con async/await en el efecto

    // NUEVO: Estado para controlar la visibilidad del indicador de guardando
    const [savingData, setSavingData] = useState(false); // <--- Esta línea faltaba o estaba incorrecta

    // Eliminamos completedSaveRequests y totalSaveRequests

    // Eliminamos loadingStates y errorStates

    // NUEVO: Función async para cargar todos los pendientes. Llama a las nuevas funciones API.
    const fetchPendingData = async () => {
        console.log('[Home] Fetching all pending data...');
        setLoading(true); // Mostrar loading mientras se recarga
        setError(null); // Limpiar errores previos

        try {
            // Usar await con las nuevas funciones API
            const ventasData = await electronAPI.getPendingVentas();
            console.log('[Home] Ventas pendientes cargadas:', ventasData);
            // Parse numerical fields for ventas
            const parsedVentas = ventasData.map(venta => ({
                ...venta,
                Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
                Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
            }));
            setPendingVentas(parsedVentas);

            const ventasXData = await electronAPI.getPendingVentasX();
            console.log('[Home] VentasX pendientes cargadas:', ventasXData);
            // Parse numerical fields for ventasX
            const parsedVentasX = ventasXData.map(venta => ({
                ...venta,
                Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
                Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
            }));
            setPendingVentasX(parsedVentasX);


            const comprasData = await electronAPI.getPendingCompras();
            console.log('[Home] Compras pendientes cargadas:', comprasData);
            // Parse numerical fields for compras
             const parsedCompras = comprasData.map(compra => ({
                 ...compra,
                 MontoTotal: compra.MontoTotal !== null && compra.MontoTotal !== undefined && !isNaN(parseFloat(compra.MontoTotal)) ? parseFloat(compra.MontoTotal) : null,
                 Total_ARS: compra.Total_ARS !== null && compra.Total_ARS !== undefined && !isNaN(parseFloat(compra.Total_ARS)) ? parseFloat(compra.Total_ARS) : null,
             }));
            setPendingCompras(parsedCompras);


        } catch (err) {
            console.error('[Home] Error fetching pending data:', err);
            // Mostrar un mensaje de error combinado si es necesario
            setError(err.message || 'Error al cargar los elementos pendientes.');
            // Limpiar las listas en caso de error
            setPendingVentas([]);
            setPendingVentasX([]);
            setPendingCompras([]);
        } finally {
            setLoading(false); // Ocultar loading al finalizar (éxito o error)
        }
    };


    // Effect para cargar los pendientes iniciales
    useEffect(() => {
        // Llamar a la función async para cargar datos
        fetchPendingData();

        // Limpiar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        // porque las funciones expuestas son directas y no usan eventos IPC para las respuestas.
        return () => {
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, []); // Empty dependency array means this effect runs once on mount

    // NUEVO: Función para manejar el click en un elemento pendiente
    const handleItemClick = (item, type) => {
        console.log(`Clicked on ${type} item:`, item);
        // Almacenar los datos del item y mostrar el modal
        setItemToEdit({
            id: item.id,
            type: type, // 'venta', 'ventax', o 'compra'
            currentStatus: item.Estado, // Estado actual
            currentPayment: item.Pago, // Pago actual (solo para ventas/ventasX/compras)
            // Puedes añadir otros datos relevantes para mostrar en el modal si quieres
            factNro: item.Fact_Nro || item.Nro_VentaX,
            clienteProveedor: item.Nombre_Cliente || item.Nombre_Proveedor,
        });
        setShowEditModal(true); // Mostrar el modal
    };

    // NUEVO: Función para cerrar el modal de edición
    const handleCloseModal = () => {
        setShowEditModal(false);
        setItemToEdit(null); // Limpiar el item en edición
    };

    // Función async para guardar los cambios en el modal
    const handleSaveEditedItem = async (updatedData) => { // Convertir a async
        console.log("Attempting to save updated item data:", updatedData);
        setError(null); // Limpiar errores de guardado previos
        setSavingData(true); // Opcional: mostrar un indicador de "guardando"

        try {
            // Determinar el tipo de item y llamar a la función API de actualización correspondiente
            switch (updatedData.type) {
                case 'venta':
                    // Usar await con la nueva función API
                    await electronAPI.updatePendingVenta(updatedData.id, { Estado: updatedData.Estado, Pago: updatedData.Pago });
                    console.log('[Home] Venta pendiente guardada exitosamente.');
                    break;
                case 'ventax':
                    // Usar await con la nueva función API
                    await electronAPI.updatePendingVentaX(updatedData.id, { Estado: updatedData.Estado, Pago: updatedData.Pago });
                    console.log('[Home] VentasX pendiente guardada exitosamente.');
                    break;
                case 'compra':
                    // Usar await con la nueva función API
                    await electronAPI.updatePendingCompra(updatedData.id, { Estado: updatedData.Estado, Pago: updatedData.Pago }); // Asegúrate que el backend espera { Estado, Pago }
                    console.log('Compra pendiente guardada exitosamente.');
                    break;
                default:
                    console.error("[Home] Tipo de item pendiente desconocido al intentar guardar:", updatedData.type);
                    setError("Error interno: Tipo de item pendiente desconocido al guardar.");
                    // No lanzamos error aquí para que el finally se ejecute y oculte el indicador de guardando
                    return; // Salir de la función si el tipo es desconocido
            }
            // Si llegamos aquí, el guardado fue exitoso (o la API no lanzó un error)

            // Refrescar la lista completa de pendientes para reflejar los cambios
            fetchPendingData();
            // Podrías mostrar un mensaje de éxito temporal si lo deseas

        } catch (err) {
            console.error('Error al guardar item pendiente:', err);
            // Mostrar un mensaje de error visible al usuario
            setError(`Error al guardar: ${err.message || 'Ocurrió un error desconocido.'}`);
        } finally {
            setSavingData(false); // Ocultar indicador de guardando
            handleCloseModal(); // Cerrar el modal al finalizar el guardado (éxito o error)
        }
    };


    const getEstadoVentaColor = (estado) => {
        switch (estado) {
            case 'entregado': return '#4CAF50'; // Green
            case 'en maquina':
            case 'pedido':
            case 'impresion':
            case 'listo': return '#FF9800'; // Orange
            case 'cancelado': return '#F4436'; // Red (usar el mismo rojo que para "debe")
            default: return 'inherit';
        }
    };

    const getEstadoCompraColor = (estado) => {
        switch (estado) {
            case 'entregado': return '#4CAF50'; // Green
            case 'pedido': return '#FF9800'; // Orange
            case 'cancelado': return '#F4436'; // Red (añadir estado cancelado si aplica a compras)
            default: return 'inherit';
        }
    };


    const getPagoColor = (pago) => {
        switch (pago) {
            case 'abonado': return '#2196F3'; // Blue
            case 'seña': return '#FF9800'; // Orange (Seña como naranja, similar a estados intermedios)
            case 'debe': // Para Ventas/VentasX
            case 'deuda': // Para Compras
                return '#F44336'; // Red
            default: return 'inherit';
        }
    };

    const getPagoDisplayText = (pago) => {
        switch (pago) {
            case 'abonado': return 'Abonado';
            case 'seña': return 'Seña';
            case 'debe': return 'Debe';
            case 'deuda': return 'Deuda'; // Mostrar 'Deuda' para compras
            default: return pago;
        }
    };


    return (
        <div className="container">
            <h2>Pantalla de Inicio</h2>
            <p>Resumen de elementos pendientes:</p>

            {/* Indicador de guardando */}
             {savingData && <p style={{ color: '#bbdefb' }}>Guardando cambios...</p>} {/* Color azul claro */}
            {loading && <p>Cargando pendientes...</p>}
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

            {!loading && !error && (
                <div className="pending-lists-container">

                    {/* Sección Ventas Pendientes */}
                    <div className="pending-section">
                        <h3>Ventas Pendientes ({pendingVentas.length})</h3>
                        {pendingVentas.length > 0 ? (
                            <table className="pending-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Fact Nro</th>
                                        <th>Cliente</th>
                                        <th>Estado</th>
                                        <th>Pago</th>
                                        <th>Total USD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVentas.map(venta => (
                                        // NUEVO: Añadir onClick a la fila
                                        <tr key={`venta-${venta.id}`} onClick={() => handleItemClick(venta, 'venta')}>
                                            {/* Format the date here */}
                                            <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                            <td>{venta.Fact_Nro || 'N/A'}</td>
                                            <td>{venta.Nombre_Cliente}</td>
                                            <td>
                                                <span style={{ backgroundColor: getEstadoVentaColor(venta.Estado), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                    {venta.Estado}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                    {getPagoDisplayText(venta.Pago)} {/* Usar getPagoDisplayText */}
                                                </span>
                                            </td>
                                            {/* Safely call toFixed only if venta.Total is a number */}
                                            <td>{typeof venta.Total === 'number' ? venta.Total.toFixed(2) : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No hay ventas pendientes.</p>
                        )}
                    </div>

                    {/* Sección VentasX Pendientes */}
                    <div className="pending-section">
                        <h3>Ventas X Pendientes ({pendingVentasX.length})</h3>
                        {pendingVentasX.length > 0 ? (
                            <table className="pending-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Nro VentaX</th>
                                        <th>Cliente</th>
                                        <th>Estado</th>
                                        <th>Pago</th>
                                        <th>Total USD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVentasX.map(venta => ( // Asegúrate de que aquí se use 'ventasX' si es el nombre de tu estado para VentasX
                                        // NUEVO: Añadir onClick a la fila
                                        <tr key={`ventax-${venta.id}`} onClick={() => handleItemClick(venta, 'ventax')}>
                                            {/* Format the date here */}
                                            <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                            <td>{venta.Nro_VentaX || 'N/A'}</td>
                                            <td>{venta.Nombre_Cliente}</td>
                                            <td>
                                                <span style={{ backgroundColor: getEstadoVentaColor(venta.Estado), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                    {venta.Estado}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                    {getPagoDisplayText(venta.Pago)} {/* Usar getPagoDisplayText */}
                                                </span>
                                            </td>
                                            {/* Safely call toFixed only if venta.Total is a number */}
                                            <td>{typeof venta.Total === 'number' ? venta.Total.toFixed(2) : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No hay Ventas X pendientes.</p>
                        )}
                    </div>

                    {/* Sección Compras Pendientes */}
                    <div className="pending-section">
                        <h3>Compras Pendientes ({pendingCompras.length})</h3>
                        {pendingCompras.length > 0 ? (
                             <table className="pending-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Fact Nro</th>
                                        <th>Proveedor</th>
                                        <th>Estado</th>
                                        <th>Pago</th>
                                        <th>Monto Total USD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingCompras.map(compra => {
                                         return (
                                         // NUEVO: Añadir onClick a la fila
                                            <tr key={`compra-${compra.id}`} onClick={() => handleItemClick(compra, 'compra')}>
                                                {/* Format the date here */}
                                                <td>{compra.Fecha ? format(new Date(compra.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                                <td>{compra.Fact_Nro}</td>
                                                <td>{compra.Nombre_Proveedor}</td>
                                                <td>
                                                    <span style={{ backgroundColor: getEstadoCompraColor(compra.Estado), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                        {compra.Estado}
                                                    </span>
                                                </td>
                                                <td> {/* Mostrar campo Pago para compras */}
                                                    <span style={{ backgroundColor: getPagoColor(compra.Pago), color: '#212121', fontWeight: 'bold', padding: '2px 5px', borderRadius: '3px' }}>
                                                        {getPagoDisplayText(compra.Pago)} {/* Usar getPagoDisplayText */}
                                                    </span>
                                                </td>
                                                {/* Safely call toFixed only if compra.MontoTotal is a number */}
                                                <td>{typeof compra.MontoTotal === 'number' ? compra.MontoTotal.toFixed(2) : 'N/A'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p>No hay compras pendientes con estado 'pedido' o pago 'deuda'.</p>
                        )}
                    </div>

                </div>
            )}

            {/* NUEVO: Renderizar el modal de edición si showEditModal es true y hay un itemToEdit */}
            {showEditModal && itemToEdit && (
                 <PendingItemEditModal
                     item={itemToEdit} // Pasar los datos del item
                     onClose={handleCloseModal} // Función para cerrar
                     onSave={handleSaveEditedItem} // Función async para guardar
                     // Pasar las listas de estados y pagos si son fijas, o definirlas en el modal
                     // Estos arreglos de strings están bien definidos aquí para el modal
                     ventaStates={['impresion', 'pedido', 'en maquina', 'listo', 'entregado', 'cancelado']} // Todos los estados posibles de Venta/VentaX
                     ventaPagos={['seña', 'debe', 'abonado']} // Todos los pagos posibles de Venta/VentaX
                     compraStates={['pedido', 'entregado', 'cancelado']} // Todos los estados posibles de Compra (añadido cancelado si aplica)
                 />
            )}


        </div>
    );
return (
        <div className="home-container" style={{ padding: '20px' }}>
            <h1>Panel de Control</h1>
            
            {/* INICIO INTEGRACIÓN IA */}
            <div className="row">
                <div className="col-12">
                    <IAPanel />
                </div>
            </div>
            {/* FIN INTEGRACIÓN IA */}

        </div>
    );
}

export default Home;
