// src/components/ListaComprasGlobal.js

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';

const electronAPI = window.electronAPI;

function ListaComprasGlobal() {
    // ... existing states

    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [totalComprasCount, setTotalComprasCount] = useState(0);
    const [totalComprasMontoTotal, setTotalComprasMontoTotal] = useState(0);
    const [totalComprasArs, setTotalComprasArs] = useState(0);


    // --- Handlers for predetermined date filters ---
    const setFilterToday = () => {
        const today = new Date();
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
    };

    const setFilterThisWeek = () => {
        const today = new Date();
        setStartDate(startOfWeek(today));
        setEndDate(endOfWeek(today));
    };

    const setFilterThisMonth = () => {
        const today = new Date();
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
    };

    const clearFilters = () => {
        setStartDate(null);
        setEndDate(null);
        // If you add other filters later, clear them here too
    };
    // --- End Handlers for predetermined date filters ---


    // NUEVO: Función async para obtener todas las compras filtradas
    const fetchFilteredCompras = async (start, end) => {
        console.log('[ListaComprasGlobal] Fetching filtered compras...');
        setLoading(true);
        setError(null);
        setCompras([]);
        setTotalComprasCount(0);
        setTotalComprasMontoTotal(0);
        setTotalComprasArs(0);

        const formattedStartDate = start ? format(start, 'yyyy-MM-dd') : null;
        const formattedEndDate = end ? format(end, 'yyyy-MM-dd') : null;

        try {
            // Usar await con la nueva función API para obtener compras filtradas por fecha
            const comprasData = await electronAPI.getAllComprasFiltered(formattedStartDate, formattedEndDate);
            console.log('All compras loaded:', comprasData.length, 'items');
             // Safely parse numerical values when setting state to ensure they are numbers
             // Also ensure Fecha is a Date object or null for formatting
            const parsedCompras = comprasData.map(compra => ({
                ...compra,
                Fecha: compra.Fecha ? new Date(compra.Fecha) : null, // Convert date string to Date object
                MontoTotal: compra.MontoTotal !== null && compra.MontoTotal !== undefined && !isNaN(parseFloat(compra.MontoTotal)) ? parseFloat(compra.MontoTotal) : null,
                Cotizacion_Dolar: compra.Cotizacion_Dolar !== null && compra.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(compra.Cotizacion_Dolar)) ? parseFloat(compra.Cotizacion_Dolar) : null,
                Total_ARS: compra.Total_ARS !== null && compra.Total_ARS !== undefined && !isNaN(parseFloat(compra.Total_ARS)) ? parseFloat(compra.Total_ARS) : null,
                Pago: compra.Pago || 'deuda', // Ensure default value
                Cuit_Proveedor: compra.Cuit_Proveedor || 'N/A', // Ensure default value
                 // Ensure items and their numerical properties are also parsed if necessary
                 items: compra.items ? compra.items.map(item => ({
                      ...item,
                      Cantidad: item.Cantidad !== null && item.Cantidad !== undefined && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null,
                      Precio_Unitario: item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario) : null,
                      Total_Item: item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null,
                 })) : [] // Provide empty array if items is null
            }));

            setCompras(parsedCompras); // Set the parsed data

            // Calculate summary statistics from the filtered list
            const count = parsedCompras.length; // Use parsedCompras
            const totalMonto = parsedCompras.reduce((sum, compra) => sum + (compra.MontoTotal || 0), 0); // Use parsedCompras
            const totalArs = parsedCompras.reduce((sum, compra) => sum + (compra.Total_ARS || 0), 0); // Use parsedCompras

            setTotalComprasCount(count);
            setTotalComprasMontoTotal(totalMonto);
            setTotalComprasArs(totalArs);

        } catch (err) {
            console.error('Error fetching all compras:', err);
            setError(err.message || 'Error al cargar el listado de compras.');
            setCompras([]);
            setTotalComprasCount(0);
            setTotalComprasMontoTotal(0);
            setTotalComprasArs(0);
        } finally {
            setLoading(false); // Always set loading to false
             console.log('[ListaComprasGlobal] Data loading finished.');
        }
    };


    // Fetch all purchases data based on date range (uses the updated backend handler)
    useEffect(() => {
        console.log('[ListaComprasGlobal] useEffect (dates) triggered with startDate:', startDate, 'endDate:', endDate);

        // Llamar a la función async para obtener compras filtradas
        // Pasar los estados de fecha actuales
        fetchFilteredCompras(startDate, endDate);

        // Eliminar listeners IPC que ya no se usan
        return () => {
            console.log('[ListaComprasGlobal] Cleaning up dates effect listener.');
            // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, [startDate, endDate]); // Depend on startDate and endDate (fetch when these change)


    // Helper function to get the display text for Estado (can reuse)
    const getEstadoDisplayText = (estado) => {
        switch (estado) {
            case 'pendiente': return 'Pendiente';
            case 'recibido': return 'Recibido';
            case 'cancelado': return 'Cancelado';
            case 'entregado': return 'Entregado'; // Assuming these might appear in global list
            case 'pedido': return 'Pedido';       // Assuming these might appear in global list
            default: return estado;
        }
    };

     // Helper function to get the display text for Pago (NEW)
     const getPagoDisplayText = (pago) => {
         switch (pago) {
             case 'abonado': return 'Abonado';
             case 'deuda': return 'Deuda';
             default: return pago;
         }
     };

     // Helper function to get the color for Pago (NEW)
     const getPagoColor = (pago) => {
         switch (pago) {
             case 'abonado': return '#2196F3'; // Blue
             case 'deuda': return '#F44336'; // Red
             default: return 'inherit';
         }
     };

     // Helper function to get the color for Estado (can reuse from ListaCompras)
     const getEstadoColor = (estado) => {
         switch (estado) {
             case 'entregado': return '#4CAF50'; // Green
             case 'pedido': return '#FF9800'; // Orange
             case 'cancelado': return '#F44336'; // Red
             default: return 'inherit';
         }
     };


     // Calculate Total Cost of Purchased Items for a single purchase (Keep existing)
     // NOTA: Este cálculo se basa en los items que vienen con la compra en la lista global.
     // Tu backend en server.js usa GROUP_CONCAT(JSON_OBJECT(...)) para incluirlos.
     const calculateTotalItemCost = (compra) => {
         // Use parsed items
         if (!compra.items || compra.items.length === 0) {
             return 0;
         }
         // Asegurar que items es un array y contiene objetos con propiedad Total_Item numérica
         // Ensure Total_Item is a valid number before adding
         const totalItemCost = compra.items.reduce((sum, item) => sum + (item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : 0), 0);
         return parseFloat(totalItemCost.toFixed(2));
     };


    // Render nothing while loading initially or if no data after loading
     if (loading && compras.length === 0 && !error && !startDate && !endDate) {
          return <p>Cargando datos...</p>;
     }


    return (
        <div className="container">
            <h2>Listado General de Compras</h2>

             {/* Date filter controls */}
             <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}> {/* Added flexWrap */}
                 <label>Filtrar por Fecha:</label>
                 <label htmlFor="startDate">Desde:</label>
                 <DatePicker
                     id="startDate"
                     selected={startDate}
                     onChange={(date) => setStartDate(date)}
                     dateFormat="dd/MM/yyyy"
                     isClearable
                     placeholderText="Inicio"
                     className="date-picker-input"
                 />
                 <label htmlFor="endDate">Hasta:</label>
                  <DatePicker
                     id="endDate"
                     selected={endDate}
                     onChange={(date) => setEndDate(date)}
                     dateFormat="dd/MM/yyyy"
                     isClearable
                     placeholderText="Fin"
                     className="date-picker-input"
                 />
                 {/* Predetermined date filter buttons */}
                  <button onClick={setFilterToday} disabled={loading}>Hoy</button>
                  <button onClick={setFilterThisWeek} disabled={loading}>Esta Semana</button>
                  <button onClick={setFilterThisMonth} disabled={loading}>Este Mes</button>
                  <button onClick={clearFilters} disabled={loading || (!startDate && !endDate)}>Limpiar Filtros</button>
             </div>

             {/* Summary area */}
             <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                 <h4>Resumen del Período Seleccionado</h4>
                 <p><strong>Cantidad de Compras:</strong> {totalComprasCount}</p>
                 {/* Apply check before toFixed for totalMontoTotal */}
                 <p><strong>Inversion Total (USD):</strong> {totalComprasMontoTotal !== null && totalComprasMontoTotal !== undefined && !isNaN(parseFloat(totalComprasMontoTotal)) ? parseFloat(totalComprasMontoTotal).toFixed(2) : 'N/A'}</p>
                 {/* Apply check before toFixed for totalComprasArs */}
                 <p><strong>Inversion Total (ARS):</strong> {totalComprasArs !== null && totalComprasArs !== undefined && !isNaN(parseFloat(totalComprasArs)) ? parseFloat(totalComprasArs).toFixed(2) : 'N/A'}</p>
             </div>


            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando Compras...</p>}

            {!loading && compras.length === 0 && !error && (
                <p>No hay Compras registradas para el rango de fechas seleccionado.</p>
            )}

            {/* Purchases Table */}
            {!loading && compras.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nro Factura</th>
                            <th>Proveedor</th>
                            <th>Estado</th>
                            <th>Pago</th> {/* <<< NUEVA COLUMNA */}
                            <th>Monto Total (USD)</th>
                            <th>Costo Total de Ítems (USD)</th>
                            <th>Total ARS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compras.map(compra => {
                            // Calculate dynamic fields
                            // NOTA: Este cálculo asume que compra.items viene poblado con los datos necesarios
                            const totalItemCost = calculateTotalItemCost(compra);

                            return (
                                <tr key={compra.id}>
                                    {/* CORRECCIÓN: Formatear la fecha a dd/MM/yy */}
                                    <td>{compra.Fecha ? format(compra.Fecha, 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{compra.Fact_Nro}</td>
                                    <td>{compra.Nombre_Proveedor}</td>
                                     {/* Display Estado */}
                                     <td style={{ backgroundColor: getEstadoColor(compra.Estado), color: '#212121', fontWeight: 'bold' }}>
                                         {getEstadoDisplayText(compra.Estado)}
                                     </td>
                                     {/* NUEVA CELDA: Pago con color */}
                                     <td style={{ backgroundColor: getPagoColor(compra.Pago), color: '#212121', fontWeight: 'bold' }}>
                                         {getPagoDisplayText(compra.Pago)}
                                     </td>
                                    {/* Apply check before toFixed for MontoTotal */}
                                    <td>{compra.MontoTotal !== null && compra.MontoTotal !== undefined && !isNaN(parseFloat(compra.MontoTotal)) ? parseFloat(compra.MontoTotal).toFixed(2) : 'N/A'}</td>
                                     {/* Display calculated total item cost */}
                                     {/* Apply check before toFixed for totalItemCost */}
                                    <td>{totalItemCost !== null && totalItemCost !== undefined && !isNaN(parseFloat(totalItemCost)) ? parseFloat(totalItemCost).toFixed(2) : 'N/A'}</td>
                                    {/* Apply check before toFixed for Total_ARS */}
                                    <td>{compra.Total_ARS !== null && compra.Total_ARS !== undefined && !isNaN(parseFloat(compra.Total_ARS)) ? parseFloat(compra.Total_ARS).toFixed(2) : 'N/A'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default ListaComprasGlobal;
