// ListaVentasX.js (Basado en la versión original, adaptado para usar VentaItemsEditorX con búsqueda, sin validación de personalizado y AHORA CON DESCUENTO)
// Este componente gestiona la sección de VentasX sin incluir IVA.
// Incluye comprobaciones de seguridad para evitar errores de acceso a propiedades de undefined.

import React, { useState, useEffect } from 'react';
import VentaItemsEditorX from './ventasx/VentaItemsEditorX'; // Usamos la versión con búsqueda, sin validación de personalizado y AHORA CON DESCUENTO
import ImportPresupuestoModalX from './ventasx/ImportPresupuestoModalX';
import { format } from 'date-fns'; // Import the format function from date-fns


// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaVentasX() {
  const [ventas, setVentas] = useState([]); // Note: This state name is 'ventas' but stores VentasX data
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]); // Needed for product dropdown in VentaItemsEditorX
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVentaId, setSelectedVentaId] = useState(null);
  const [editingVentaId, setEditingVentaId] = useState(null);

  // Removed IVA from state definitions, ensure items state can hold discount
  const [editedVentaData, setEditedVentaData] = useState({
      id: null,
      Fecha: '',
      Nro_VentaX: '', // Keep here for display in edit form
      Cliente_id: '',
      Estado: '',
      Pago: '',
      Subtotal: '', // Now equal to Total (sum of item.Total_Item which now includes discount)
      Total: '', // Now equal to Subtotal
      Cotizacion_Dolar: '',
      Total_ARS: '',
      items: [], // Asegurado como array vacío, ítems incluirán Descuento_Porcentaje
  });

  // Removed IVA from state definitions, ensure items state can hold discount
  const [newVentaData, setNewVentaData] = useState({
      Fecha: '',
      // Nro_VentaX is removed from newVentaData state as it's auto-generated
      Cliente_id: '',
      Estado: '',
      Pago: '',
      Subtotal: '', // This will now be auto-calculated (sum of item.Total_Item)
      Total: '', // Now equal to Subtotal
      Cotizacion_Dolar: '',
      Total_ARS: '',
      items: [], // Asegurado como array vacío, ítems incluirán Descuento_Porcentaje
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingVentaId, setDeletingVentaId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // State to control modal visibility

  // Eliminado el estado clearItemsEditorErrorsTrigger (ya no se usa directamente aquí)

    // --- State for Client Progressive Search (NEW) ---
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [displayClients, setDisplayClients] = useState([]);
    // We will use Cliente_id in newVentaData/editedVentaData to track selected client


  // Function to fetch VentasX using the new API (ensure items with discount are fetched)
  const fetchVentas = async () => { // Make the function async
    setLoading(true);
    setError(null);
     setSelectedVentaId(null);
    setEditingVentaId(null);
    // Removed IVA from reset data structure, ensure items state is reset correctly
    setEditedVentaData({
        id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
        Estado: '', Pago: '', Subtotal: '', Total: '',
        Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
    });

    try {
         // Call the async API function and await its result (GET /ventasx now fetches discount)
        const data = await electronAPI.getVentasX();
        console.log('VentasX cargadas:', data);
        // Safely parse numerical values before setting state, including item totals and discount
        const parsedVentas = data.map(venta => ({
            ...venta,
            Subtotal: venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal) : null,
            Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
            Cotizacion_Dolar: venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar) : null,
            Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
            // Ensure items are parsed, including Descuento_Porcentaje
            items: Array.isArray(venta.items) ? venta.items.map(item => ({
                 ...item,
                 Cantidad: parseFloat(item.Cantidad) || null,
                 Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
                 Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
                 Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
                 Total_Item: parseFloat(item.Total_Item) || null,
                 Descuento_Porcentaje: parseFloat(item.Descuento_Porcentaje) || null, // Parse Descuento_Porcentaje
            })) : [], // Asegurar que items siempre sea un array
        }));
        setVentas(parsedVentas); // Set the parsed data

    } catch (err) {
        console.error('Error fetching ventasx:', err);
        setError(err.message || 'Error al cargar las VentasX.');
        setVentas([]); // Clear the list on error
         setSelectedVentaId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false
    }
  };

  // Function to fetch clients using the new API (No changes needed)
  const fetchClients = async () => { // Make the function async
      try {
          const data = await electronAPI.getClients(); // New API call (GET /clients)
          console.log('Clientes cargados para ventasx:', data);
          setClientes(data);
          setDisplayClients(data); // Initialize display list for search (NEW)
      } catch (err) {
         console.error('Error fetching clients for ventasx:', err);
         // Decide how to handle error
      }
   };

    // Function to fetch products using the new API (No changes needed)
  const fetchProductos = async () => { // Make the function async
      try {
          const data = await electronAPI.getProductos(); // New API call (GET /productos)
          console.log('Products loaded for ventax items:', data);
          setProductos(data); // Asegurado que productos es un array
      } catch (err) {
          console.error('Error fetching products for ventax items:', err);
          setProductos([]); // Asegurar que productos sea un array vacío en caso de error
      }
   };

  // Function to fetch stock (needed to refresh stock view) using the new API (No changes needed)
  const fetchStock = async () => { // Make the function async
       try {
            const data = await electronAPI.getStock(); // New API call (GET /stock)
            console.log('Stock data fetched for refresh (VentasX):', data);
       } catch (err) {
           console.error('Error fetching stock data for refresh (VentasX):', err);
       }
   };


  useEffect(() => {
    fetchVentas();
    fetchClients();
    fetchProductos();

  }, []);


   const handleRowClick = (ventaId) => { // Keep this
       if (selectedVentaId === ventaId) {
           setSelectedVentaId(null);
           setEditingVentaId(null);
            // Removed IVA from reset data structure, ensure items state is reset correctly
           setEditedVentaData({
               id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
               Estado: '', Pago: '', Subtotal: '', Total: '',
               Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
           });
           // *** Clear client search states on deselect ***
           setClientSearchTerm('');
           setDisplayClients(clientes); // Reset display list to all clients
           // *** END Clear client search states ***
       } else {
           setSelectedVentaId(ventaId);
           if(editingVentaId !== null && editingVentaId !== ventaId) {
                setEditingVentaId(null);
                 // Removed IVA from reset data structure, ensure items state is reset correctly
               setEditedVentaData({
                   id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
                   Estado: '', Pago: '', Subtotal: '', Total: '',
                   Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
               });
               // *** Clear client search states when canceling edit of another row ***
               setClientSearchTerm('');
               setDisplayClients(clientes); // Reset display list to all clients
               // *** END Clear client search states ***
           }
       }
        setError(null);
   };


  // Handle input change for New VentaX form (Keep calculation logic - Subtotal is sum of item.Total_Item)
  // Removed IVA from calculation logic
  const handleNewVentaInputChange = (e) => {
       const { name, value } = e.target;
       let updatedNewVentaData = { ...newVentaData, [name]: value };

       setNewVentaData(updatedNewVentaData);

       // Recalculate totals based on the updated state
       // This logic is now primarily in the useEffect below,
       // but this is kept for immediate feedback on input change.
       if (name === 'Cotizacion_Dolar') { // Only recalculate ARS when Cotizacion_Dolar changes
           const subtotal = parseFloat(updatedNewVentaData.Subtotal); // Subtotal is updated by items change
           const cotizacion = parseFloat(updatedNewVentaData.Cotizacion_Dolar);

           let calculatedTotalUSD = '';
           // Total USD is now simply Subtotal if Subtotal is a valid number
           if (!isNaN(subtotal)) {
               calculatedTotalUSD = subtotal.toFixed(2); // Total USD = Subtotal
           }

           let calculatedTotalARS = '';
           // Calculate Total ARS only if Total USD and Cotizacion Dolar are valid numbers
           if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
               calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
           }

           setNewVentaData(prevData => ({
               ...prevData,
               Total: calculatedTotalUSD, // Total USD = Subtotal (sum of item.Total_Item including discount)
               Total_ARS: calculatedTotalARS
           }));
       }
       // If items change, handleNewVentaItemsChange already recalculates Subtotal and Total USD and triggers useEffect
  };

   // Handler for when the items list changes in the VentaItemsEditorX child component
   // This handler is responsible for calculating the Subtotal and Total USD (which is equal to Subtotal in VentasX)
   // for NEW sales based on the *Total_Item* of each item.
   // The useEffect below will then calculate Total ARS.
   const handleNewVentaItemsChange = (newItems) => {
       // Añadir comprobación de seguridad: asegurar que newItems es un array
       const itemsArray = Array.isArray(newItems) ? newItems : [];
       console.log('[ListaVentasX] handleNewVentaItemsChange received items:', itemsArray);


       const calculatedSubtotal = itemsArray.reduce((sum, item) => {
           // Ensure Total_Item is a number before adding. Total_Item now includes discount.
           const itemTotal = parseFloat(item.Total_Item);
           return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2); // Keep 2 decimal places for currency

       setNewVentaData(prevState => {
           const updatedState = {
               ...prevState,
               items: itemsArray, // Usar el array asegurado
               Subtotal: calculatedSubtotal // Update Subtotal based on sum of item.Total_Item (including discount)
           };

           // Total USD is now simply Subtotal in VentasX
           const subtotal = parseFloat(updatedState.Subtotal);
            if (!isNaN(subtotal)) {
                updatedState.Total = subtotal.toFixed(2); // Total USD = Subtotal
            } else {
                updatedState.Total = '';
            }

            // Total ARS recalculation will happen in the useEffect because Cotizacion_Dolar might not be updated here

           return updatedState;
       });
   };

    // useEffect to recalculate totals for New VentaX form (Keep calculation logic)
    // Removed IVA dependency and calculation
    // This useEffect recalculates Total and Total_ARS when items or Cotizacion_Dolar change.
    useEffect(() => {
        if (showAddForm) {
            console.log('[ListaVentasX] Recalculating totals due to items or Cotizacion_Dolar change in add form (no IVA).');
             // Añadir comprobación de seguridad: asegurar que newVentaData.items es un array
             const itemsArray = Array.isArray(newVentaData.items) ? newVentaData.items : [];

            const calculatedSubtotal = itemsArray.reduce((sum, item) => {
                const itemTotal = parseFloat(item.Total_Item); // Use Total_Item (includes discount)
                return sum + (isNaN(itemTotal) ? 0 : itemTotal);
            }, 0).toFixed(2);

            const subtotal = parseFloat(calculatedSubtotal);
            // No IVA calculation needed here
            const cotizacion = parseFloat(newVentaData.Cotizacion_Dolar);

            let calculatedTotalUSD = '';
            // Total USD is now simply Subtotal if Subtotal is valid
            if (!isNaN(subtotal)) {
                calculatedTotalUSD = subtotal.toFixed(2);
            } else {
                calculatedTotalUSD = ''; // Clear Total USD if Subtotal is not a number
            }

            let calculatedTotalARS = '';
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            } else {
                 calculatedTotalARS = ''; // Clear Total ARS if Total USD or Cotizacion is invalid
            }


            // Update state only if values have changed to prevent infinite loops
            setNewVentaData(prevState => {
                // Ensure values are compared consistently (e.g., as strings or numbers after check)
                const prevSubtotal = prevState.Subtotal !== '' ? parseFloat(prevState.Subtotal) : NaN;
                const prevTotal = prevState.Total !== '' ? parseFloat(prevState.Total) : NaN;
                const prevTotalARS = prevState.Total_ARS !== '' ? parseFloat(prevState.Total_ARS) : NaN;
                const currentSubtotal = parseFloat(calculatedSubtotal);
                const currentTotal = parseFloat(calculatedTotalUSD);
                const currentTotalARS = parseFloat(calculatedTotalARS);


                // Check if there's a significant difference to avoid unnecessary state updates
                // Use small epsilon for floating point comparison or compare string representations
                const areNumbersEqual = (num1, num2, epsilon = 0.001) => Math.abs(num1 - num2) < epsilon;

                const subtotalChanged = isNaN(prevSubtotal) !== isNaN(currentSubtotal) || (!isNaN(prevSubtotal) && !isNaN(currentSubtotal) && !areNumbersEqual(prevSubtotal, currentSubtotal));
                const totalChanged = isNaN(prevTotal) !== isNaN(currentTotal) || (!isNaN(prevTotal) && !isNaN(currentTotal) && !areNumbersEqual(prevTotal, currentTotal));
                const totalArsChanged = isNaN(prevTotalARS) !== isNaN(currentTotalARS) || (!isNaN(prevTotalARS) && !isNaN(currentTotalARS) && !areNumbersEqual(prevTotalARS, currentTotalARS));


                if (subtotalChanged || totalChanged || totalArsChanged) {
                     console.log(`[ListaVentasX] Updating totals: Subtotal ${calculatedSubtotal}, Total USD ${calculatedTotalUSD}, Total ARS ${calculatedTotalARS}`);
                    return {
                        ...prevState,
                        Subtotal: calculatedSubtotal,
                        Total: calculatedTotalUSD, // Total USD = Subtotal (sum of item.Total_Item including discount)
                        Total_ARS: calculatedTotalARS,
                    };
                }
                return prevState; // No change needed
            });
        }
    }, [newVentaData.items, newVentaData.Cotizacion_Dolar, showAddForm]); // Dependencies: items, Cotizacion_Dolar, and form visibility


    // Handle form submission for New VentaX
    // Removed IVA validation and inclusion in dataToSend
    // Ensure Descuento_Porcentaje is included in dataToSend for items
  const handleAddVentaSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Added validation for Cotizacion_Dolar
      // Añadir comprobación de seguridad para items
      if (!newVentaData.Fecha || !newVentaData.Cliente_id || !newVentaData.Estado || !newVentaData.Pago || !Array.isArray(newVentaData.items) || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0) {
           // Updated validation message
           setError('Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son campos obligatorios para VentasX.');
           setSavingData(false);
           return;
      }

       // Subtotal, Total (USD), and Total ARS are calculated, but ensure they are numbers if not empty.
         if (newVentaData.Subtotal !== '' && isNaN(parseFloat(newVentaData.Subtotal))) {
             setError('Error interno: Subtotal calculado no es un número válido.');
             setSavingData(false);
             return;
         }
          if (newVentaData.Total !== '' && isNaN(parseFloat(newVentaData.Total))) {
              setError('Error interno: Total USD calculado no es un número válido.');
              setSavingData(false);
              return;
          }
          if (newVentaData.Total_ARS !== '' && isNaN(parseFloat(newVentaData.Total_ARS))) {
              setError('Error interno: Total ARS calculado no es un número válido.');
              setSavingData(false);
              return;
          }


      // Data to send to backend, keys match VentasX DB column names (excluding IVA).
      // Ensure Descuento_Porcentaje is included for product items
      const dataToSend = {
          Fecha: newVentaData.Fecha,
          // Nro_VentaX is removed from dataToSend
          Cliente_id: parseInt(newVentaData.Cliente_id, 10),
          Estado: newVentaData.Estado,
          Pago: newVentaData.Pago,
          // Ensure numerical fields are numbers or null, not empty strings
          Subtotal: newVentaData.Subtotal !== '' ? parseFloat(newVentaData.Subtotal) : null,
          // Removed IVA field
          Total: newVentaData.Total !== '' ? parseFloat(newVentaData.Total) : null, // Send calculated total USD (Subtotal)
          Cotizacion_Dolar: newVentaData.Cotizacion_Dolar !== '' ? parseFloat(newVentaData.Cotizacion_Dolar) : null,
          Total_ARS: newVentaData.Total_ARS !== '' ? parseFloat(newVentaData.Total_ARS) : null,
           // Include the items array (asegurado que es array por la validación)
          items: newVentaData.items.map(item => ({
              // id is NOT included for new items
              type: item.type, // Send the type
              // Include Descuento_Porcentaje for product items
              Descuento_Porcentaje: item.type === 'product' && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje for product type

              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null, // Ensure Total_Item is float or null
              // Include fields based on item type
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null, // Ensure Quantity is float or null
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta) : null, // Ensure Price is float or null
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null ? parseFloat(item.Cantidad_Personalizada) : null, // Ensure Quantity is float or null
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada) : null, // Ensure Price is float or null
               }),
          })),
      };

      console.log('[ListaVentasX] Enviando dataToSend.items al backend (con Descuento_Porcentaje):', dataToSend.items);

      // *** VERIFICAR QUE electronAPI.addVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
      if (!electronAPI || typeof electronAPI.addVentaX !== 'function') {
          console.error('electronAPI.addVentaX is not defined or not a function.');
          setError('Error interno: La función para agregar Venta X no está disponible.');
          setSavingData(false);
          return;
      }


      try {
          // Call the async API function for adding
          const response = await electronAPI.addVentaX(dataToSend); // New API call (POST /ventasx)
          console.log('VentaX added successfully:', response.success);

          // Clear form using new column names and items, including dolar fields
          setNewVentaData({
              Fecha: '', // Nro_VentaX is not in state anymore
              Cliente_id: '', Estado: '',
              Pago: '', Subtotal: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: [], // Asegurado como array vacío
          });
          setShowAddForm(false);
          fetchVentas(); // Refresh the list of sales

          // Recargar la lista de stock después de agregar una venta (solo afecta a ítems de producto)
          fetchStock(); // Call the async fetchStock

          // *** Clear client search states on successful add ***
          setClientSearchTerm('');
          setDisplayClients(clientes); // Reset display list to all clients
          // *** END Clear client search states ***


      } catch (err) {
          console.error('Error adding ventaX:', err);
          setError(err.message || `Error al agregar la VentaX: ${err.message}`); // Use error.message
      } finally {
          setSavingData(false);
      }
  };


    // Handle Edit click for VentaX
    // Removed IVA from state and fetching logic
    // Ensure items with discount are fetched into editedVentaData state
  const handleEditClick = async () => { // Make the function async
       if (selectedVentaId === null) return;

       setEditingVentaId(selectedVentaId);
       setLoadingEditData(true);
       setError(null);
       // *** Clear client search states when entering edit mode ***
       setClientSearchTerm('');
       setDisplayClients(clientes);
       // *** END Clear client search states ***


       try {
           // Call the async API function to get ventaX data by ID (GET /ventasx/:id now fetches discount in items)
           const data = await electronAPI.getVentaXById(selectedVentaId);
           console.log(`VentaX ID ${selectedVentaId} data loaded (no IVA, with items and discount):`, data);
           // Populate editedVentaData including items (which can be product or custom) and dolar fields
           const ventaData = data; // Data is the direct response
           // Format date for input
           const formattedFecha = ventaData.Fecha ? format(new Date(ventaData.Fecha), 'yyyy-MM-dd') : '';

            // Find the client object based on Cliente_id to display its name/code in search input
           const clientForEdit = clientes.find(c => c.id === ventaData.Cliente_id);
           if (clientForEdit) {
               setClientSearchTerm(`${clientForEdit.Codigo || ''} - ${clientForEdit.Empresa || ''}`); // Use Empresa/Codigo from client data
           } else {
                setClientSearchTerm(''); // Clear if client not found or Cliente_id is null/undefined
           }

           setEditedVentaData({
               id: ventaData.id, // Keep ID
               Fecha: formattedFecha || '', // Use formatted date
               Nro_VentaX: ventaData.Nro_VentaX || '', // Nro_VentaX is kept for display in edit form
               Cliente_id: ventaData.Cliente_id || '',
               Estado: ventaData.Estado || '',
               Pago: ventaData.Pago || '',
               Subtotal: ventaData.Subtotal !== null ? String(ventaData.Subtotal) : '', // Subtotal (sum of item.Total_Item)
               // Removed IVA field
               Total: ventaData.Total !== null ? String(ventaData.Total) : '', // Total USD (Subtotal)
               Cotizacion_Dolar: ventaData.Cotizacion_Dolar !== null ? String(ventaData.Cotizacion_Dolar) : '',
               Total_ARS: ventaData.Total_ARS !== null ? String(ventaData.Total_ARS) : '',
               items: Array.isArray(ventaData.items) ? ventaData.items : [], // Asegurado como array, should include Descuento_Porcentaje
           });
            // Re-fetch clients and products just in case for the dropdowns
            fetchClients();
            fetchProductos(); // Asegurarse de que productos se carga al editar
       } catch (err) {
           console.error(`Error fetching ventaX by ID ${selectedVentaId}:`, err);
           setError(err.message || `Error al cargar los datos de la VentaX.`);
           setEditingVentaId(null);
           setSelectedVentaId(null);
            // Removed IVA from reset data structure, ensure items state is reset correctly
           setEditedVentaData({
               id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
               Estado: '', Pago: '', Subtotal: '', Total: '',
               Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
           });
            // *** Clear client search states on error ***
            setClientSearchTerm('');
            setDisplayClients(clientes); // Reset display list to all clients
            // *** END Clear client search states ***
       } finally {
           setLoadingEditData(false);
       }
   };

  // Handle input change for Edit VentaX form (Keep calculation logic - Subtotal is sum of item.Total_Item)
  // Removed IVA from calculation logic
  // Recalculates Total and Total_ARS when Subtotal or Cotizacion_Dolar change manually in the form.
  const handleEditFormChange = (e) => {
       const { name, value } = e.target;
       let processedValue = value;

        // Update state with new column names
        let updatedEditedVentaData = { ...editedVentaData, [name]: processedValue };
        setEditedVentaData(updatedEditedVentaData);


        // Recalculate totals based on the updated state
        // Removed IVA calculation
        if (['Subtotal', 'Cotizacion_Dolar'].includes(name)) {
            const subtotal = parseFloat(updatedEditedVentaData.Subtotal);
            const cotizacion = parseFloat(updatedEditedVentaData.Cotizacion_Dolar);

            let calculatedTotalUSD = '';
            // Total USD is now simply Subtotal if Subtotal is a valid number
            if (!isNaN(subtotal)) {
                calculatedTotalUSD = subtotal.toFixed(2);
            } else {
                 calculatedTotalUSD = ''; // Clear Total USD if Subtotal is not a number
            }

            let calculatedTotalARS = '';
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            } else {
                 calculatedTotalARS = ''; // Clear Total ARS if Total USD or Cotizacion is invalid
            }

            setEditedVentaData(prevData => ({
                ...prevData,
                Total: calculatedTotalUSD, // Total USD = Subtotal
                Total_ARS: calculatedTotalARS
            }));
        }
  };

   // Handler for when the items list changes in the VentaItemsEditorX child component during edit
   // This handler recalculates the Subtotal and Total USD based on the *Total_Item* of each item.
   // It also triggers Total ARS recalculation.
   const handleEditedVentaItemsChange = (newItems) => {
        // Añadir comprobación de seguridad: asegurar que newItems es un array
        const itemsArray = Array.isArray(newItems) ? newItems : [];
        console.log('[ListaVentasX] handleEditedVentaItemsChange received items:', itemsArray);


       const calculatedSubtotal = itemsArray.reduce((sum, item) => {
            // Ensure Total_Item is a number before adding. Total_Item now includes discount.
            const itemTotal = parseFloat(item.Total_Item);
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2);

       setEditedVentaData(prevState => {
            const updatedState = {
                ...prevState,
                items: itemsArray, // Usar el array asegurado
                // Update Subtotal state in the edit form based on item changes
                Subtotal: calculatedSubtotal // Update Subtotal based on sum of item.Total_Item (including discount)
            };

            // Recalculate Total USD based on the new Subtotal (no IVA)
            const subtotal = parseFloat(updatedState.Subtotal);
            if (!isNaN(subtotal)) {
                updatedState.Total = subtotal.toFixed(2); // Total USD = Subtotal
            } else {
                 updatedState.Total = ''; // Clear Total USD if Subtotal is not a number
            }

            // Recalculate Total ARS based on the new Total USD and current Cotizacion_Dolar
            const cotizacion = parseFloat(updatedState.Cotizacion_Dolar);
            if (updatedState.Total !== '' && !isNaN(parseFloat(updatedState.Total)) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedState.Total_ARS = (parseFloat(updatedState.Total) * cotizacion).toFixed(2); // Total ARS
            } else {
                 updatedState.Total_ARS = ''; // Clear Total ARS if Total USD or Cotizacion is invalid
            }


            return updatedState;
       });
   };


    // Handle Save for Edit VentaX form
    // **** CORRECCIÓN PRINCIPAL: Incluir items con Descuento_Porcentaje en dataToSend y validar items ****
  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // VALIDACIÓN FRONTAL MEJORADA
      // Added validation for Cotizacion_Dolar
      // Añadir comprobación de seguridad para items
      if (!editedVentaData.Fecha || !editedVentaData.Cliente_id || !editedVentaData.Estado || !editedVentaData.Pago || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0) {
           // Updated validation message
           setError('Fecha, Cliente, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.');
           setSavingData(false);
           return;
      }
      // **** AÑADIR VALIDACIÓN DE ITEMS ****
      if (!Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0) {
          setError('La Venta X debe tener al menos un ítem.');
          setSavingData(false);
          return;
      }
      // **** FIN VALIDACIÓN DE ITEMS ****

       // Validate calculated/potentially manually edited totals
       if (editedVentaData.Subtotal !== '' && isNaN(parseFloat(editedVentaData.Subtotal))) {
           setError('Subtotal debe ser un número válido.');
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

      // Format the date toYYYY-MM-DD before sending
      const formattedFecha = editedVentaData.Fecha ? new Date(editedVentaData.Fecha).toISOString().split('T')[0] : '';
      if (!formattedFecha) {
          setError('Formato de fecha no válido.');
          setSavingData(false);
          return;
      }


      // Send data to backend - includes all main details and the items array.
      // The backend update handler is expected to handle item deletion/re-insertion and CashFlow.
      // Nro_VentaX is NOT sent here for update
      // Ensure Descuento_Porcentaje is included for product items in dataToSend
      const dataToSend = {
          id: editedVentaData.id,
          Fecha: formattedFecha, // Use the formatted date
          // Nro_VentaX is removed from dataToSend
          Cliente_id: parseInt(editedVentaData.Cliente_id, 10),
          Estado: editedVentaData.Estado,
          Pago: editedVentaData.Pago,
          // Ensure numerical fields are numbers or null, not empty strings
          Subtotal: editedVentaData.Subtotal !== '' ? parseFloat(editedVentaData.Subtotal) : null,
          // Removed IVA field
          Total: editedVentaData.Total !== '' ? parseFloat(editedVentaData.Total) : null, // Send potentially recalculated total USD
          Cotizacion_Dolar: editedVentaData.Cotizacion_Dolar !== '' ? parseFloat(editedVentaData.Cotizacion_Dolar) : null, // Send Cotizacion_Dolar
          Total_ARS: editedVentaData.Total_ARS !== '' ? parseFloat(editedVentaData.Total_ARS) : null, // Send potentially recalculated Total ARS
          // **** INCLUIR ITEMS EN dataToSend ****
          // Asegurado que editedVentaData.items es array por la validación
          items: editedVentaData.items.map(item => ({
              id: item.id || undefined, // Include ID if it exists (for existing items)
              type: item.type, // Send the type
               // Include Descuento_Porcentaje for product items
              Descuento_Porcentaje: item.type === 'product' && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje for product type

              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null, // Send Total_Item (calculated with discount)
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null,
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta) : null,
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null ? parseFloat(item.Cantidad_Personalizada) : null,
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada) : null,
               }),
          })),
          // **** FIN INCLUIR ITEMS ****
      };

      console.log('[ListaVentasX] Enviando dataToSend al backend (con Descuento_Porcentaje en items):', dataToSend);


      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body (PUT /ventasx/:id)
           // *** VERIFICAR QUE electronAPI.updateVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
           if (!electronAPI || typeof electronAPI.updateVentaX !== 'function') {
               console.error('electronAPI.updateVentaX is not defined or not a function.');
               setError('Error interno: La función para actualizar Venta X no está disponible.');
               setSavingData(false);
               return;
           }
          const response = await electronAPI.updateVentaX(dataToSend.id, dataToSend);
           console.log('VentaX updated successfully:', response.success);

          setEditingVentaId(null);
           // Reset edited data structure with dolar fields, ensure items state is reset correctly
          setEditedVentaData({
              id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
              Estado: '', Pago: '', Subtotal: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
          });
          setSelectedVentaId(null);
          fetchVentas(); // Refresh the list
          // NOTE: Stock is handled by backend during update
          fetchStock(); // Refresh stock display after potential stock changes

          // *** Clear client search states after successful edit ***
          setClientSearchTerm('');
          setDisplayClients(clientes); // Reset display list to all clients
          // *** END Clear client search states ***


      } catch (err) {
           console.error('Error updating ventaX:', err);
          setError(err.message || `Error al actualizar la VentaX.`);
      } finally {
          setSavingData(false);
      }
  };

  const handleCancelEdit = () => { // Keep this
      setEditingVentaId(null);
      // Reset edited data structure with dolar fields, ensure items state is reset correctly
      setEditedVentaData({
          id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
          Estado: '', Pago: '', Subtotal: '', Total: '',
          Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
      });
      setError(null);
       // *** Clear client search states on cancel edit ***
       setClientSearchTerm('');
       setDisplayClients(clientes); // Reset display list to all clients
       // *** END Clear client search states ***
  };


  // --- Delete Functionality ---

  // Handle Delete for VentaX (No changes needed for IVA or Discount)
  // NOTE: The backend delete-ventax handler *does* reverse stock changes.
  // The confirmation message text should be updated to reflect this if desired.
  const handleDeleteClick = async () => { // Make the function async
       if (selectedVentaId === null) return;

      // Updated confirmation message to reflect stock reversal
      if (window.confirm(`¿Está seguro de eliminar la VentaX con ID ${selectedVentaId}? Esta acción eliminará los ítems y revertirá los cambios de stock para los productos vendidos.`)) {
          setDeletingVentaId(selectedVentaId);
          setError(null);

          // *** VERIFICAR QUE electronAPI.deleteVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
          if (!electronAPI || typeof electronAPI.deleteVentaX !== 'function') {
              console.error('electronAPI.deleteVentaX is not defined or not a function.');
              setError('Error interno: La función para eliminar Venta X no está disponible.');
              setDeletingVentaId(null);
              return;
          }

          try {
               // Call the async API function for deleting
              const response = await electronAPI.deleteVentaX(selectedVentaId); // New API call (DELETE /ventasx/:id)
               console.log(`VentaX with ID ${selectedVentaId} deleted successfully.`, response.success);
               // Handle success response
              setSelectedVentaId(null);
              fetchVentas(); // Refresh the list
               // Refresh stock view after deleting a sale (since stock is reversed)
               fetchStock(); // Call the async fetchStock

          } catch (err) {
              console.error(`Error deleting ventaX with ID ${selectedVentaId}:`, err);
              setError(err.message || `Error al eliminar la VentaX.`);
          } finally {
              setDeletingVentaId(null);
          }
      }
   };

    // Handle click on "Nueva VentaX" button (Keep this, ensure items state is reset)
    const handleNewVentaClick = () => {
        setShowAddForm(true);
        setError(null);
         // Removed Nro_VentaX from reset state, ensure items state is reset correctly
         setNewVentaData({
             Fecha: '', // Nro_VentaX is not in state anymore
             Cliente_id: '', Estado: '',
             Pago: '', Subtotal: '', Total: '',
             Cotizacion_Dolar: '', Total_ARS: '', items: [], // Asegurado como array vacío
         });
        setSelectedVentaId(null);
        setEditingVentaId(null);
         fetchClients();
         fetchProductos(); // Asegurarse de que productos se carga al abrir el formulario
         // No need to reset clearTrigger here as VentaItemsEditorX doesn't use it for errors anymore

         // *** Clear client search states when opening add form ***
         setClientSearchTerm('');
         setDisplayClients(clientes); // Reset display list to all clients
         // *** END Clear client search states ***
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
        // No need to reset clearTrigger here
         // *** Clear client search states on cancel add ***
         setClientSearchTerm('');
         setDisplayClients(clientes); // Reset display list to all clients
         // *** END Clear client search states ***
    };

     // --- Client Progressive Search Handlers (NEW) ---
    const handleClientSearchInputChange = (e, formType) => { // Added formType parameter ('add' or 'edit')
        const term = e.target.value.toLowerCase();
        setClientSearchTerm(term);
        setError(null); // Clear errors on search input

        if (term === '') {
            setDisplayClients(clientes);
        } else {
            const filtered = clientes.filter(client =>
                (client.Codigo && String(client.Codigo).toLowerCase().includes(term)) || // Use Codigo
                (client.Empresa && String(client.Empresa).toLowerCase().includes(term)) || // Use Empresa
                (client.Nombre && String(client.Nombre).toLowerCase().includes(term)) // Use Nombre
            );
            setDisplayClients(filtered);
        }

        // Clear the selected client ID in the corresponding state based on form type
        if (formType === 'add') {
             setNewVentaData(prevState => ({ ...prevState, Cliente_id: '' }));
        } else if (formType === 'edit') {
             setEditedVentaData(prevState => ({ ...prevState, Cliente_id: '' }));
        }
    };

    const handleClientSelect = (client, formType) => { // Added formType parameter
        console.log('[ListaVentasX] Client selected:', client);
        setClientSearchTerm(`${client.Codigo || ''} - ${client.Empresa || ''}`); // Display Code - Company

        // Update the selected client ID in the corresponding state based on form type
        if (formType === 'add') {
            setNewVentaData(prevState => ({ ...prevState, Cliente_id: client.id }));
        } else if (formType === 'edit') {
             setEditedVentaData(prevState => ({ ...prevState, Cliente_id: client.id }));
        }

        setDisplayClients([]); // Hide the list after selection
        setError(null);
    };
    // --- End Client Progressive Search Handlers ---

    // Handle click on the "Importar Presupuesto" button (Keep this logic)
    const handleImportPresupuestoClick = () => {
        setShowImportModal(true); // Show the import modal
        setError(null); // Clear any previous errors
        // The modal component itself (ImportPresupuestoModalX) will be adapted separately
        // to use the new API to fetch the list of budgets and budget details.
        // This component (ListaVentasX) just needs to open the modal.
    };


    // Handle data imported from PresupuestoModalX (Keep this logic)
    // Modified to import items with their discount percentage
    const handlePresupuestoImported = (presupuestoData) => {
        console.log("Presupuesto imported:", presupuestoData);
        console.log("Presupuesto items received:", presupuestoData.items);

        // Añadir comprobación de seguridad: asegurar que presupuestoData.items es un array
        // Map the imported budget data to the newVentaData state structure, including discount for product items
        const importedItems = (Array.isArray(presupuestoData.items) ? presupuestoData.items : []).map(item => {
            console.log("Mapping item before transformation:", item); // Log original item

            let mappedItem = {};

            // Determine item type based on Producto_id or other properties
             // The backend's getPresupuestoById should provide enough info for this mapping.
            if (item.Producto_id !== null && item.Producto_id !== undefined) {
                // It's a product item from the budget
                mappedItem = {
                    type: 'product', // Identificar el tipo de ítem
                    Producto_id: item.Producto_id,
                    Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null, // Parse quantity
                    // Use the Price_Unitario_Venta from the budget item if available, otherwise calculate from Total_Item and Quantity
                    // If importing from presupuesto, Precio_Unitario from presupuesto_items is the price *before* discount.
                    // Total_Item in presupuesto_items is the total *after* discount.
                    // We need to store the price *before* discount as Precio_Unitario_Venta and the discount % in the new item.
                    Precio_Unitario_Venta: (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && item.Precio_Unitario !== '')
                                                ? parseFloat(item.Precio_Unitario) // Prefer the explicit Precio_Unitario if available
                                                : (item.Total_Item !== null && item.Cantidad > 0)
                                                    ? parseFloat((item.Total_Item / item.Cantidad).toFixed(2)) // Fallback: calculate price BEFORE discount if Total_Item and Quantity are available (this assumes Total_Item in budget is AFTER discount)
                                                    : null, // If neither is possible, leave null

                    Descuento_Porcentaje: (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== '')
                                        ? parseFloat(item.Descuento_Porcentaje) // Import the discount percentage directly from budget if available
                                        : 0.00, // Default to 0 if not provided or invalid

                    // Calculate the Total_Item for the sale item based on the imported quantity, price (before discount), and imported discount
                    Total_Item: calculateTotalItem(
                        item.Cantidad !== null ? parseFloat(item.Cantidad) : 0,
                        (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && item.Precio_Unitario !== '') ? parseFloat(item.Precio_Unitario) : ((item.Total_Item !== null && item.Cantidad > 0) ? parseFloat((item.Total_Item / item.Cantidad).toFixed(2)) : 0), // Use the determined price BEFORE discount
                         (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== '') ? parseFloat(item.Descuento_Porcentaje) : 0
                    ),


                    // Include product details for display in VentaItemsEditorX
                    codigo: item.codigo, // This should come from the JOIN in the backend query for presupuestos
                    Descripcion: item.Descripcion, // This should come from the JOIN
                };
                 // Ensure custom-specific fields are null for product items
                 mappedItem.Descripcion_Personalizada = null;
                 mappedItem.Cantidad_Personalizada = null;
                 mappedItem.Precio_Unitario_Personalizada = null;

                 // LOGGING para depurar item mapeado de producto
                 console.log("Mapped product item (with discount & recalc Total_Item):", mappedItem);
                 return mappedItem;

            } else {
                // Assume it's a custom item
                // Map Presupuesto_Items personalized fields to VentaX_Items personalized fields
                const mappedItem = {
                    type: 'custom', // Identificar el tipo de ítem
                    Descripcion_Personalizada: item.Descripcion_Personalizada || null,
                    Cantidad_Personalizada: item.Cantidad_Personalizada !== null ? parseFloat(item.Cantidad_Personalizada) : null, // Parse quantity
                    Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada) : null, // Parse price
                    Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null, // Parse total
                    // Nota: Ítems personalizados en VentasX no tienen descuento.
                };
                 // Ensure product-specific fields are null for custom items
                 mappedItem.Producto_id = null;
                 mappedItem.Cantidad = null;
                 mappedItem.Precio_Unitario_Venta = null;
                 mappedItem.Descuento_Porcentaje = null; // Ensure discount is null for custom items
                 mappedItem.codigo = null;
                 mappedItem.Descripcion = null;


                 // LOGGING para depurar item mapeado personalizado
                 console.log("Mapped custom item:", mappedItem);
                 return mappedItem;
            }
        });

        // Update the newVentaData state with imported data
        setNewVentaData(prevState => {
             const updatedState = {
                 ...prevState,
                 // Copy relevant fields from the budget
                 Fecha: new Date().toISOString().split('T')[0], // Use current date for the sale
                 // Nro_VentaX: '', // Keep empty for manual entry
                 Cliente_id: presupuestoData.Cliente_id || '', // Set client ID
                 // Estado: '', // Keep empty
                 // Pago: '', // Keep empty
                 items: importedItems, // Set the imported items (asegurado como array, includes discount and calculated Total_Item)
                 // No IVA in VentasX
                 // Import Cotizacion_Dolar from budget
                 Cotizacion_Dolar: presupuestoData.Cotizacion_Dolar !== null ? String(presupuestoData.Cotizacion_Dolar) : '',

                 // The useEffect watching items and Cotizacion_Dolar will now handle the total recalculation based on item.Total_Item
                 // No need to call handleNewVentaItemsChange directly here anymore.

                 // Keep other fields as they were
                 // Nro_VentaX is not in newVentaData state anymore
                 Estado: prevState.Estado,
                 Pago: prevState.Pago,
                 Subtotal: prevState.Subtotal, // Will be updated by useEffect
                 Total: prevState.Total, // Will be updated by useEffect
                 Total_ARS: prevState.Total_ARS, // Will be updated by useEffect
             };

             // *** Update client search term with imported client details ***
             const importedClient = clientes.find(c => c.id === updatedState.Cliente_id);
             if (importedClient) {
                  setClientSearchTerm(`${importedClient.Codigo || ''} - ${importedClient.Empresa || ''}`);
                  setDisplayClients([]); // Hide the list after import
             } else {
                 setClientSearchTerm(''); // Clear if client not found
                  setDisplayClients(clientes); // Show all clients
             }
             // *** END Update client search term ***


             return updatedState; // Return the state with updated items and potentially updated Cotizacion_Dolar
        });

        // Close the modal is handled by the modal's onImport callback
        // setShowImportModal(false); // This is handled by the modal's onClose prop callback
    };

     // --- Helper function for Total Item Calculation (Needed for import mapping) ---
     // Copy the calculateTotalItem function here as it's used in handlePresupuestoImported
     const calculateTotalItem = (cantidad, precioUnitario, descuentoPorcentaje) => {
         const cantidadFloat = parseFloat(cantidad);
         const precioUnitarioFloat = parseFloat(precioUnitario);
         const descuentoFloat = parseFloat(descuentoPorcentaje) || 0;

         const subtotal = (isNaN(cantidadFloat) || cantidadFloat < 0 || isNaN(precioUnitarioFloat) || precioUnitarioFloat < 0)
                           ? 0
                           : cantidadFloat * precioUnitarioFloat;

         const effectiveDescuento = Math.max(0, Math.min(100, descuentoFloat));

         const totalItem = subtotal * (1 - effectiveDescuento / 100);

         return parseFloat(totalItem.toFixed(2));
     };

     // Helper to get client details by ID (NEW)
     const getClientDetails = (clientId) => {
        // Add safety check for clientes being an array
        if (!Array.isArray(clientes)) return null;
        return clientes.find(c => c.id === clientId);
     };


    // Helper functions for Estado and Pago (Keep these)
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
          case 'cancelado': return '#F4436'; // Red (usar el mismo rojo que para "debe")
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


  return (
    <div className="container">
      <h2>Gestión de Ventas X</h2>

       {/* Button to show the add form */}
       {!showAddForm && (
           <button onClick={handleNewVentaClick} disabled={loading || loadingEditData || savingData || deletingVentaId !== null}>
               Nueva Venta X
           </button>
       )}

      {/* Form to Add New VentaX (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nueva Venta X</h3>
               {/* Use new column names in the form for adding, map UI labels */}
               <form onSubmit={handleAddVentaSubmit}>
                    {/* --- Import Presupuesto Button --- */}
                    <div style={{ marginBottom: '20px' }}>
                         <button
                             type="button"
                             onClick={handleImportPresupuestoClick}
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                             style={{ backgroundColor: '#0288d1', color: 'white' }} // Blue color for import button
                         >
                             Importar Presupuesto
                         </button>
                    </div>

                    <div>
                        <label htmlFor="new-fecha">Fecha:</label>
                        <input type="date" id="new-fecha" name="Fecha" value={newVentaData.Fecha} onChange={handleNewVentaInputChange} required disabled={savingData || loadingEditData || deletingVentaId !== null} />
                    </div>
                    {/* Removed Nro VentaX input field */}
                     {/* --- Client Progressive Search Section (ADD FORM) --- */}
                     <div style={{ marginBottom: '10px' }}>
                         <label htmlFor="new-client-search-input">Buscar/Filtrar Cliente:</label>
                         <input
                             type="text"
                             id="new-client-search-input"
                             value={clientSearchTerm}
                             onChange={(e) => handleClientSearchInputChange(e, 'add')} // Pass 'add'
                             placeholder="Escribe código, nombre o empresa para filtrar..."
                              disabled={savingData || loadingEditData || deletingVentaId !== null || clientes.length === 0}
                         />
                          {clientes.length === 0 && loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando clientes...</p>}
                          {clientes.length === 0 && !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay clientes disponibles. Agregue clientes primero.</p>}
                     </div>

                    {/* Display Selected Client or message */}
                    {newVentaData.Cliente_id ? (
                         <div style={{ fontSize: '0.9rem', color: '#bdbdbd', marginBottom: '10px' }}>
                              <strong>Cliente Seleccionado:</strong> {getClientDetails(parseInt(newVentaData.Cliente_id))?.Codigo || 'N/A'} - {getClientDetails(parseInt(newVentaData.Cliente_id))?.Empresa || 'N/A'} ({getClientDetails(parseInt(newVentaData.Cliente_id))?.Nombre || 'N/A'})
                              <p style={{margin: 0, marginLeft: '10px'}}>Cuit: {getClientDetails(parseInt(newVentaData.Cliente_id))?.Cuit || 'N/A'}</p>
                         </div>
                    ) : (
                         <p style={{fontSize: '0.9rem', color: '#ffcc80', marginBottom: '10px'}}>
                             Seleccione un cliente de la lista de abajo.
                         </p>
                    )}

                    {/* List of Clients for Selection (ADD FORM) */}
                    {clientSearchTerm !== '' && displayClients.length > 0 && !newVentaData.Cliente_id && (
                         <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c', marginBottom: '10px' }}>
                             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                 <thead>
                                     <tr>
                                         <th style={{ textAlign: 'left', padding: '8px' }}>Código</th> {/* Use Codigo */}
                                         <th style={{ textAlign: 'left', padding: '8px' }}>Empresa</th> {/* Use Empresa */}
                                         <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th> {/* Use Nombre */}
                                         <th style={{ textAlign: 'left', padding: '8px' }}>Cuit</th> {/* Use Cuit */}
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {displayClients.map(client => (
                                         <tr
                                             key={client.id}
                                             onClick={() => handleClientSelect(client, 'add')} // Pass 'add'
                                             style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                         >
                                             <td style={{ padding: '8px' }}>{client.Codigo}</td> {/* Use Codigo */}
                                             <td style={{ padding: '8px' }}>{client.Empresa}</td> {/* Use Empresa */}
                                             <td style={{ padding: '8px' }}>{client.Nombre}</td> {/* Use Nombre */}
                                             <td style={{ padding: '8px' }}>{client.Cuit}</td> {/* Use Cuit */}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    )}
                     {clientSearchTerm !== '' && displayClients.length === 0 && clientes.length > 0 && !newVentaData.Cliente_id && (
                         <p style={{fontSize: '14px', color: '#ffcc80', marginTop: '10px'}}>
                             No se encontraron clientes con "{clientSearchTerm}".
                         </p>
                     )}
                      {/* --- End Client Progressive Search Section (ADD FORM) --- */}


                     <div>
                        <label htmlFor="new-estado">Estado:</label>
                        <select
                            id="new-estado"
                            name="Estado"
                            value={newVentaData.Estado}
                            onChange={handleNewVentaInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                        >
                            <option value="">Seleccione Estado</option>
                            <option value="entregado">Entregado</option>
                            <option value="en maquina">En Máquina</option>
                            <option value="pedido">Pedido</option>
                            <option value="cancelado">Cancelado</option>
                            <option value="listo">Listo</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="new-pago">Pago:</label>
                         <select
                            id="new-pago"
                            name="Pago"
                            value={newVentaData.Pago}
                            onChange={handleNewVentaInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                        >
                            <option value="">Seleccione Pago</option> {/* Default option */}
                            <option value="abonado">Abonado</option>
                            <option value="seña">Seña</option>
                            <option value="debe">Debe</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="new-subtotal">Subtotal:</label>
                        <input type="number" id="new-subtotal" name="Subtotal" value={newVentaData.Subtotal} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                    </div>
                    {/* Removed IVA Select Field */}
             <div>
                <label htmlFor="new-total">Total USD:</label> {/* This is equal to Subtotal in VentasX */}
                <input type="text" id="new-total" name="Total" value={newVentaData.Total} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
            </div>
             <div>
                 <label htmlFor="new-cotizacion-dolar">Cotización Dólar:</label>
                 <input
                     type="number"
                     id="new-cotizacion-dolar"
                     name="Cotizacion_Dolar"
                     value={newVentaData.Cotizacion_Dolar}
                     onChange={handleNewVentaInputChange}
                     required
                     disabled={savingData || loadingEditData || deletingVentaId !== null}
                     min="0.01"
                     step="0.01"
                 />
             </div>
             <div>
                 <label htmlFor="new-total-ars">Total ARS:</label>
                 <input
                     type="text"
                     id="new-total-ars"
                     name="Total_ARS"
                     value={newVentaData.Total_ARS}
                     readOnly
                     disabled={true}
                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                 />
             </div>

                    {/* Use VentaItemsEditorX - it now handles discount internally */}
                    <VentaItemsEditorX
                         items={newVentaData.items} // items state might contain discount
                         onItemsChange={handleNewVentaItemsChange}
                         productos={productos} // Asegurado que productos es array
                         savingData={savingData || loadingEditData || deletingVentaId !== null}
                         // clearTrigger is not strictly needed by VentaItemsEditorX for errors anymore,
                         // but it can be kept if the editor uses it for other internal state resets.
                         // clearTrigger={clearItemsEditorErrorsTrigger}
                    />
                    {/* Añadir comprobación de seguridad antes de acceder a length */}
                    {(!Array.isArray(productos) || productos.length === 0) && !loadingEditData && !loading && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}


                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                       <button type="submit" disabled={savingData || loadingEditData || deletingVentaId !== null || !Array.isArray(newVentaData.items) || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0 || !newVentaData.Cliente_id}>Agregar Venta X</button>
                       <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingVentaId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                           Cancelar
                       </button>
                   </div>
               </form>
          </>
      )}

      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

      {!showAddForm && (
          <>
              <h3>Ventas X Existentes</h3>

               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedVentaId === null || loadingEditData || savingData || deletingVentaId !== null}
                   >
                       Editar Venta X Seleccionada
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedVentaId === null || loadingEditData || savingData || deletingVentaId !== null}
                       style={{ marginLeft: '10px' }}
                   >
                       Eliminar Venta X Seleccionada
                   </button>
               </div>

              {loading && <p>Cargando ventas X...</p>}
              {loadingEditData && <p>Cargando datos de venta X para editar...</p>}
              {savingData && <p>Guardando cambios de venta X...</p>}
              {deletingVentaId && <p>Eliminando venta X...</p>}

              {!loading && Array.isArray(ventas) && ventas.length > 0 && ( // Añadir comprobación de seguridad para ventas
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nro VentaX</th>
                      <th>Cliente</th>
                      <th>Cuit</th>
                      <th>Estado</th>
                      <th>Pago</th>
                      <th>Subtotal</th>
                      <th>Total USD</th>
                      <th>Cotización Dólar</th>
                      <th>Total ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Añadir comprobación de seguridad antes de mapear */}
                    {Array.isArray(ventas) && ventas.map((venta) => ( // Using 'venta' temporarily for iteration, but it's a VentaX object
                      <React.Fragment key={venta.id}>
                        <tr
                            onClick={() => handleRowClick(venta.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedVentaId === venta.id ? '#424242' : 'transparent' }}
                        >
                          {/* Format the date here */}
                          <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                          <td>{venta.Nro_VentaX}</td>
                          <td>{venta.Nombre_Cliente}</td>
                          <td>{venta.Cuit_Cliente}</td>

                          <td style={{ backgroundColor: getEstadoColor(venta.Estado), color: '#212121', fontWeight: 'bold' }}>
                              {getEstadoDisplayText(venta.Estado)}
                          </td>

                          <td style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold' }}>
                              {getPagoDisplayText(venta.Pago)}
                           </td>

                          {/* Safely access and format numerical values */}
                          <td>{venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS).toFixed(2) : 'N/A'}</td>
                        </tr>
                        {editingVentaId === venta.id && !showAddForm && (
                            <tr>
                                {/* Update colSpan to match the new number of columns (10 data columns) */}
                                <td colSpan="10">
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Venta X (ID: {venta.id})</h4>
                                        <form onSubmit={handleSaveEdit}> {/* Added onSubmit for form */}
                                             <div>
                                                <label htmlFor={`edit-fecha-${venta.id}`}>Fecha:</label>
                                                 {/* The date input type expectsYYYY-MM-DD format, so we format the fetched date for the input */}
                                                <input type="date" id={`edit-fecha-${venta.id}`} name="Fecha" value={editedVentaData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                            </div>
                                            {/* Display Nro VentaX as read-only */}
                                            <div>
                                                <label htmlFor={`edit-nro-ventax-${venta.id}`}>Nro VentaX:</label>
                                                <input type="text" id={`edit-nro-ventax-${venta.id}`} name="Nro_VentaX" value={editedVentaData.Nro_VentaX || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                            </div>
                                             {/* --- Client Progressive Search Section (EDIT FORM) --- */}
                                             <div style={{ marginBottom: '10px' }}>
                                                 <label htmlFor={`edit-client-search-input-${venta.id}`}>Buscar/Filtrar Cliente:</label>
                                                 <input
                                                     type="text"
                                                     id={`edit-client-search-input-${venta.id}`}
                                                     value={clientSearchTerm} // Use the same search term state
                                                     onChange={(e) => handleClientSearchInputChange(e, 'edit')} // Pass 'edit'
                                                     placeholder="Escribe código, nombre o empresa para filtrar..."
                                                      disabled={savingData || clientes.length === 0} // Match disabled state
                                                 />
                                                  {clientes.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando clientes...</p>}
                                             </div>

                                            {/* Display Selected Client or message */}
                                            {editedVentaData.Cliente_id ? (
                                                 <div style={{ fontSize: '0.9rem', color: '#bdbdbd', marginBottom: '10px' }}>
                                                     {/* Fetch and display client details using Cliente_id from editedVentaData */}
                                                      <strong>Cliente Seleccionado:</strong> {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Codigo || 'N/A'} - {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Empresa || 'N/A'} ({getClientDetails(parseInt(editedVentaData.Cliente_id))?.Nombre || 'N/A'})
                                                      <p style={{margin: 0, marginLeft: '10px'}}>Cuit: {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Cuit || 'N/A'}</p>
                                                 </div>
                                            ) : (
                                                 <p style={{fontSize: '0.9rem', color: '#ffcc80', marginBottom: '10px'}}>
                                                     Seleccione un cliente de la lista de abajo.
                                                 </p>
                                            )}

                                            {/* List of Clients for Selection (EDIT FORM) */}
                                            {clientSearchTerm !== '' && displayClients.length > 0 && !editedVentaData.Cliente_id && (
                                                 <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c', marginBottom: '10px' }}>
                                                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                         <thead>
                                                             <tr>
                                                                  <th style={{ textAlign: 'left', padding: '8px' }}>Código</th> {/* Use Codigo */}
                                                                  <th style={{ textAlign: 'left', padding: '8px' }}>Empresa</th> {/* Use Empresa */}
                                                                  <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th> {/* Use Nombre */}
                                                                  <th style={{ textAlign: 'left', padding: '8px' }}>Cuit</th> {/* Use Cuit */}
                                                             </tr>
                                                         </thead>
                                                         <tbody>
                                                             {displayClients.map(client => (
                                                                 <tr
                                                                     key={client.id}
                                                                     onClick={() => handleClientSelect(client, 'edit')} // Pass 'edit'
                                                                     style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                 >
                                                                      <td style={{ padding: '8px' }}>{client.Codigo}</td> {/* Use Codigo */}
                                                                      <td style={{ padding: '8px' }}>{client.Empresa}</td> {/* Use Empresa */}
                                                                      <td style={{ padding: '8px' }}>{client.Nombre}</td> {/* Use Nombre */}
                                                                      <td style={{ padding: '8px' }}>{client.Cuit}</td> {/* Use Cuit */}
                                                                 </tr>
                                                             ))}
                                                         </tbody>
                                                     </table>
                                                 </div>
                                            )}
                                             {clientSearchTerm !== '' && displayClients.length === 0 && clientes.length > 0 && !editedVentaData.Cliente_id && (
                                                 <p style={{fontSize: '14px', color: '#ffcc80', marginTop: '10px'}}>
                                                     No se encontraron clientes con "{clientSearchTerm}".
                                                 </p>
                                             )}
                                             {/* --- End Client Progressive Search Section (EDIT FORM) --- */}


                                             <div>
                                                <label htmlFor={`edit-estado-${venta.id}`}>Estado:</label>
                                                 <select
                                                    id={`edit-estado-${venta.id}`}
                                                    name="Estado"
                                                    value={editedVentaData.Estado || ''}
                                                    onChange={handleEditFormChange}
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione Estado</option>
                                                    <option value="entregado">Entregado</option>
                                                    <option value="en maquina">En Máquina</option>
                                                    <option value="pedido">Pedido</option>
                                                    <option value="cancelado">Cancelado</option>
                                                    <option value="listo">Listo</option>
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-pago-${venta.id}`}>Pago:</label>
                                                 <select
                                                    id={`edit-pago-${venta.id}`}
                                                    name="Pago"
                                                    value={editedVentaData.Pago || ''}
                                                    onChange={handleEditFormChange}
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione Pago</option>
                                                    <option value="abonado">Abonado</option>
                                                    <option value="seña">Seña</option>
                                                    <option value="debe">Debe</option>
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-subtotal-${venta.id}`}>Subtotal:</label>
                                                {/* Subtotal input is manual input for edit, but recalculates Total and Total ARS */}
                                                <input type="number" id={`edit-subtotal-${venta.id}`} name="Subtotal" value={editedVentaData.Subtotal || ''} onChange={handleEditFormChange} disabled={savingData} step="0.01"/>
                                            </div>
                                             {/* Removed IVA Select Field */}
                                             <div>
                                                <label htmlFor={`edit-total-${venta.id}`}>Total USD:</label>
                                                <input type="text" id={`edit-total-${venta.id}`} name="Total" value={editedVentaData.Total || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                            </div>
                                             <div>
                                                 <label htmlFor={`edit-cotizacion-dolar-${venta.id}`}>Cotización Dólar:</label>
                                                 <input
                                                     type="number"
                                                     id={`edit-cotizacion-dolar-${venta.id}`}
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
                                                 <label htmlFor={`edit-total-ars-${venta.id}`}>Total ARS:</label>
                                                 <input
                                                     type="text"
                                                     id={`edit-total-ars-${venta.id}`}
                                                     name="Total_ARS"
                                                     value={editedVentaData.Total_ARS || ''}
                                                     readOnly
                                                     disabled={true}
                                                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                 />
                                             </div>

                                            {/* Use VentaItemsEditorX for EDITING - it now handles discount internally */}
                                             <VentaItemsEditorX
                                                  items={editedVentaData.items} // items state should contain discount from fetch
                                                  onItemsChange={handleEditedVentaItemsChange}
                                                  productos={productos} // Asegurado que productos es array
                                                  savingData={savingData || clientes.length === 0 || productos.length === 0}
                                                  // clearTrigger is not used for edit
                                             />
                                              {/* Añadir comprobación de seguridad antes de acceder a length */}
                                              {(!Array.isArray(productos) || productos.length === 0) && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}
                                               {/* Añadir comprobación de seguridad antes de acceder a length */}
                                               {(!Array.isArray(productos) || productos.length === 0) && !loadingEditData && !loading && !savingData && editingVentaId !== null && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero.</p>}


                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                 {/* Botón Guardar Cambios */}
                                                 <button type="submit" disabled={savingData || !editedVentaData.Cliente_id || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0 || !Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0}> {/* Added validation to submit button */}
                                                     Guardar Cambios
                                                </button>
                                                 <button type="button" onClick={handleCancelEdit} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Cancelar Edición</button>
                                            </div>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading && Array.isArray(ventas) && ventas.length === 0 && !error && <p>No hay ventas X registradas.</p>} {/* Añadir comprobación de seguridad */}
               {/* Mostrar un mensaje de error si ventas no es un array */}
                {!Array.isArray(ventas) && !loading && <p style={{ color: '#ef9a9a' }}>Error interno: La lista de ventas no es válida.</p>}
          </>
      )}

        {/* Render the Import Presupuesto ModalX */}
        {/* The modal component itself will need to be adapted separately */}
        {showImportModal && (
             <ImportPresupuestoModalX
                 onClose={() => setShowImportModal(false)} // Function to close the modal
                 onImport={handlePresupuestoImported} // Callback to receive imported data (now handles discount)
                 existingClientId={newVentaData.Cliente_id} // Pass the selected client ID for filtering
             />
        )}

    </div>
  );
}

export default ListaVentasX;