// src/components/ListaVentasGlobal.js (MODIFICADO para seleccionar y señalar edición)
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const electronAPI = window.electronAPI;

// Agregamos `onEditSale` como prop. Esta función será pasada por un componente padre.
// Cuando el usuario haga clic en "Editar Venta Seleccionada", llamaremos a onEditSale
// pasándole el ID de la venta seleccionada.
function ListaVentasGlobal({ onEditSale }) {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [totalSalesCount, setTotalSalesCount] = useState(0);
    const [totalRealGain, setTotalRealGain] = useState(0);

    // --- Estado para la fila seleccionada ---
    // Guardamos el ID de la venta que el usuario seleccionó haciendo clic en la fila.
    const [selectedVentaId, setSelectedVentaId] = useState(null);
    // ---------------------------------------

    // --- Calculation Functions ---
    const calculateSaleTaxesAndNetTotal = (venta) => {
         const subtotal = venta.Subtotal !== null ? venta.Subtotal : 0;
         const totalUSD = venta.Total !== null ? venta.Total : 0;

         const iibbRate = 0.035; // 3.5%
         const transfRate = 0.023; // 2.3%
         const gananciasRate = 0.15; // 15%

         const iibb = subtotal * iibbRate;
         const transf = subtotal * transfRate;
         const ganancias = subtotal * gananciasRate;

         const totalDescImp = totalUSD - iibb - transf - ganancias;

         return {
             iibb: parseFloat(iibb.toFixed(2)),
             transf: parseFloat(transf.toFixed(2)),
             ganancias: parseFloat(ganancias.toFixed(2)),
             totalDescImp: parseFloat(totalDescImp.toFixed(2)),
         };
    };

     const calculateMaterialCost = (venta) => {
        if (!venta.items || venta.items.length === 0) {
            return 0;
        }

        let totalMaterialCost = 0;

        venta.items.forEach((item) => {
            if (item.type === 'product' && item.Producto_id && (item.Cantidad !== null && item.Cantidad > 0)) {
                const costoRolloHist = item.costo_historico_x_rollo;
                const cantidadRollosVendidos = parseFloat(item.Cantidad);
                let itemCost = 0; // Inicializa itemCost aquí

                if (costoRolloHist !== null && !isNaN(parseFloat(costoRolloHist)) && !isNaN(cantidadRollosVendidos)) {
                     const costoRolloFloat = parseFloat(costoRolloHist);
                     itemCost = costoRolloFloat * cantidadRollosVendidos;
                } else {
                     console.warn(`[Calc Cost VentaGlobal - HIST] No se pudo determinar costo histórico (rollo o 1000) para item prod ID ${item.Producto_id}. Costo del item = 0.`);
                }
                totalMaterialCost += itemCost; // Suma el costo calculado del ítem
            }
        });

        return parseFloat(totalMaterialCost.toFixed(2));
    };


    const fetchFilteredVentas = async (start, end) => {
        console.log('[ListaVentasGlobal] Fetching filtered ventas...');
        setLoading(true);
        setError(null);
        setVentas([]);
        setTotalSalesCount(0);
        setTotalRealGain(0);
        setSelectedVentaId(null); // Deseleccionar al recargar la lista

        const formattedStartDate = start ? format(start, 'yyyy-MM-dd') : null;
        const formattedEndDate = end ? format(end, 'yyyy-MM-dd') : null;

        try {
            const ventasData = await electronAPI.getAllVentasFiltered(formattedStartDate, formattedEndDate);
            console.log('Raw ventasData received from API (with historical cost):', ventasData.length);

            const parsedVentas = ventasData.map(venta => ({
                ...venta,
                Fecha: venta.Fecha ? new Date(venta.Fecha) : null,
                Subtotal: parseFloat(venta.Subtotal) || null,
                IVA: parseFloat(venta.IVA) || null,
                Total: parseFloat(venta.Total) || null,
                Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
                Total_ARS: parseFloat(venta.Total_ARS) || null,
                items: venta.items ? venta.items.map(item => ({
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

            setVentas(parsedVentas);

            const count = parsedVentas.length;
            const totalGain = parsedVentas.reduce((sum, venta) => {
                 const materialCost = calculateMaterialCost(venta);
                 const taxesAndNet = calculateSaleTaxesAndNetTotal(venta);
                 const realGain = (taxesAndNet.totalDescImp !== null ? taxesAndNet.totalDescImp : 0) - materialCost;
                 return sum + realGain;
            }, 0);

            setTotalSalesCount(count);
            setTotalRealGain(totalGain);

        } catch (err) {
            console.error('Error fetching all ventas:', err);
            setError(err.message || 'Error al cargar el listado de ventas.');
            setVentas([]);
            setTotalSalesCount(0);
            setTotalRealGain(0);
            setSelectedVentaId(null);
        } finally {
            setLoading(false);
             console.log('[ListaVentasGlobal] Data loading finished.');
        }
    };

    useEffect(() => {
        console.log('[ListaVentasGlobal] useEffect (dates) triggered with startDate:', startDate, 'endDate:', endDate);
        fetchFilteredVentas(startDate, endDate);

        // No necesitas limpiar listeners aquí porque fetchFilteredVentas ya no usa listeners IPC
    }, [startDate, endDate]);

    // --- HANDLERS DE FILTRO AÑADIDOS ---
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
    // ---------------------------------

    // --- Handler para señalar edición ---
    // Esta función se llama cuando se hace clic en el botón "Editar Venta Seleccionada".
    const handleEditSelected = () => {
        // Verificamos si hay una venta seleccionada y si la prop onEditSale fue proporcionada.
        if (selectedVentaId !== null && onEditSale) {
            // Llamamos a la función `onEditSale` pasada por el componente padre,
            // enviando el ID de la venta que queremos editar.
            onEditSale(selectedVentaId);
        }
    };
    // ------------------------------------

     if (loading && ventas.length === 0 && !error && !startDate && !endDate) {
         return <p>Cargando datos...</p>;
     }

    return (
        <div className="container">
            <h2>Listado General de Ventas</h2>

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

                   {/* --- Botón Editar --- */}
                   {/* Este botón llama a handleEditSelected cuando se hace clic */}
                   <button
                       onClick={handleEditSelected}
                       disabled={selectedVentaId === null || loading || error} // Deshabilitado si no hay venta seleccionada o está cargando/hay error
                       style={{ marginLeft: '20px' }} // Espacio para separarlo de los filtros
                   >
                       Editar Venta Seleccionada
                   </button>
                   {/* ------------------ */}

             </div>

             <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                 <h4>Resumen del Período Seleccionado</h4>
                 <p><strong>Cantidad de Ventas:</strong> {totalSalesCount}</p>
                 <p><strong>Ganancia Real Total (USD):</strong> {totalRealGain !== null && !isNaN(parseFloat(totalRealGain)) ? parseFloat(totalRealGain).toFixed(2) : 'N/A'}</p>
             </div>


            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando Ventas...</p>}

            {!loading && ventas.length === 0 && !error && (
                <p>No hay Ventas registradas para el rango de fechas seleccionado.</p>
            )}

            {/* Tabla de Ventas */}
            {!loading && ventas.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            {/* No necesitamos una columna de selección explícita, la fila es clickable */}
                            <th>Fecha</th>
                            <th>Nro Factura</th>
                            <th>Cliente</th>
                            <th>Subtotal</th>
                            <th>IVA</th>
                            <th>Total (USD)</th>
                            <th>IIBB (3.5%)</th>
                            <th>Transf (2.3%)</th>
                            <th>Ganancias (15%)</th>
                            <th>Total Desc Imp (USD)</th>
                            <th>Costo Material (USD)</th>
                            <th>Ganancia Real (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.map(venta => {
                            const taxesAndNet = calculateSaleTaxesAndNetTotal(venta);
                            const materialCost = calculateMaterialCost(venta);
                            const totalDescImpNum = taxesAndNet.totalDescImp !== null && !isNaN(taxesAndNet.totalDescImp) ? taxesAndNet.totalDescImp : 0;
                            const realGain = totalDescImpNum - materialCost;

                            return (
                                <tr
                                    key={venta.id}
                                    onClick={() => setSelectedVentaId(venta.id)} // --- Manejar clic para seleccionar la fila ---
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: selectedVentaId === venta.id ? '#424242' : 'transparent', // --- Resaltar fila seleccionada ---
                                    }}
                                >
                                    <td>{venta.Fecha ? format(venta.Fecha, 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{venta.Fact_Nro}</td>
                                    <td>{venta.Nombre_Cliente}</td>
                                    <td>{venta.Subtotal !== null && !isNaN(venta.Subtotal) ? venta.Subtotal.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.IVA !== null && !isNaN(venta.IVA) ? venta.IVA.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.Total !== null && !isNaN(venta.Total) ? venta.Total.toFixed(2) : 'N/A'}</td>
                                    <td>{taxesAndNet.iibb.toFixed(2)}</td>
                                    <td>{taxesAndNet.transf.toFixed(2)}</td>
                                    <td>{taxesAndNet.ganancias.toFixed(2)}</td>
                                    <td>{taxesAndNet.totalDescImp.toFixed(2)}</td>
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

export default ListaVentasGlobal;