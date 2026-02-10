// src/components/ClientSalesDetails.js (Modified for Backend API Communication, Numerical Parsing, and Date Formatting)
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker'; // Import DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Import datepicker styles
import SaleDetailsModal from './SaleDetailsModal'; // Import the new component
import { format } from 'date-fns'; // Import format for date string

const electronAPI = window.electronAPI; // Acceder a la API expuesta globalmente

function ClientSalesDetails({ clientId, clientName }) {
    // ... (estados existentes: ventas, ventasX, loading, error) ...
    const [ventas, setVentas] = useState([]);
    const [ventasX, setVentasX] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // NUEVOS ESTADOS para el detalle de venta/ventaX (Keep these)
    const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null); // { type: 'venta' | 'ventaX', id: number }
    const [saleDetailsData, setSaleDetailsData] = useState(null); // Datos completos de la venta/ventaX seleccionada
    const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
    const [saleDetailsError, setSaleDetailsError] = useState(null);
    const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);

    // NUEVOS ESTADOS para el rango de fechas
    const [startDate, setStartDate] = useState(null); // Estado para la fecha "Desde"
    const [endDate, setEndDate] = useState(null); // Estado para la fecha "Hasta"


    // Effect para cargar las listas de ventas y ventasX cuando cambia el cliente seleccionado O las fechas
    useEffect(() => {
        console.log('[ClientSalesDetails] useEffect (clientId, dates) triggered with clientId:', clientId, 'startDate:', startDate, 'endDate:', endDate);
        if (!clientId) {
            console.log('[ClientSalesDetails] clientId is null, clearing data.');
            setVentas([]);
            setVentasX([]);
            setLoading(false);
            setError(null);
            // Limpiar detalles de venta/ventaX también si el cliente se deselecciona
            setSelectedSaleForDetail(null);
            setSaleDetailsData(null);
            setLoadingSaleDetails(false);
            setSaleDetailsError(null);
            setShowSaleDetailsModal(false);
            return;
        }

        console.log(`[ClientSalesDetails] Fetching sales for client ID: ${clientId} with date range: ${startDate} to ${endDate}`);
        setLoading(true);
        setError(null);
        setVentas([]); // Clear previous sales data
        setVentasX([]); // Clear previous ventasX data
        // Asegurarse de cerrar y limpiar detalles al cargar nuevas listas
        setSelectedSaleForDetail(null);
        setSaleDetailsData(null);
        setLoadingSaleDetails(false);
        setSaleDetailsError(null);
        setShowSaleDetailsModal(false);

        // Formatear las fechas a stringYYYY-MM-DD si existen
        const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
        const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

        // NUEVO: Función async para obtener ambas listas
        const fetchSalesLists = async () => {
            try {
                // Usar await con las nuevas funciones API para obtener listas filtradas por cliente y fecha
                const ventasResponse = await electronAPI.getVentasByClientId(clientId, formattedStartDate, formattedEndDate);
                console.log(`[ClientSalesDetails] Ventas loaded for client ${clientId}:`, ventasResponse.length, 'items');
                // Parse numerical fields for ventas
                const parsedVentas = ventasResponse.map(venta => ({
                    ...venta,
                    // Safely parse numerical fields, defaulting to null if invalid
                    Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
                    Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
                     // Ensure Fecha is a valid Date object or string that can be parsed by DatePicker if needed elsewhere
                     // For display, we will format the string directly.
                }));
                setVentas(parsedVentas); // Data is the direct response

                const ventasXResponse = await electronAPI.getVentasXByClientId(clientId, formattedStartDate, formattedEndDate);
                console.log(`[ClientSalesDetails] VentasX loaded for client ${clientId}:`, ventasXResponse.length, 'items');
                 // Parse numerical fields for ventasX
                 const parsedVentasX = ventasXResponse.map(venta => ({
                     ...venta,
                     // Safely parse numerical fields, defaulting to null if invalid
                     Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
                     Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
                      // Ensure Fecha is a valid Date object or string that can be parsed by DatePicker if needed elsewhere
                      // For display, we will format the string directly.
                 }));
                setVentasX(parsedVentasX); // Data is the direct response

            } catch (err) {
                console.error(`[ClientSalesDetails] Error fetching sales lists for client ${clientId}:`, err);
                // Mostrar un mensaje de error
                setError(err.message || `Error al cargar el historial de ventas del cliente.`);
                // Limpiar las listas en caso de error
                setVentas([]);
                setVentasX([]);
            } finally {
                setLoading(false); // Ocultar loading al finalizar (éxito o error)
                console.log('[ClientSalesDetails] Initial data loading finished.');
            }
        };

        // Llamar a la función async
        fetchSalesLists();

        // Limpiar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        // porque las funciones expuestas son directas y no usan eventos IPC para las respuestas.
        return () => {
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, [clientId, startDate, endDate]); // Dependency array: re-run effect when clientId, startDate, or endDate changes


    // Effect for fetching details of a selected sale/ventaX (Keep this as is)
    useEffect(() => {
        console.log('[ClientSalesDetails] useEffect (selectedSaleForDetail) triggered with:', selectedSaleForDetail);
        if (!selectedSaleForDetail) {
            console.log('[ClientSalesDetails] selectedSaleForDetail is null, clearing detail data.');
            setSaleDetailsData(null);
            setLoadingSaleDetails(false);
            setSaleDetailsError(null);
            setShowSaleDetailsModal(false); // Ensure modal is closed
            return;
        }

        console.log(`[ClientSalesDetails] Fetching details for ${selectedSaleForDetail.type} ID: ${selectedSaleForDetail.id}`);
        setLoadingSaleDetails(true);
        setSaleDetailsError(null);
        setSaleDetailsData(null); // Clear previous data

        // NUEVO: Función async para obtener los detalles
        const fetchSaleDetails = async () => {
            try {
                 let details = null;
                 // Usar await con la función API correcta según el tipo de venta
                 if (selectedSaleForDetail.type === 'venta') {
                      details = await electronAPI.getVentaById(selectedSaleForDetail.id);
                 } else if (selectedSaleForDetail.type === 'ventaX') {
                      details = await electronAPI.getVentaXById(selectedSaleForDetail.id);
                 }
                 console.log(`[ClientSalesDetails] Details loaded for ${selectedSaleForDetail.type} ID ${selectedSaleForDetail.id}:`, details);
                 setSaleDetailsData(details); // Store the fetched data
                 setShowSaleDetailsModal(true); // Show the modal

             } catch (err) {
                 console.error(`[ClientSalesDetails] Error fetching details for ${selectedSaleForDetail.type} ID ${selectedSaleForDetail.id}:`, err);
                 setSaleDetailsError(err.message || `Error al cargar los detalles de la ${selectedSaleForDetail.type}.`);
                 setSaleDetailsData(null); // Clear data on error
                 setShowSaleDetailsModal(false); // Keep modal closed on error
             } finally {
                 setLoadingSaleDetails(false);
             }
        };

        // Llamar a la función async
        fetchSaleDetails();

        // Limpiar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        // porque las funciones expuestas son directas y no usan eventos IPC para las respuestas.
        // No hay listeners 'once' definidos aquí que necesiten limpieza explícita en el return del efecto.
        return () => {
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, [selectedSaleForDetail]); // Re-run effect when selectedSaleForDetail changes


    // Manejador de clic para las filas de venta/ventaX (Keep this as is)
    const handleSaleRowClick = (saleId, saleType) => {
        console.log(`[ClientSalesDetails] Row clicked: ${saleType} with ID ${saleId}`);
         // Check if the same row is clicked again to deselect
        if (selectedSaleForDetail?.id === saleId && selectedSaleForDetail?.type === saleType) {
             console.log('[ClientSalesDetails] Same row clicked again, deselecting.');
             setSelectedSaleForDetail(null); // Deselect and close modal
        } else {
             console.log('[ClientSalesDetails] Different row clicked or no row selected, selecting.');
            // Set the state to trigger the useEffect to fetch details
            setSelectedSaleForDetail({ type: saleType, id: saleId });
        }
    };

     // Función para cerrar el modal de detalles (Keep this as is)
    const handleCloseSaleDetailsModal = () => {
        console.log('[ClientSalesDetails] Closing sale details modal.');
        setSelectedSaleForDetail(null); // This will also clear saleDetailsData and hide the modal via the second useEffect
    };


    // Helper functions for Estado and Pago (Keep these as is)
    const getEstadoDisplayText = (estado) => {
        switch (estado) {
            case 'entregado': return 'Entregado';
            case 'en maquina': return 'En Máquina';
            case 'pedido': return 'Pedido';
            case 'cancelado': return 'Cancelado';
            case 'listo': return 'Listo';
            default: return estado;
        }
    };

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'entregado': return '#4CAF50'; // Green
            case 'en maquina':
            case 'pedido': return '#FF9800'; // Orange
            case 'cancelado': return '#F44336'; // Red
            case 'listo': return '#2196F3'; // Blue
            default: return 'inherit'; // Default color
        }
    };

    const getPagoDisplayText = (pago) => {
        switch (pago) {
            case 'abonado': return 'Abonado';
            case 'seña': return 'Seña';
            case 'debe': return 'Debe';
            default: return pago;
        }
    };

    const getPagoColor = (pago) => {
        switch (pago) {
            case 'abonado': return '#2196F3'; // Blue
            case 'seña': return '#FF9800'; // Orange
            case 'debe': return '#F44336'; // Red
            default: return 'inherit'; // Default color
        }
    };

    console.log('[ClientSalesDetails] Rendering. showSaleDetailsModal:', showSaleDetailsModal, 'selectedSaleForDetail:', selectedSaleForDetail);

    // Render nothing if no client is selected
    if (!clientId) {
        return null;
    }

    return (
        <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
             {/* Contenedor para el título y los selectores de fecha */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3>Historial de {clientName}</h3>
                 {/* Selectores de fecha */}
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                     <label htmlFor="startDate">Desde:</label>
                     <DatePicker
                         id="startDate"
                         selected={startDate}
                         onChange={(date) => setStartDate(date)}
                         dateFormat="dd/MM/yyyy"
                         isClearable
                         placeholderText="Seleccionar Fecha"
                         className="date-picker-input" // Clase para aplicar estilos si tienes CSS global
                     />
                     <label htmlFor="endDate">Hasta:</label>
                      <DatePicker
                         id="endDate"
                         selected={endDate}
                         onChange={(date) => setEndDate(date)}
                         dateFormat="dd/MM/yyyy"
                         isClearable
                         placeholderText="Seleccionar Fecha"
                         className="date-picker-input" // Clase para aplicar estilos si tienes CSS global
                     />
                 </div>
             </div>


            {/* Mostrar errores generales de carga de listas */}
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando ventas para {clientName}...</p>}

            {!loading && ventas.length === 0 && ventasX.length === 0 && !error && (
                <p>No hay ventas ni Ventas X registradas para este cliente para el rango de fechas seleccionado.</p>
            )}

            {/* Display Ventas (Standard Sales) */}
            {!loading && ventas.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    <h4>Ventas (Factura A)</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Nro Factura</th>
                                <th>Estado</th>
                                <th>Pago</th>
                                <th>Total USD</th>
                                <th>Total ARS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map(venta => (
                                <tr
                                    key={`venta-${venta.id}`}
                                    onClick={() => handleSaleRowClick(venta.id, 'venta')} // Añadir manejador de clic
                                    style={{ cursor: 'pointer', backgroundColor: selectedSaleForDetail?.id === venta.id && selectedSaleForDetail?.type === 'venta' ? '#424242' : 'transparent' }} // Resaltar fila seleccionada
                                >
                                    {/* Format the date here */}
                                    <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{venta.Fact_Nro}</td>
                                    <td style={{ backgroundColor: getEstadoColor(venta.Estado), color: '#212121', fontWeight: 'bold' }}>
                                        {getEstadoDisplayText(venta.Estado)}
                                    </td>
                                    <td style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold' }}>
                                        {getPagoDisplayText(venta.Pago)}
                                    </td>
                                    {/* Safely call toFixed only if venta.Total is a number */}
                                    <td>{typeof venta.Total === 'number' ? venta.Total.toFixed(2) : 'N/A'}</td>
                                    {/* Safely call toFixed only if venta.Total_ARS is a number */}
                                    <td>{typeof venta.Total_ARS === 'number' ? venta.Total_ARS.toFixed(2) : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

             {/* Display VentasX */}
            {!loading && ventasX.length > 0 && (
                 <div>
                     <h4>Ventas X</h4>
                     <table>
                         <thead>
                             <tr>
                                 <th>Fecha</th>
                                 <th>Nro VentaX</th>
                                 <th>Estado</th>
                                 <th>Pago</th>
                                 <th>Total USD</th>
                                 <th>Total ARS</th>
                             </tr>
                         </thead>
                         <tbody>
                             {ventasX.map(venta => (
                                 <tr
                                     key={`ventax-${venta.id}`}
                                     onClick={() => handleSaleRowClick(venta.id, 'ventaX')} // Añadir manejador de clic
                                     style={{ cursor: 'pointer', backgroundColor: selectedSaleForDetail?.id === venta.id && selectedSaleForDetail?.type === 'ventaX' ? '#424242' : 'transparent' }} // Resaltar fila seleccionada
                                 >
                                      {/* Format the date here */}
                                     <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                     <td>{venta.Nro_VentaX}</td>
                                      <td style={{ backgroundColor: getEstadoColor(venta.Estado), color: '#212121', fontWeight: 'bold' }}>
                                          {getEstadoDisplayText(venta.Estado)}
                                      </td>
                                      <td style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold' }}>
                                          {getPagoDisplayText(venta.Pago)}
                                      </td>
                                     {/* Safely call toFixed only if venta.Total is a number */}
                                     <td>{typeof venta.Total === 'number' ? venta.Total.toFixed(2) : 'N/A'}</td>
                                     {/* Safely call toFixed only if venta.Total_ARS is a number */}
                                     <td>{typeof venta.Total_ARS === 'number' ? venta.Total_ARS.toFixed(2) : 'N/A'}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            )}

            {/* NUEVO: Renderizar el Modal de Detalles de Venta/VentaX */}
            {/* Se muestra si showSaleDetailsModal es true */}
            {showSaleDetailsModal && selectedSaleForDetail && ( // Asegurarse de que selectedSaleForDetail no sea null
                 <SaleDetailsModal
                     saleData={saleDetailsData} // Pasamos los datos completos obtenidos
                     saleType={selectedSaleForDetail.type} // NUEVO: Pasamos el tipo de venta/ventaX
                     onClose={handleCloseSaleDetailsModal} // Función para cerrar el modal
                     loading={loadingSaleDetails} // Estado de carga
                     error={saleDetailsError} // Estado de error
                 />
            )}

        </div>
    );
}

export default ClientSalesDetails;
