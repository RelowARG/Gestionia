// src/components/Statistics.js (Updated with Backend API Communication and Parsing and Key Props)
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Hook to get URL parameters

// Access the globally exposed API from preload.js
const electronAPI = window.electronAPI;

function Statistics() {
    // Get the current URL location and query parameters
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    // Get the 'stat' parameter from the URL (e.g., ?stat=topClients)
    const selectedStat = searchParams.get('stat');

    // State variables for each type of statistic data
    const [inactiveClients, setInactiveClients] = useState([]);
    const [topClients, setTopClients] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [leastSoldProducts, setLeastSoldProducts] = useState([]);
    const [topMonths, setTopMonths] = useState([]);
    const [monthlyYearlySalesData, setMonthlyYearlySalesData] = useState([]);
    const [stockRotationData, setStockRotationData] = useState([]);


    // Loading and error state variables
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // useEffect hook to fetch data when the selected statistic changes
    useEffect(() => {
        console.log('[Statistics] selectedStat changed:', selectedStat);
        // Reset all statistic states, loading, and error when selectedStat changes
        setInactiveClients([]);
        setTopClients([]);
        setTopProducts([]);
        setLeastSoldProducts([]);
        setTopMonths([]);
        setMonthlyYearlySalesData([]);
        setStockRotationData([]);
        setLoading(true); // Set loading to true before fetching
        setError(null); // Clear previous errors

        // Asynchronous function to fetch data based on the selected statistic
        const fetchStatisticData = async () => {
            try {
                // Use a switch statement to call the appropriate API function
                switch (selectedStat) {
                    case 'inactiveClients':
                        console.log('[Statistics] Fetching inactive clients...');
                        // Fetch inactive clients (defaulting to last 6 months)
                        const inactiveClientsData = await electronAPI.getInactiveClients(6);
                        console.log('[Statistics] Inactive clients loaded:', inactiveClientsData);
                        // No numerical parsing needed here, set the data directly
                        setInactiveClients(inactiveClientsData);
                        break;
                    case 'topClients':
                        console.log('[Statistics] Fetching top clients...');
                        // Fetch top 10 clients by USD sales
                        const topClientsData = await electronAPI.getTopClients(10);
                        console.log('[Statistics] Top clients loaded:', topClientsData);
                         // Parse Total_Ventas_USD to ensure it's a number or null
                         const parsedTopClients = topClientsData.map(client => ({
                              ...client,
                              Total_Ventas_USD: client.Total_Ventas_USD !== null && !isNaN(parseFloat(client.Total_Ventas_USD)) ? parseFloat(client.Total_Ventas_USD) : null,
                         }));
                        setTopClients(parsedTopClients);
                        break;
                    case 'topProducts':
                        console.log('[Statistics] Fetching top products...');
                        // Fetch top 10 products by quantity sold
                        const topProductsData = await electronAPI.getTopProducts(10);
                        console.log('[Statistics] Top products loaded:', topProductsData);
                         // Parse Total_Cantidad_Vendida to ensure it's a number or null
                         const parsedTopProducts = topProductsData.map(product => ({
                              ...product,
                              Total_Cantidad_Vendida: product.Total_Cantidad_Vendida !== null && !isNaN(parseFloat(product.Total_Cantidad_Vendida)) ? parseFloat(product.Total_Cantidad_Vendida) : null,
                         }));
                        setTopProducts(parsedTopProducts);
                        break;
                    case 'leastSoldProducts':
                        console.log('[Statistics] Fetching least sold products...');
                        // Fetch least 10 sold products by quantity
                        const leastSoldProductsData = await electronAPI.getLeastSoldProducts(10);
                        console.log('[Statistics] Least sold products loaded:', leastSoldProductsData);
                        // Parse Total_Cantidad_Vendida
                         const parsedLeastSoldProducts = leastSoldProductsData.map(product => ({
                              ...product,
                              Total_Cantidad_Vendida: product.Total_Cantidad_Vendida !== null && !isNaN(parseFloat(product.Total_Cantidad_Vendida)) ? parseFloat(product.Total_Cantidad_Vendida) : null,
                         }));
                        setLeastSoldProducts(parsedLeastSoldProducts);
                        break;
                    case 'topMonths':
                        console.log('[Statistics] Fetching top months...');
                        // Fetch top 12 months by USD sales
                        const topMonthsData = await electronAPI.getTopMonths(12);
                        console.log('[Statistics] Top months loaded:', topMonthsData);
                         // Parse sales totals for each month
                         const parsedTopMonths = topMonthsData.map(monthData => ({
                              ...monthData,
                              Total_Ventas_USD: monthData.Total_Ventas_USD !== null && !isNaN(parseFloat(monthData.Total_Ventas_USD)) ? parseFloat(monthData.Total_Ventas_USD) : null,
                              Total_Ventas_ARS: monthData.Total_Ventas_ARS !== null && !isNaN(parseFloat(monthData.Total_Ventas_ARS)) ? parseFloat(monthData.Total_Ventas_ARS) : null,
                         }));
                        setTopMonths(parsedTopMonths);
                        break;
                    case 'monthlyYearlySalesComparison':
                        console.log('[Statistics] Fetching monthly/yearly sales comparison data...');
                         // Fetch monthly sales comparison data
                        const salesComparisonData = await electronAPI.getSalesComparison('month');
                        console.log('[Statistics] Monthly/yearly sales comparison loaded:', salesComparisonData);
                         // Parse sales totals for each period
                         const parsedSalesComparison = salesComparisonData.map(periodData => ({
                              ...periodData,
                              Total_Ventas_USD: periodData.Total_Ventas_USD !== null && !isNaN(parseFloat(periodData.Total_Ventas_USD)) ? parseFloat(periodData.Total_Ventas_USD) : null,
                              Total_Ventas_ARS: periodData.Total_Ventas_ARS !== null && !isNaN(parseFloat(periodData.Total_Ventas_ARS)) ? parseFloat(periodData.Total_Ventas_ARS) : null,
                         }));
                        setMonthlyYearlySalesData(parsedSalesComparison);
                        break;
                    case 'stockRotation':
                        console.log('[Statistics] Fetching stock rotation data...');
                         // Fetch stock rotation data for the last 12 months
                         const stockRotationRawData = await electronAPI.getStockRotation(12); // Renamed to avoid conflict
                         console.log('[Statistics] Stock rotation loaded (raw):', stockRotationRawData);
                         // Parse numerical fields received from backend
                         const parsedStockRotation = stockRotationRawData.map(product => ({
                              ...product,
                              Stock_Actual: product.Stock_Actual !== null && !isNaN(parseFloat(product.Stock_Actual)) ? parseFloat(product.Stock_Actual) : null,
                              Total_Cantidad_Vendida_Periodo: product.Total_Cantidad_Vendida_Periodo !== null && !isNaN(parseFloat(product.Total_Cantidad_Vendida_Periodo)) ? parseFloat(product.Total_Cantidad_Vendida_Periodo) : null,
                              // Ensure Semanas_de_Stock is treated as a number (even if Infinity)
                              Semanas_de_Stock: product.Semanas_de_Stock !== null && !isNaN(parseFloat(product.Semanas_de_Stock)) ? parseFloat(product.Semanas_de_Stock) : (product.Semanas_de_Stock === Infinity ? Infinity : null), // Handle Infinity explicitly
                         }));
                         console.log('[Statistics] Stock rotation parsed:', parsedStockRotation);
                        setStockRotationData(parsedStockRotation); // Set the parsed data
                        break;
                    default:
                        // Handle case where no valid statistic is selected
                        console.log('[Statistics] No statistic selected.');
                        setLoading(false); // Ensure loading is set to false if no fetch occurs
                        break;
                }
            } catch (err) {
                // Handle any errors during the API calls
                console.error('Error fetching statistic data:', err);
                setError(err.message || 'Error al cargar los datos de la estadística.');
                 // Clear all statistic states on error
                 setInactiveClients([]);
                 setTopClients([]);
                 setTopProducts([]);
                 setLeastSoldProducts([]);
                 setTopMonths([]);
                 setMonthlyYearlySalesData([]);
                 setStockRotationData([]);
            } finally {
                // Always set loading to false after fetch attempt (success or error)
                setLoading(false);
            }
        };

        // Call the async function to fetch data if a statistic is selected
        if (selectedStat) {
            fetchStatisticData();
        } else {
            setLoading(false); // No statistic selected, stop loading indicator
        }

         // Cleanup function (not strictly necessary here as fetch replaces listeners)
        return () => {
             console.log('[Statistics] selectedStat effect cleanup.');
        };

    }, [selectedStat]); // Re-run this effect whenever selectedStat changes

     // Final cleanup effect (runs only on unmount)
     useEffect(() => {
         return () => {
              console.log('[Statistics] Component final cleanup.');
         };
     }, []);

     // Helper function to determine stock recommendation based on weeks of stock
     // *** LÓGICA CORREGIDA ***
     const getStockRecommendation = (weeksOfStock, currentStock) => { // Added currentStock parameter
         // Handle null, undefined, or NaN input for weeksOfStock
         if (weeksOfStock === null || weeksOfStock === undefined || isNaN(weeksOfStock)) {
              // Check current stock even if weeks are unavailable
              if (currentStock !== null && currentStock < 0) {
                   return { text: 'Revisar Stock Negativo', color: '#F44336' }; // Red
              }
              return { text: 'Datos no disponibles', color: '#757575' }; // Grey
         }

         // *** NUEVA COMPROBACIÓN: Stock Negativo ***
         // Check currentStock first for negative values
         if (currentStock !== null && currentStock < 0) {
              return { text: 'Revisar Stock Negativo', color: '#F44336' }; // Red - Prioritize this check
         }

         // Define thresholds for recommendations
         const BUY_THRESHOLD_WEEKS = 4;
         const EXCESS_THRESHOLD_WEEKS = 26; // Approx 6 months

         // Determine recommendation text and color based on weeksOfStock
         if (weeksOfStock === 0) {
             // This case now implies currentStock is 0 or positive, but avgWeeklySales is 0 or undefined
             // It could also mean currentStock is 0.
             if (currentStock === 0) {
                 return { text: 'Sin Stock', color: '#F44336' }; // Red
             } else {
                 // Stock exists, but no sales in period or invalid calculation
                 return { text: 'Sin Ventas Recientes', color: '#FF9800' }; // Orange
             }
         } else if (weeksOfStock === Infinity) {
              // Handle Infinity (stock exists, but no sales in the period)
              return { text: 'Sin Ventas Recientes', color: '#FF9800' }; // Orange
         } else if (weeksOfStock > 0 && weeksOfStock < BUY_THRESHOLD_WEEKS) {
             // Positive weeks, below threshold
             return { text: 'Comprar Más', color: '#FF9800' }; // Orange
         } else if (weeksOfStock >= EXCESS_THRESHOLD_WEEKS) {
             // Positive weeks, above excess threshold
             return { text: 'Exceso de Stock', color: '#FF9800' }; // Orange/Yellow
         } else {
             // Positive weeks, within normal range (>= BUY_THRESHOLD and < EXCESS_THRESHOLD)
             return { text: 'Stock Suficiente', color: '#4CAF50' }; // Green
         }
         // Note: The case for weeksOfStock < 0 is now implicitly handled by the initial currentStock < 0 check.
     };


    // Helper function to render the appropriate table based on the selected statistic
    const renderStatistic = () => {
        // Show message if no statistic is selected
        if (!selectedStat) {
            return <p>Seleccione una estadística del menú.</p>;
        }
        // Show loading indicator
        if (loading) {
            return <p>Cargando datos...</p>;
        }
        // Show error message
        if (error) {
            return <p style={{ color: '#ef9a9a' }}>{error}</p>;
        }

        // Render the table based on the selected statistic
        switch (selectedStat) {
            case 'inactiveClients':
                return (
                    <>
                        <h3>Clientes Inactivos (Últimos 6 meses)</h3>
                        {inactiveClients.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Empresa</th>
                                        <th>CUIT</th>
                                        <th>Última Fecha Venta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over inactive clients and render table rows */}
                                    {inactiveClients.map(client => (
                                        // Use Cliente_id as the key for each row
                                        <tr key={client.Cliente_id}>
                                            <td>{client.Nombre_Cliente}</td>
                                            <td>{client.Cuit_Cliente}</td>
                                            {/* Display last sale date or 'Nunca' */}
                                            <td>{client.Ultima_Fecha_Venta || 'Nunca'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no inactive clients found
                             <p>No se encontraron clientes inactivos en los últimos 6 meses.</p>
                        )}
                    </>
                );
            case 'topClients':
                return (
                    <>
                        <h3>Mejores Clientes (Top 10 por Total USD)</h3>
                        {topClients.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Empresa</th>
                                        <th>CUIT</th>
                                        <th>Total Ventas (USD)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over top clients */}
                                    {topClients.map(client => (
                                        <tr key={client.Cliente_id}>
                                            <td>{client.Nombre_Cliente}</td>
                                            <td>{client.Cuit_Cliente}</td>
                                            {/* Format total sales USD to 2 decimal places */}
                                            <td>{typeof client.Total_Ventas_USD === 'number' ? client.Total_Ventas_USD.toFixed(2) : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de ventas para calcular los mejores clientes.</p>
                        )}
                    </>
                );
            case 'topProducts':
                return (
                    <>
                        <h3>Productos Más Vendidos (Top 10 por Cantidad)</h3>
                        {topProducts.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Cantidad Total Vendida</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over top products */}
                                    {topProducts.map(product => (
                                        <tr key={product.Producto_id}>
                                            <td>{product.Codigo_Producto}</td>
                                            <td>{product.Descripcion_Producto}</td>
                                            {/* Display total quantity sold */}
                                            <td>{product.Total_Cantidad_Vendida !== null ? product.Total_Cantidad_Vendida : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de ítems vendidos para calcular los mejores productos.</p>
                        )}
                    </>
                );
            case 'leastSoldProducts':
                return (
                    <>
                        <h3>Productos Menos Vendidos (Top 10 por Cantidad)</h3>
                        {leastSoldProducts.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Cantidad Total Vendida</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over least sold products */}
                                    {leastSoldProducts.map(product => (
                                        <tr key={product.Producto_id}>
                                            <td>{product.Codigo_Producto}</td>
                                            <td>{product.Descripcion_Producto}</td>
                                            {/* Display total quantity sold */}
                                            <td>{product.Total_Cantidad_Vendida !== null ? product.Total_Cantidad_Vendida : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de ítems vendidos para calcular los productos menos vendidos.</p>
                        )}
                    </>
                );
            case 'topMonths':
                return (
                    <>
                        <h3>Mejores Meses (Top 12 por Total USD)</h3>
                        {topMonths.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Año-Mes</th>
                                        <th>Total Ventas (USD)</th>
                                        <th>Total Ventas (ARS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over top months */}
                                    {topMonths.map(monthData => (
                                        // Use Anio_Mes as key (should be unique)
                                        <tr key={monthData.Anio_Mes}>
                                            {/* Log month data for debugging */}
                                            {/* {console.log('[Statistics.js - topMonths] Datos del mes:', monthData)} */}
                                            {/* Display formatted month */}
                                            <td>{monthData.Anio_Mes}</td>
                                            {/* Format USD sales */}
                                            <td>{typeof monthData.Total_Ventas_USD === 'number' ? monthData.Total_Ventas_USD.toFixed(2) : 'N/A'}</td>
                                            {/* Format ARS sales */}
                                            <td>{typeof monthData.Total_Ventas_ARS === 'number' ? monthData.Total_Ventas_ARS.toFixed(2) : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de ventas para calcular los mejores meses.</p>
                        )}
                    </>
                );

            case 'monthlyYearlySalesComparison':
                return (
                    <>
                        <h3>Comparativa de Ventas Mensuales/Anuales</h3>
                         {monthlyYearlySalesData.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Período (Año-Mes)</th>
                                        <th>Total Ventas (USD)</th>
                                        <th>Total Ventas (ARS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over sales comparison data */}
                                    {monthlyYearlySalesData.map(periodData => (
                                        // Use Periodo as key (should be unique)
                                        <tr key={periodData.Periodo}>
                                            <td>{periodData.Periodo}</td>
                                            {/* Format USD sales */}
                                            <td>{typeof periodData.Total_Ventas_USD === 'number' ? periodData.Total_Ventas_USD.toFixed(2) : 'N/A'}</td>
                                            {/* Format ARS sales */}
                                            <td>{typeof periodData.Total_Ventas_ARS === 'number' ? periodData.Total_Ventas_ARS.toFixed(2) : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de ventas para la comparativa mensual/anual.</p>
                        )}
                    </>
                );

            case 'stockRotation':
                // Determine the period text (e.g., "(Ventas últimos 12 meses)")
                const periodText = stockRotationData.length > 0 && stockRotationData[0].Periodo_Meses !== undefined ? `(Ventas últimos ${stockRotationData[0].Periodo_Meses} meses)` : '';
                return (
                    <>
                        <h3>Stock Actual vs. Rotación de Productos {periodText}</h3>
                        {stockRotationData.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Stock Actual</th>
                                        <th>Total Vendido en Período</th>
                                        <th>Semanas de Stock Estimadas</th>
                                        <th>Recomendación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over stock rotation data */}
                                    {stockRotationData.map(product => {
                                         // *** LLAMADA CORREGIDA: Pasar también el stock actual ***
                                         const recommendation = getStockRecommendation(product.Semanas_de_Stock, product.Stock_Actual);
                                        return (
                                            <tr key={product.Producto_id}>
                                                <td>{product.Codigo_Producto}</td>
                                                <td>{product.Descripcion_Producto}</td>
                                                {/* Display current stock */}
                                                <td>{product.Stock_Actual !== null ? product.Stock_Actual : 'N/A'}</td>
                                                {/* Display quantity sold in period */}
                                                <td>{product.Total_Cantidad_Vendida_Periodo !== null ? product.Total_Cantidad_Vendida_Periodo : 'N/A'}</td>
                                                <td>
                                                    {/* Display estimated weeks of stock, handling Infinity */}
                                                    {product.Semanas_de_Stock === Infinity
                                                        ? '> 1 año' // Display for Infinity
                                                        : (typeof product.Semanas_de_Stock === 'number' ? product.Semanas_de_Stock.toFixed(1) : 'N/A')} {/* Format number */}
                                                </td>
                                                {/* Display recommendation with appropriate color */}
                                                <td style={{ color: recommendation.color, fontWeight: 'bold' }}>
                                                     {recommendation.text}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                             // Message if no data found
                             <p>No se encontraron datos de stock o ventas para calcular la rotación de productos.</p>
                        )}
                    </>
                );

            // Default case if selectedStat doesn't match any known statistic
            default:
                return <p>Estadística seleccionada no reconocida.</p>;
        }
    };

    // Main component render
    return (
        <div className="container">
            <h2>Estadísticas</h2>
            {/* Render the selected statistic's table or message */}
            {renderStatistic()}
        </div>
    );
}

export default Statistics; // Export the component
