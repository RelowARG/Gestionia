// src/components/SupplierPurchasesDetails.js (Modified for Date Formatting)

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns'; // <--- Asegúrate que esta línea esté
import PurchaseDetailsModal from './PurchaseDetailsModal';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function SupplierPurchasesDetails({ proveedorId, proveedorName }) {
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [selectedCompraForDetail, setSelectedCompraForDetail] = useState(null);
    const [compraDetailsData, setCompraDetailsData] = useState(null);
    const [loadingCompraDetails, setLoadingCompraDetails] = useState(false);
    const [compraDetailsError, setCompraDetailsError] = useState(null);
    const [showCompraDetailsModal, setShowCompraDetailsModal] = useState(false);


    // Effect para cargar la lista de compras cuando cambia el proveedor seleccionado o las fechas
    useEffect(() => {
        console.log('[SupplierPurchasesDetails] useEffect (proveedorId, dates) triggered with proveedorId:', proveedorId, 'startDate:', startDate, 'endDate:', endDate);
        if (!proveedorId) {
            console.log('[SupplierPurchasesDetails] proveedorId is null, clearing data.');
            setCompras([]);
            setLoading(false);
            setError(null);
            // Limpiar detalles de compra si el proveedor se deselecciona
            setSelectedCompraForDetail(null);
            setCompraDetailsData(null);
            setLoadingCompraDetails(false);
            setCompraDetailsError(null);
            setShowCompraDetailsModal(false);
            return;
        }

        console.log(`[SupplierPurchasesDetails] Fetching purchases for supplier ID: ${proveedorId} with date range: ${startDate} to ${endDate}`);
        setLoading(true);
        setError(null);
        setCompras([]); // Clear previous compras data
        // Asegurarse de cerrar y limpiar detalles al cargar nuevas listas
        setSelectedCompraForDetail(null);
        setCompraDetailsData(null);
        setLoadingCompraDetails(false);
        setCompraDetailsError(null);
        setShowCompraDetailsModal(false);

        const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
        const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

        // NUEVO: Función async para obtener compras por proveedor y fecha
        const fetchComprasForProveedor = async () => {
            try {
                 // Call the async API function and await the result
                const data = await electronAPI.getComprasByProveedorId(proveedorId, formattedStartDate, formattedEndDate); // New API call
                console.log(`Compras loaded for supplier ${proveedorId}:`, data.length, 'items');
                console.log('[SupplierPurchasesDetails] Data received:', data);
                 // Parsear Fecha a objeto Date aquí si es necesario para otras operaciones,
                 // aunque para mostrarla formateada podemos hacerlo directamente en el JSX.
                 // Si necesitas filtrar/ordenar por fecha en el frontend, es mejor parsearla aquí:
                 const parsedData = data.map(compra => ({
                    ...compra,
                    Fecha: compra.Fecha ? new Date(compra.Fecha) : null // Parse string to Date object
                 }));
                setCompras(parsedData); // Usar data parseada si se parseó

            } catch (err) {
                console.error(`Error fetching compras for supplier ${proveedorId}:`, err);
                setError(err.message || `Error al cargar las compras del proveedor.`);
                setCompras([]);
            } finally {
                setLoading(false); // Always set loading to false
                 console.log('[SupplierPurchasesDetails] Initial data loading finished.');
            }
        };

        // Llamar a la función async
        fetchComprasForProveedor();

        // Eliminar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        return () => {
            console.log('[SupplierPurchasesDetails] Cleaning up dates effect listener.');
            // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };

    }, [proveedorId, startDate, endDate]); // Depend on proveedorId, startDate, and endDate


    // Effect for fetching details of a selected purchase
    useEffect(() => {
        console.log('[SupplierPurchasesDetails] useEffect (selectedCompraForDetail) triggered with:', selectedCompraForDetail);
        if (!selectedCompraForDetail) {
            console.log('[SupplierPurchasesDetails] selectedCompraForDetail is null, clearing detail data.');
            setCompraDetailsData(null);
            setLoadingCompraDetails(false);
            setCompraDetailsError(null);
            setShowCompraDetailsModal(false);
            return;
        }

        console.log(`[SupplierPurchasesDetails] Fetching details for Compra ID: ${selectedCompraForDetail.id}`);
        setLoadingCompraDetails(true);
        setCompraDetailsError(null);
        setCompraDetailsData(null); // Clear previous data

        // NUEVO: Función async para obtener los detalles de la compra
        const fetchCompraDetails = async () => {
            try {
                 // Call the async API function and await the result
                const data = await electronAPI.getCompraById(selectedCompraForDetail.id); // New API call
                console.log(`Details loaded for Compra ID ${selectedCompraForDetail.id}. Showing modal.`);
                setCompraDetailsData(data); // Data is the direct response
                 setShowCompraDetailsModal(true); // Show the modal on success

            } catch (err) {
                console.error(`Error fetching details for Compra ID ${selectedCompraForDetail.id}:`, err);
                setCompraDetailsError(err.message || `Error al cargar los detalles de la compra.`);
                setCompraDetailsData(null); // Clear data on error
                 setShowCompraDetailsModal(false); // Keep modal closed on error
            } finally {
                setLoadingCompraDetails(false); // Always set loading to false
            }
        };

        // Llamar a la función async
        fetchCompraDetails();

        // Eliminar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // No hay listeners 'once' definidos aquí que necesiten limpieza explícita en el return del efecto.
        return () => {
             console.log('[SupplierPurchasesDetails] Cleaning up detail effect listener.');
            // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };

    }, [selectedCompraForDetail]); // Re-run effect when a new budget is selected


    const handleCompraRowClick = (compraId) => { // Keep this
        console.log(`[SupplierPurchasesDetails] Row clicked: Compra with ID ${compraId}`);
        if (selectedCompraForDetail?.id === compraId) {
             console.log('[SupplierPurchasesDetails] Same row clicked again, deseleccionando.');
             setSelectedCompraForDetail(null); // Deselect and close modal
        } else {
             console.log('[SupplierPurchasesDetails] Different row clicked or no row selected, selecting.');
            setSelectedCompraForDetail({ id: compraId }); // Set to trigger detail fetch
        }
    };

     const handleCloseCompraDetailsModal = () => { // Keep this
        console.log('[SupplierPurchasesDetails] Closing purchase details modal.');
        setSelectedCompraForDetail(null); // This will also clear compraDetailsData and hide the modal via the second useEffect
    };


     // Helper function to get the display text for Estado (can reuse)
     const getEstadoDisplayText = (estado) => { // Keep this
         switch (estado) {
             case 'pendiente': return 'Pendiente';
             case 'recibido': return 'Recibido';
             case 'cancelado': return 'Cancelado';
             case 'entregado': return 'Entregado'; // Assuming these might appear in global list
             case 'pedido': return 'Pedido';       // Assuming these might appear in global list
             default: return estado;
         }
     };

     // Helper function to get the color for Estado (Keep existing)
     const getEstadoColor = (estado) => { // Keep this
         switch (estado) {
             case 'entregado': return '#4CAF50'; // Green
             case 'pedido': return '#FF9800'; // Orange
             case 'cancelado': return '#F44336'; // Red (añadir estado cancelado si aplica a compras)
             default: return 'inherit';
         }
     };

     // Helper function to get the display text for Pago (NEW) (Keep this)
     const getPagoDisplayText = (pago) => {
         switch (pago) {
             case 'abonado': return 'Abonado';
             case 'deuda': return 'Deuda';
             default: return pago;
         }
     };

     // Helper function to get the color for Pago (NEW) (Keep this)
     const getPagoColor = (pago) => {
         switch (pago) {
             case 'abonado': return '#2196F3'; // Blue
             case 'deuda': return '#F44336'; // Red
             default: return 'inherit';
         }
     };


    console.log('[SupplierPurchasesDetails] Rendering. showCompraDetailsModal:', showCompraDetailsModal, 'selectedCompraForDetail:', selectedCompraForDetail);

    if (!proveedorId) {
        return null; // Keep this
    }

    return (
        <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Compras de {proveedorName}</h3>
                 {/* Date filters */}
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                     <label htmlFor="startDate">Desde:</label>
                     <DatePicker
                         id="startDate"
                         selected={startDate}
                         onChange={(date) => setStartDate(date)}
                         dateFormat="dd/MM/yyyy"
                         isClearable
                         placeholderText="Seleccionar Fecha"
                          className="date-picker-input"
                     />
                     <label htmlFor="endDate">Hasta:</label>
                      <DatePicker
                         id="endDate"
                         selected={endDate}
                         onChange={(date) => setEndDate(date)}
                         dateFormat="dd/MM/yyyy"
                         isClearable
                         placeholderText="Seleccionar Fecha"
                          className="date-picker-input"
                     />
                 </div>
             </div>


            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando compras para {proveedorName}...</p>}

            {!loading && compras.length === 0 && !error && (
                <p>No hay compras registradas para este proveedor para el rango de fechas seleccionado.</p>
            )}

            {!loading && compras.length > 0 && (
                <div>
                    <h4>Lista de Compras</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th> {/* <-- COLUMNA A FORMATEAR */}
                                <th>Nro Factura</th>
                                <th>Estado</th>
                                <th>Pago</th> {/* <<< NUEVA COLUMNA */}
                                <th>Total USD</th>
                                <th>Total ARS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.map(compra => {
                                 // LOGGING DETALLADO PARA DEPURACIÓN:
                                 const estadoColor = getEstadoColor(compra.Estado);
                                 const pagoColor = getPagoColor(compra.Pago); // <<< Obtener color para Pago
                                 console.log(`[SupplierPurchasesDetails] Compra ID: ${compra.id}, Estado: "${compra.Estado}", EstadoColor: "${estadoColor}", Pago: "${compra.Pago}", PagoColor: "${pagoColor}"`);


                                 return (
                                     <tr
                                         key={compra.id}
                                         onClick={() => handleCompraRowClick(compra.id)}
                                         style={{ cursor: 'pointer', backgroundColor: selectedCompraForDetail?.id === compra.id ? '#424242' : 'transparent' }}
                                     >
                                         {/* ----- MODIFICACIÓN AQUÍ ----- */}
                                         <td>{compra.Fecha ? format(new Date(compra.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                         {/* ----------------------------- */}
                                         <td>{compra.Fact_Nro}</td>
                                          <td style={{ backgroundColor: estadoColor, color: '#212121', fontWeight: 'bold' }}>
                                              {getEstadoDisplayText(compra.Estado)}
                                          </td>
                                          {/* NUEVA CELDA: Pago con color */}
                                          <td style={{ backgroundColor: pagoColor, color: '#212121', fontWeight: 'bold' }}>
                                              {getPagoDisplayText(compra.Pago)}
                                          </td>
                                          {/* Safely format numbers */}
                                          <td>{compra.MontoTotal !== null && !isNaN(parseFloat(compra.MontoTotal)) ? parseFloat(compra.MontoTotal).toFixed(2) : 'N/A'}</td>
                                          <td>{compra.Total_ARS !== null && !isNaN(parseFloat(compra.Total_ARS)) ? parseFloat(compra.Total_ARS).toFixed(2) : 'N/A'}</td>
                                     </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Render the Purchase Details Modal (Keep as is, pass fetched data and states) */}
            {showCompraDetailsModal && selectedCompraForDetail && (
                 <PurchaseDetailsModal
                     compraData={compraDetailsData} // Pass the fetched data
                     onClose={handleCloseCompraDetailsModal}
                     loading={loadingCompraDetails}
                     error={compraDetailsError}
                 />
            )}

        </div>
    );
}

export default SupplierPurchasesDetails;