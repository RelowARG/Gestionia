// src/components/ListaVentasXGlobal.js (MODIFICADO con Filtros de Fecha, Costo Histórico y Funcionalidad de Edición)
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const electronAPI = window.electronAPI;

// Agregamos `onEditSale` como prop, similar a ListaVentasGlobal
function ListaVentasXGlobal({ onEditSale }) {
    const [ventasX, setVentasX] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [totalVentasXCount, setTotalVentasXCount] = useState(0);
    const [totalVentasXRealGain, setTotalVentasXRealGain] = useState(0);

    // --- Estado para la fila seleccionada (NUEVO) ---
    const [selectedVentaId, setSelectedVentaId] = useState(null);
    // -------------------------------------------

     const calculateMaterialCost = (ventaX) => {
        if (!ventaX.items || ventaX.items.length === 0) {
            return 0;
        }
        let totalMaterialCost = 0;
        ventaX.items.forEach((item) => {
            if (item.type === 'product' && item.Producto_id && (item.Cantidad !== null && item.Cantidad > 0)) {
                const costoRolloHist = item.costo_historico_x_rollo;
                const cantidadRollosVendidos = parseFloat(item.Cantidad);
                let itemCost = 0;
                if (costoRolloHist !== null && !isNaN(parseFloat(costoRolloHist)) && !isNaN(cantidadRollosVendidos)) {
                     const costoRolloFloat = parseFloat(costoRolloHist);
                     itemCost = costoRolloFloat * cantidadRollosVendidos;
                } else {
                     console.warn(`[Calc Cost VentaXGlobal - HIST] No se pudo determinar costo histórico (rollo o 1000) para item prod ID ${item.Producto_id}. Costo del item = 0.`);
                 }
                totalMaterialCost += itemCost;
            }
        });
        return parseFloat(totalMaterialCost.toFixed(2));
    };

    const fetchFilteredVentasX = async (start, end) => {
        console.log('[ListaVentasXGlobal] Fetching filtered ventas X...');
        setLoading(true);
        setError(null);
        setVentasX([]);
        setTotalVentasXCount(0);
        setTotalVentasXRealGain(0);
        setSelectedVentaId(null); // (NUEVO) Deseleccionar al recargar la lista

        const formattedStartDate = start ? format(start, 'yyyy-MM-dd') : null;
        const formattedEndDate = end ? format(end, 'yyyy-MM-dd') : null;

        try {
            const ventasXData = await electronAPI.getAllVentasXFiltered(formattedStartDate, formattedEndDate);
            console.log('Raw ventasXData received from API (with historical cost):', ventasXData.length);

            const parsedVentasX = ventasXData.map(ventaX => ({
                ...ventaX,
                 Fecha: ventaX.Fecha ? new Date(ventaX.Fecha) : null,
                Subtotal: parseFloat(ventaX.Subtotal) || null,
                Total: parseFloat(ventaX.Total) || null,
                Cotizacion_Dolar: parseFloat(ventaX.Cotizacion_Dolar) || null,
                Total_ARS: parseFloat(ventaX.Total_ARS) || null,
                items: ventaX.items ? ventaX.items.map(item => ({
                     ...item,
                     Cantidad: parseFloat(item.Cantidad) || null,
                     Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
                     Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
                     Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
                     Total_Item: parseFloat(item.Total_Item) || null,
                     costo_historico_x_1000: parseFloat(item.costo_historico_x_1000) || null,
                     costo_historico_x_rollo: parseFloat(item.costo_historico_x_rollo) || null,
                 })) : []
            }));

            setVentasX(parsedVentasX);

            const count = parsedVentasX.length;
            const totalGain = parsedVentasX.reduce((sum, ventaX) => {
                 const materialCost = calculateMaterialCost(ventaX);
                 const totalVentaXNum = ventaX.Total !== null ? ventaX.Total : 0;
                 const realGain = totalVentaXNum - materialCost;
                 return sum + realGain;
            }, 0);

            setTotalVentasXCount(count);
            setTotalVentasXRealGain(totalGain);

        } catch (err) {
            console.error('Error fetching all ventas X:', err);
            setError(err.message || 'Error al cargar el listado de Ventas X.');
            setVentasX([]);
            setTotalVentasXCount(0);
            setTotalVentasXRealGain(0);
            setSelectedVentaId(null); // (NUEVO) Asegurar deselección en caso de error
        } finally {
            setLoading(false);
             console.log('[ListaVentasXGlobal] Data loading finished.');
        }
    };

    useEffect(() => {
        console.log('[ListaVentasXGlobal] useEffect (dates) triggered with startDate:', startDate, 'endDate:', endDate);
        fetchFilteredVentasX(startDate, endDate);
    }, [startDate, endDate]);

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
    };

    // --- Handler para señalar edición (NUEVO) ---
    const handleEditSelected = () => {
        if (selectedVentaId !== null && onEditSale) {
            onEditSale(selectedVentaId); // Llama a la función pasada por el padre con el ID de la Venta X
        }
    };
    // ------------------------------------

     if (loading && ventasX.length === 0 && !error && !startDate && !endDate) {
         return <p>Cargando datos...</p>;
     }

    return (
        <div className="container">
            <h2>Listado General de Ventas X</h2>

             <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
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
                     disabled={loading}
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
                     disabled={loading}
                 />
                  <button onClick={setFilterToday} disabled={loading}>Hoy</button>
                  <button onClick={setFilterThisWeek} disabled={loading}>Esta Semana</button>
                  <button onClick={setFilterThisMonth} disabled={loading}>Este Mes</button>
                  <button onClick={clearFilters} disabled={loading || (!startDate && !endDate)}>Limpiar Filtros</button>

                   {/* --- Botón Editar (NUEVO) --- */}
                   <button
                       onClick={handleEditSelected}
                       disabled={selectedVentaId === null || loading || error}
                       style={{ marginLeft: '20px' }}
                   >
                       Editar Venta X Seleccionada {/* Texto ajustado para Venta X */}
                   </button>
                   {/* ------------------ */}
             </div>

             <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                 <h4>Resumen del Período Seleccionado</h4>
                 <p><strong>Cantidad de Ventas X:</strong> {totalVentasXCount}</p>
                 <p><strong>Ganancia Real Total (USD):</strong> {totalVentasXRealGain !== null && !isNaN(parseFloat(totalVentasXRealGain)) ? parseFloat(totalVentasXRealGain).toFixed(2) : 'N/A'}</p>
             </div>

            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando Ventas X...</p>}

            {!loading && ventasX.length === 0 && !error && (
                <p>No hay Ventas X registradas para el rango de fechas seleccionado.</p>
            )}

            {!loading && ventasX.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nro VentaX</th>
                            <th>Cliente</th>
                            <th>Subtotal</th>
                            <th>Total (USD)</th>
                            <th>Costo Material (USD)</th>
                            <th>Ganancia Real (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventasX.map(venta => {
                            const materialCost = calculateMaterialCost(venta);
                            const totalVentaXNum = venta.Total !== null ? venta.Total : 0;
                            const realGain = totalVentaXNum - materialCost;

                            return (
                                <tr
                                    key={venta.id}
                                    onClick={() => setSelectedVentaId(venta.id)} // (NUEVO) Manejar clic para seleccionar la fila
                                    style={{ // (NUEVO) Resaltar fila seleccionada
                                        cursor: 'pointer',
                                        backgroundColor: selectedVentaId === venta.id ? '#424242' : 'transparent',
                                    }}
                                >
                                    <td>{venta.Fecha ? format(venta.Fecha, 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{venta.Nro_VentaX}</td>
                                    <td>{venta.Nombre_Cliente}</td>
                                    <td>{venta.Subtotal !== null && !isNaN(venta.Subtotal) ? venta.Subtotal.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.Total !== null && !isNaN(venta.Total) ? venta.Total.toFixed(2) : 'N/A'}</td>
                                    <td>{materialCost !== null ? materialCost.toFixed(2) : 'N/A'}</td>
                                    <td style={{ color: realGain >= 0 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                                        {realGain !== null ? realGain.toFixed(2) : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default ListaVentasXGlobal;