// ListaVentas.js (Modified for Backend Auto-Generated Fact Nro, Date Formatting, and Edit Fix, and Clear Trigger, and Progressive Client Search)
import React, { useState, useEffect } from 'react';
import VentaItemsEditor from './ventas/VentaItemsEditor'; // Import the modified component
import ImportPresupuestoModal from './ventas/ImportPresupuestoModal'; // Import the new modal component
import { format } from 'date-fns'; // Import the format function from date-fns


// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaVentas() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]); // Needed for client dropdown
  const [productos, setProductos] = useState([]); // Needed for product dropdown in VentaItemsEditor
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVentaId, setSelectedVentaId] = useState(null); // New state for selected row ID
  const [editingVentaId, setEditingVentaId] = useState(null);
  // editedVentaData state keys match the new DB column names, now includes items
  const [editedVentaData, setEditedVentaData] = useState({
      id: null,
      Fecha: '',
      Fact_Nro: '', // Keep here for display in edit form
      Cliente_id: '', // FK to Clientes table
      Estado: '',
      Pago: '',
      Subtotal: '', // Will be string from input, now auto-calculated for new sales
      IVA: '', // Will be string from select value
      Total: '', // Will be string from input (calculated - Total USD)
      Cotizacion_Dolar: '', // New field for Cotizacion Dolar
      Total_ARS: '', // New field for calculated Total ARS
      items: [], // Add items array for fetched data (can contain product or custom items)
  });
   // New state for adding a new venta, keys match DB column names, includes items
  const [newVentaData, setNewVentaData] = useState({
      Fecha: '',
      // Fact_Nro is removed from newVentaData state as it's auto-generated
      Cliente_id: '',
      Estado: '',
      Pago: '',
      Subtotal: '', // This will now be auto-calculated
      IVA: '', // Will be string from select value
      Total: '', // This will now be auto-calculated based on Subtotal and IVA (Total USD)
      Cotizacion_Dolar: '', // New field for Cotizacion Dolar
      Total_ARS: '', // New field for calculated Total ARS
      items: [], // Add items array for new data (will contain product or custom items)
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingVentaId, setDeletingVentaId] = useState(null);

  // New state to control visibility of the add form
  const [showAddForm, setShowAddForm] = useState(false);
  // New state to control visibility of the Import Presupuesto modal
  const [showImportModal, setShowImportModal] = useState(false);

  // NUEVO estado para disparar la limpieza de errores en VentaItemsEditor
  const [clearItemsEditorErrorsTrigger, setClearItemsEditorErrorsTrigger] = useState(0);

    // --- State for Client Progressive Search (NEW) ---
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [displayClients, setDisplayClients] = useState([]);
    // We will use Cliente_id in newVentaData/editedVentaData to track selected client

  // NUEVO: Función async para obtener las últimas ventas
  const fetchVentas = async () => { // Make the function async
    setLoading(true);
    setError(null);
     setSelectedVentaId(null); // Deselect any row when refreshing
    setEditingVentaId(null); // Close edit form when refreshing
    // Reset edited data structure with new DB column names, including dolar fields
    setEditedVentaData({
        id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
        Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
        Cotizacion_Dolar: '', Total_ARS: '', items: []
    });

    try {
        // Call the async API function and await its result
        const data = await electronAPI.getVentas(); // New API call (GET /ventas)
        console.log('Ventas cargadas:', data);
        // Safely parse numerical values before setting state
        const parsedVentas = data.map(venta => ({
            ...venta,
            Subtotal: venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal) : null,
            IVA: venta.IVA !== null && venta.IVA !== undefined && !isNaN(parseFloat(venta.IVA)) ? parseFloat(venta.IVA) : null,
            Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
            Cotizacion_Dolar: venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar) : null,
            Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
        }));
        setVentas(parsedVentas); // Set the parsed data

    } catch (err) {
        console.error('Error fetching ventas:', err); // Use message from backend error object
        setError(err.message || 'Error al cargar las ventas.');
        setVentas([]); // Clear the list on error
         setSelectedVentaId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false
    }
    // Removed all IPC listener setup and cleanup for fetching ventas
  };

  // NUEVO: Función async para obtener clientes
  const fetchClients = async () => { // Make the function async
      try {
          const data = await electronAPI.getClients(); // New API call (GET /clients)
          console.log('Clientes cargados para ventas:', data);
          setClientes(data); // Clients data rows use new Client DB column names
           setDisplayClients(data); // Initialize display list for search (NEW)
      } catch (err) {
         console.error('Error fetching clients for ventas:', err); // Use message
         // Decide how to handle error
      }
      // No loading state controlled here
      // Removed IPC listener setup and cleanup for fetching clients
   };

    // NUEVO: Función async para obtener productos
  const fetchProductos = async () => { // Make the function async
      try {
          const data = await electronAPI.getProductos(); // New API call (GET /productos)
          console.log('Products loaded for venta items:', data);
          setProductos(data); // Store products for the items editor dropdown
      } catch (err) {
          console.error('Error fetching products for venta items:', err);
          // Decide how to handle error
      }
       // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching products
   };

  // NUEVO: Función async para obtener stock (necesaria para refrescar stock view)
  const fetchStock = async () => { // Make the function async
       try {
            const data = await electronAPI.getStock(); // New API call (GET /stock)
            console.log('Stock data fetched for refresh (Ventas):', data);
             // Do something with stock data if needed, or just rely on it being fetched
             // by ListaStock.js itself if that component is mounted elsewhere.
             // If this fetch is purely to trigger a refresh in ListaStock,
             // consider if simply calling fetchStock() in ListaStock is sufficient
             // when needed from here.
       } catch (err) {
           console.error('Error fetching stock data for refresh (Ventas):', err);
           // Handle error, e.g., display a message or log it.
       }
       // We don't set loading state here directly to avoid conflicts with main sales loading
       // Removed IPC listener setup and cleanup for fetching stock
   };


  // Effect to fetch initial data (sales, clients, and products)
  useEffect(() => {
    // Call the async fetch functions directly
    fetchVentas();
    fetchClients();
    fetchProductos(); // Fetch products

    // Removed IPC listener setup and cleanup from here
    // return () => { ... }; // REMOVED
  }, []); // Empty dependency array means this effect runs once on mount


   // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (ventaId) => {
       if (selectedVentaId === ventaId) {
           // If the already selected row is clicked again, deselect it
           setSelectedVentaId(null);
           setEditingVentaId(null); // Close edit form if open for this row
            // Reset edited data structure with new DB column names, including dolar fields
           setEditedVentaData({
               id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
               Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
               Cotizacion_Dolar: '', Total_ARS: '', items: []
           });
       } else {
           // Select the clicked row
           setSelectedVentaId(ventaId);
            // If editing another row, cancel it
           if(editingVentaId !== null && editingVentaId !== ventaId) {
                setEditingVentaId(null);
                 // Reset edited data structure with dolar fields
               setEditedVentaData({
                   id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
                   Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
                   Cotizacion_Dolar: '', Total_ARS: '', items: []
               });
           }
       }
        setError(null); // Clear errors on row selection change
   };


  // --- Add Venta Functionality ---
    // Modified to handle Cotizacion_Dolar and recalculate Total_ARS
  const handleNewVentaInputChange = (e) => {
       const { name, value } = e.target;
       let updatedNewVentaData = { ...newVentaData, [name]: value };

       setNewVentaData(updatedNewVentaData);

       // Recalculate totals based on the updated state
       // This logic is now primarily in the useEffect below,
       // but this is kept for immediate feedback on input change.
       if (['IVA', 'Cotizacion_Dolar'].includes(name)) {
           const subtotal = parseFloat(updatedNewVentaData.Subtotal);
           const ivaPercentage = parseFloat(updatedNewVentaData.IVA);
           const cotizacion = parseFloat(updatedNewVentaData.Cotizacion_Dolar);

           let calculatedTotalUSD = '';
           if (!isNaN(subtotal) && updatedNewVentaData.IVA !== '') {
               const ivaAmount = subtotal * (ivaPercentage / 100);
               calculatedTotalUSD = (subtotal + ivaAmount).toFixed(2);
           } else if (!isNaN(subtotal) && updatedNewVentaData.IVA === '') {
               // If IVA is empty but subtotal exists, Total USD is just Subtotal
               calculatedTotalUSD = subtotal.toFixed(2);
           }

           let calculatedTotalARS = '';
            // Calculate Total ARS only if Total USD and Cotizacion Dolar are valid numbers
           if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
               calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
           }

           setNewVentaData(prevData => ({
               ...prevData,
               Total: calculatedTotalUSD,
               Total_ARS: calculatedTotalARS
           }));
       }
       // If items change, handleNewVentaItemsChange already recalculates Subtotal and Total USD and triggers useEffect
  };

   // Handler for when the items list changes in the VentaItemsEditor child component
   // This handler is responsible for calculating the Subtotal and Total USD for NEW sales.
   // The useEffect below will then calculate Total ARS.
   const handleNewVentaItemsChange = (newItems) => {
       // Calculate Subtotal based on the sum of Total_Item in the new items list
       const calculatedSubtotal = newItems.reduce((sum, item) => {
           // Ensure Total_Item is a number before adding
           const itemTotal = parseFloat(item.Total_Item);
           return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2); // Keep 2 decimal places for currency

       setNewVentaData(prevState => {
           const updatedState = {
               ...prevState,
               items: newItems,
               Subtotal: calculatedSubtotal // Update Subtotal based on items
           };

           // Recalculate Total USD based on the new Subtotal and the current IVA from the updated state
           if (updatedState.Subtotal !== '' && updatedState.IVA !== '') {
               const subtotal = parseFloat(updatedState.Subtotal);
               const ivaPct = parseFloat(updatedState.IVA); // Use updatedState.IVA
                if (!isNaN(subtotal) && !isNaN(ivaPct)) {
                   const ivaAmount = subtotal * (ivaPct / 100);
                   const total = subtotal + ivaAmount;
                   updatedState.Total = total.toFixed(2); // Total USD
               } else {
                   updatedState.Total = '';
               }
           } else {
               updatedState.Total = ''; // Clear total USD if subtotal or IVA is empty
           }

           // Total ARS calculation will happen in the useEffect

           return updatedState;
       });
   };

    // NEW useEffect to recalculate totals when items, IVA, or Cotizacion_Dolar change in the ADD form
    // Modified to calculate Total ARS (Keep this logic)
    useEffect(() => {
        // Only run this effect when the add form is visible
        if (showAddForm) {
            console.log('[ListaVentas] Recalculating totals due to items, IVA, or Cotizacion_Dolar change in add form.');
            // Call the recalculation logic directly, using the current state values
            const calculatedSubtotal = newVentaData.items.reduce((sum, item) => {
                const itemTotal = parseFloat(item.Total_Item);
                return sum + (isNaN(itemTotal) ? 0 : itemTotal);
            }, 0).toFixed(2);

            const subtotal = parseFloat(calculatedSubtotal);
            const ivaPercentage = parseFloat(newVentaData.IVA);
            const cotizacion = parseFloat(newVentaData.Cotizacion_Dolar); // Get Cotizacion_Dolar


            let calculatedTotalUSD = '';
            if (!isNaN(subtotal) && newVentaData.IVA !== '') {
                const ivaAmount = subtotal * (ivaPercentage / 100);
                calculatedTotalUSD = (subtotal + ivaAmount).toFixed(2);
            } else if (!isNaN(subtotal) && newVentaData.IVA === '') {
                 // If IVA is empty but subtotal exists, Total is just Subtotal
                 calculatedTotalUSD = subtotal.toFixed(2);
            }

            let calculatedTotalARS = '';
            // Calculate Total ARS only if Total USD and Cotizacion Dolar are valid numbers
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            }


            // Update state only if values have changed to prevent infinite loops
            setNewVentaData(prevState => {
                if (prevState.Subtotal !== calculatedSubtotal || prevState.Total !== calculatedTotalUSD || prevState.Total_ARS !== calculatedTotalARS) {
                     console.log(`[ListaVentas] Updating totals: Subtotal ${calculatedSubtotal}, Total USD ${calculatedTotalUSD}, Total ARS ${calculatedTotalARS}`);
                    return {
                        ...prevState,
                        Subtotal: calculatedSubtotal,
                        Total: calculatedTotalUSD, // Total USD
                        Total_ARS: calculatedTotalARS, // Total ARS
                    };
                }
                return prevState; // No change needed
            });
        }
    }, [newVentaData.items, newVentaData.IVA, newVentaData.Cotizacion_Dolar, showAddForm]); // Dependencies: items, IVA, Cotizacion_Dolar, and form visibility


    // Modified to include Cotizacion_Dolar and Total_ARS in dataToSend
    // Fact_Nro is removed from dataToSend as it's auto-generated by the backend
  const handleAddVentaSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // NUEVO: Disparar la limpieza de errores en el VentaItemsEditor antes de validar y enviar
      setClearItemsEditorErrorsTrigger(prev => prev + 1);
      console.log('[ListaVentas] Disparando clearItemsEditorErrorsTrigger:', clearItemsEditorErrorsTrigger + 1);


      // Removed Fact_Nro from validation
       // *** UPDATED VALIDATION TO CHECK Cliente_id from state ***
      if (!newVentaData.Fecha || !newVentaData.Cliente_id || !newVentaData.Estado || !newVentaData.Pago || !Array.isArray(newVentaData.items) || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0) {
           // Updated validation message
           setError('Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son campos obligatorios.');
           setSavingData(false);
           return;
      }
       // Validation for IVA is less critical with a select, but keep number check for robustness
        if (newVentaData.IVA !== '' && isNaN(parseFloat(newVentaData.IVA))) {
           setError('IVA debe ser un número válido (porcentaje).'); // Should not happen with select, but keep
           setSavingData(false);
           return;
       }
        // Subtotal, Total (USD), and Total ARS are now calculated, so less need for strict validation here,
        // but ensure they are numbers if not empty.
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


      // Data to send to backend, keys match DB column names.
      // The 'items' array will contain objects with different structures
      // depending on whether they are product or custom items, but
      // the backend is now designed to handle this.
      // Fact_Nro is NOT sent here, backend will generate it
      const dataToSend = {
          Fecha: newVentaData.Fecha,
          // Fact_Nro is removed from dataToSend
          Cliente_id: parseInt(newVentaData.Cliente_id, 10),
          Estado: newVentaData.Estado,
          Pago: newVentaData.Pago,
          // Ensure numerical fields are numbers or null, not empty strings
          Subtotal: newVentaData.Subtotal !== '' ? parseFloat(newVentaData.Subtotal) : null,
           // Parse IVA value from select before sending
          IVA: newVentaData.IVA !== '' ? parseFloat(newVentaData.IVA) : null,
          Total: newVentaData.Total !== '' ? parseFloat(newVentaData.Total) : null, // Send calculated total USD
          Cotizacion_Dolar: newVentaData.Cotizacion_Dolar !== '' ? parseFloat(newVentaData.Cotizacion_Dolar) : null, // Send Cotizacion_Dolar
          Total_ARS: newVentaData.Total_ARS !== '' ? parseFloat(newVentaData.Total_ARS) : null, // Send calculated Total ARS
           // Include the items array
          items: newVentaData.items.map(item => ({
              // id is NOT included for new items
              // *** CORRECCIÓN: Incluir la propiedad 'type' aquí ***
              type: item.type, // <-- Asegúrate de enviar el tipo de ítem al backend
              Descuento_Porcentaje: item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje and handle empty/NaN
              Total_Item: item.Total_Item !== null && item.Total_Item !== '' && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null, // Ensure Total_Item is float or null and handle empty/NaN
              // Include fields based on item type (these are already conditional based on item.type)
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null && item.Cantidad !== '' && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null, // Ensure Quantity is float or null and handle empty/NaN
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== '' && !isNaN(parseFloat(item.Precio_Unitario_Venta)) ? parseFloat(item.Precio_Unitario_Venta) : null, // Ensure Price is float or null and handle empty/NaN
                  // Backend does not need codigo/Descripcion for insertion
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' && !isNaN(parseFloat(item.Cantidad_Personalizada)) ? parseFloat(item.Cantidad_Personalizada) : null, // Ensure Quantity is float or null and handle empty/NaN
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada) : null, // Ensure Price is float or null and handle empty/NaN
               }),
          })),
      };

      // *** AGREGAR LOG AQUÍ PARA VER dataToSend.items antes de enviar ***
      console.log('[ListaVentas] Enviando dataToSend.items al backend:', dataToSend.items);


      try {
          // Call the async API function for adding
         const response = await electronAPI.addVenta(dataToSend); // New API call (POST /ventas)
         console.log('Venta added successfully:', response.success);
         // Handle success response (e.g., { success: { id: newId, Fact_Nro: generatedNumber } })

          // Clear form using new column names and items, including dolar fields
          setNewVentaData({
              Fecha: '', // Fact_Nro is not in state anymore
              Cliente_id: '', Estado: '',
              Pago: '', Subtotal: '', IVA: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: [],
          });
           // *** Clear client search states on successful add ***
           setClientSearchTerm('');
           setDisplayClients(clientes); // Reset display list to all clients
           // *** END Clear client search states ***

          setShowAddForm(false); // Hide the add form after successful submission
          fetchVentas(); // Refresh the list of sales

          // Recargar la lista de stock después de agregar una venta (solo afecta a ítems de producto)
          fetchStock(); // Call the async fetchStock

      } catch (err) {
          console.error('Error adding venta:', err);
          setError(err.message || `Error al agregar la venta.`);
      } finally {
          setSavingData(false); // Reset saving state
      }
      // Removed IPC listener setup and cleanup for adding
  };


  // --- Edit Functionality ---
    // NOTE: The backend update-venta handler currently does NOT process items or update stock.
    // This frontend logic is prepared to fetch and display items, but saving will only update the main sale details.
    // Implementing full edit functionality for sale items (including stock reversal/updates) is more complex.

    // Modified to handle Cotizacion_Dolar and Total_ARS
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
           // Call the async API function to get venta data by ID
          const data = await electronAPI.getVentaById(selectedVentaId); // New API call (GET /ventas/:id)
           console.log(`Venta ID ${selectedVentaId} data loaded:`, data);
           // Populate editedVentaData including items (which can be product or custom) and dolar fields
          const ventaData = data; // Data is the direct response
          // *** APLICAR EL FORMATO DE FECHA AQUÍ ***
        const formattedFecha = ventaData.Fecha
        ? format(new Date(ventaData.Fecha), 'yyyy-MM-dd') // Formatear si existe la fecha
        : ''; // Si no hay fecha, usar cadena vacía

           // Find the client object based on Cliente_id to display its name/code in search input
           const clientForEdit = clientes.find(c => c.id === ventaData.Cliente_id);
           if (clientForEdit) {
               setClientSearchTerm(`${clientForEdit.Codigo || ''} - ${clientForEdit.Empresa || ''}`); // Use Empresa/Codigo from client data
           }


          setEditedVentaData({
              id: ventaData.id, // Keep ID
              Fecha: formattedFecha || '', // Use formatted date
              Fact_Nro: ventaData.Fact_Nro || '', // Fact_Nro is kept for display in edit form
              Cliente_id: ventaData.Cliente_id || '',
              Estado: ventaData.Estado || '',
              Pago: ventaData.Pago || '',
              Subtotal: ventaData.Subtotal !== null ? String(ventaData.Subtotal) : '', // Handle null, keep as string for input
               // IVA value from DB might be number, convert to string for select's value
              IVA: ventaData.IVA !== null ? String(ventaData.IVA) : '', // Ensure IVA is string for select
              Total: ventaData.Total !== null ? String(ventaData.Total) : '', // Handle null, keep as string for input (Total USD)
              Cotizacion_Dolar: ventaData.Cotizacion_Dolar !== null ? String(ventaData.Cotizacion_Dolar) : '', // Load Cotizacion_Dolar
              Total_ARS: ventaData.Total_ARS !== null ? String(ventaData.Total_ARS) : '', // Load Total_ARS
              items: ventaData.items || [], // Load existing items (product or custom)
          });
            // Re-fetch clients and products just in case for the dropdowns
            fetchClients();
            fetchProductos();
      } catch (err) {
          console.error(`Error fetching venta by ID ${selectedVentaId}:`, err);
          setError(err.message || `Error al cargar los datos de la venta.`);
          setEditingVentaId(null);
          setSelectedVentaId(null); // Deselect on error
           // Reset edited data structure with dolar fields
          setEditedVentaData({
              id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
              Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: []
          });
      } finally {
          setLoadingEditData(false); // Always set loading to false
      }
      // Removed IPC listener setup and cleanup for fetching data for edit
   };


  // Handle changes in the edit form (main sale details only, items handled by child component)
  // Modified to handle Cotizacion_Dolar and recalculate Total_ARS (Keep this logic)
  const handleEditFormChange = (e) => {
       const { name, value } = e.target;
       let processedValue = value;

        // Update state with new column names
        let updatedEditedVentaData = { ...editedVentaData, [name]: processedValue };
        setEditedVentaData(updatedEditedVentaData);


        // Recalculate Total USD and Total ARS on edit form input change
        if (['Subtotal', 'IVA', 'Cotizacion_Dolar'].includes(name)) {
            const subtotal = parseFloat(updatedEditedVentaData.Subtotal);
             // Parse the IVA value from the select (it's a string)
            const ivaPercentage = parseFloat(updatedEditedVentaData.IVA);
            const cotizacion = parseFloat(updatedEditedVentaData.Cotizacion_Dolar); // Get Cotizacion_Dolar

            let calculatedTotalUSD = '';
            if (!isNaN(subtotal) && updatedEditedVentaData.IVA !== '') {
                const ivaAmount = subtotal * (ivaPercentage / 100);
                calculatedTotalUSD = (subtotal + ivaAmount).toFixed(2);
            } else if (!isNaN(subtotal) && updatedEditedVentaData.IVA === '') {
                 // If IVA is empty but subtotal exists, Total is just Subtotal
                 calculatedTotalUSD = subtotal.toFixed(2);
            }

            let calculatedTotalARS = '';
             // Calculate Total ARS only if Total USD and Cotizacion Dolar are valid numbers
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            }

            setEditedVentaData(prevData => ({
                ...prevData,
                Total: calculatedTotalUSD, // Total USD
                Total_ARS: calculatedTotalARS // Total ARS
            }));
        }
  };

   // Handler for when the items list changes in the VentaItemsEditor child component during edit
   // NOTE: This calculation is for DISPLAY purposes in the edit form only.
   // The backend update handler currently does NOT use this calculated subtotal from the frontend.
   // Modified to also trigger Total ARS recalculation (Keep this logic)
   const handleEditedVentaItemsChange = (newItems) => {
       const calculatedSubtotal = newItems.reduce((sum, item) => {
            const itemTotal = parseFloat(item.Total_Item);
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2);

       setEditedVentaData(prevState => {
            const updatedState = {
                ...prevState,
                items: newItems,
                // Optionally update Subtotal state in the edit form based on item changes
                // Subtotal: calculatedSubtotal // Uncomment this if you want the Subtotal field to update visually during edit
            };

            // Recalculate Total USD based on the (potentially updated) Subtotal and current IVA
            if (updatedState.Subtotal !== '' && updatedState.IVA !== '') {
               const subtotal = parseFloat(updatedState.Subtotal);
               const ivaPercentage = parseFloat(updatedState.IVA);
                if (!isNaN(subtotal) && !isNaN(ivaPercentage)) {
                   const ivaAmount = subtotal * (ivaPercentage / 100);
                   const total = subtotal + ivaAmount;
                   updatedState.Total = total.toFixed(2); // Total USD
               } else {
                   updatedState.Total = '';
               }
           } else {
               updatedState.Total = ''; // Clear total USD if subtotal or IVA is empty
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


    // Modified to include Cotizacion_Dolar and Total_ARS in dataToSend
    // **** CORRECCIÓN PRINCIPAL: Incluir items en dataToSend y validar items ****
  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // VALIDACIÓN FRONTAL MEJORADA
       // *** UPDATED VALIDATION TO CHECK Cliente_id from state ***
      if (!editedVentaData.Fecha || !editedVentaData.Cliente_id || !editedVentaData.Estado || !editedVentaData.Pago || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0) {
           setError('Fecha, Cliente, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.');
           setSavingData(false);
           return;
      }
      // **** AÑADIR VALIDACIÓN DE ITEMS ****
      if (!Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0) {
          setError('La venta debe tener al menos un ítem.');
          setSavingData(false);
          return;
      }
      // **** FIN VALIDACIÓN DE ITEMS ****

       if (editedVentaData.Subtotal !== '' && isNaN(parseFloat(editedVentaData.Subtotal))) {
           setError('Subtotal debe ser un número válido.');
           setSavingData(false);
           return;
       }
        if (editedVentaData.IVA !== '' && isNaN(parseFloat(editedVentaData.IVA))) {
           setError('IVA debe ser un número válido (porcentaje).');
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
      const dataToSend = {
          id: editedVentaData.id,
          Fecha: formattedFecha, // Use the formatted date
          // Fact_Nro: editedVentaData.Fact_Nro, // No enviar Fact_Nro si no se debe actualizar
          Cliente_id: parseInt(editedVentaData.Cliente_id, 10),
          Estado: editedVentaData.Estado,
          Pago: editedVentaData.Pago,
          Subtotal: editedVentaData.Subtotal !== '' ? parseFloat(editedVentaData.Subtotal) : null,
          IVA: editedVentaData.IVA !== '' ? parseFloat(editedVentaData.IVA) : null,
          Total: editedVentaData.Total !== '' ? parseFloat(editedVentaData.Total) : null,
          Cotizacion_Dolar: editedVentaData.Cotizacion_Dolar !== '' ? parseFloat(editedVentaData.Cotizacion_Dolar) : null,
          Total_ARS: editedVentaData.Total_ARS !== '' ? parseFloat(editedVentaData.Total_ARS) : null,
          // **** INCLUIR ITEMS EN dataToSend ****
          items: editedVentaData.items.map(item => ({
              id: item.id || undefined, // Include ID if it exists (for existing items)
              type: item.type, // Send the type
              Descuento_Porcentaje: item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje and handle empty/NaN
              Total_Item: item.Total_Item !== null && item.Total_Item !== '' && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null, // Ensure Total_Item is float or null and handle empty/NaN
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null && item.Cantidad !== '' && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null, // Ensure Quantity is float or null and handle empty/NaN
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== '' && !isNaN(parseFloat(item.Precio_Unitario_Venta)) ? parseFloat(item.Precio_Unitario_Venta) : null, // Ensure Price is float or null and handle empty/NaN
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' && !isNaN(parseFloat(item.Cantidad_Personalizada)) ? parseFloat(item.Cantidad_Personalizada) : null, // Ensure Quantity is float or null and handle empty/NaN
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada) : null, // Ensure Price is float or null and handle empty/NaN
               }),
          })),
          // **** FIN INCLUIR ITEMS ****
      };

      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
          const response = await electronAPI.updateVenta(dataToSend.id, dataToSend); // New API call (PUT /ventas/:id)
           console.log('Venta updated successfully:', response.success);
           // Handle success response

          setEditingVentaId(null);
           // Reset edited data structure with dolar fields
          setEditedVentaData({
              id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
              Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: []
          });
          setSelectedVentaId(null);
           // *** Clear client search states after successful edit ***
           setClientSearchTerm('');
           setDisplayClients(clientes); // Reset display list to all clients
           // *** END Clear client search states ***

          fetchVentas(); // Refresh the list
          // NOTE: Stock is handled by backend during update

      } catch (err) {
           console.error('Error updating venta:', err);
          setError(err.message || `Error al actualizar la venta.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for updating
  };

  const handleCancelEdit = () => { // Keep this
      setEditingVentaId(null);
      // Reset edited data structure with dolar fields
      setEditedVentaData({
          id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
          Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
          Cotizacion_Dolar: '', Total_ARS: '', items: []
      });
      setError(null);
       // *** Clear client search states on cancel edit ***
       setDisplayClients(clientes); // Reset display list to all clients
       setClientSearchTerm(''); // Also clear the search term
       // *** END Clear client search states ***
  };


  // --- Delete Functionality ---

  // Handle click on Delete button (now uses selectedVentaId)
  // NOTE: The backend delete-venta handler *does* reverse stock changes.
  // The confirmation message text should be updated to reflect this if desired.
  const handleDeleteClick = async () => { // Make the function async
       if (selectedVentaId === null) return; // Should be disabled, but good practice

      // Updated confirmation message to reflect stock reversal
      if (window.confirm(`¿Está seguro de eliminar la venta con ID ${selectedVentaId}? Esta acción eliminará los ítems y revertirá los cambios de stock para los productos vendidos.`)) {
        console.log(`[ListaVentas - DEBUG] Iniciando eliminación de venta ID ${selectedVentaId}.`);
        setDeletingVentaId(selectedVentaId);
          setError(null);

          try {
              // Call the async API function for deleting
              const response = await electronAPI.deleteVenta(selectedVentaId); // New API call (DELETE /ventas/:id)
               console.log(`Venta with ID ${selectedVentaId} deleted successfully.`, response.success);
               // Handle success response

              setSelectedVentaId(null); // Deselect after deleting
              fetchVentas(); // Refresh the list
               // Refresh stock view after deleting a sale (since stock is reversed)
               fetchStock(); // Call the async fetchStock

          } catch (err) {
               console.error(`Error deleting venta with ID ${selectedVentaId}:`, err);
               setError(err.message || `Error al eliminar la venta.`);
          } finally {
              console.log(`[ListaVentas - DEBUG] Reseteando deletingVentaId a null después de respuesta de eliminación.`);
              setDeletingVentaId(null);
          }
      }
      // Removed IPC listener setup and cleanup for deleting
   };

    // Handle click on "Nueva Venta" button (Keep this)
    const handleNewVentaClick = () => {
        console.log('[ListaVentas - DEBUG] handleNewVentaClick llamada. deletingVentaId actual:', deletingVentaId);
        setShowAddForm(true);
        setError(null); // Clear any previous errors
         // Ensure newVentaData state is reset when opening the form, including items and dolar fields
         setNewVentaData({
             Fecha: '', // Fact_Nro is not in state anymore
             Cliente_id: '', Estado: '',
             Pago: '', Subtotal: '', IVA: '', Total: '',
             Cotizacion_Dolar: '', Total_ARS: '', items: [],
         });
        setSelectedVentaId(null); // Deselect any venta
        setEditingVentaId(null); // Close any open edit form
         // Re-fetch clients and products just in case for the dropdowns
         fetchClients();
         fetchProductos();
        // NUEVO: Reset el trigger al abrir el formulario para que el editor empiece limpio
        setClearItemsEditorErrorsTrigger(0);
         // *** Clear client search states when opening add form ***
         setDisplayClients(clientes); // Reset display list to all clients
         setClientSearchTerm(''); // Also clear the search term
         // *** END Clear client search states ***
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
        // NUEVO: Reset el trigger al cancelar para limpiar el editor si se vuelve a abrir
        setClearItemsEditorErrorsTrigger(0);
         // *** Clear client search states on cancel add ***
         setDisplayClients(clientes); // Reset display list to all clients
         setClientSearchTerm(''); // Also clear the search term
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
        console.log('[ListaVentas] Client selected:', client);
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


    // --- Import Presupuesto Functionality --- (Keep this logic)

    // Handle click on the "Importar Presupuesto" button
    const handleImportPresupuestoClick = () => {
        setShowImportModal(true); // Show the import modal
        setError(null); // Clear any previous errors
        // The modal component itself (ImportPresupuestoModal) will be adapted separately
        // to use the new API to fetch the list of budgets and budget details.
        // This component (ListaVentas) just needs to open the modal.
    };

    // Handle data received from the ImportPresupuestoModal
    // Modified to import Cotizacion_Dolar (Keep this logic)
    const handlePresupuestoImported = (presupuestoData) => {
        console.log("Presupuesto imported:", presupuestoData);
        // LOGGING para depurar items
        console.log("Presupuesto items received:", presupuestoData.items);


        // Map the imported budget data to the newVentaData state structure
        // This mapping logic is frontend-specific and remains here.

        // Map budget items to sale items
        const importedItems = (presupuestoData.items || []).map(item => {
            // LOGGING para depurar cada item antes del mapeo
            console.log("Mapping item:", item);

            let mappedItem = {};

            // Determine item type based on Producto_id or other properties
             // The backend's getPresupuestoById should provide enough info for this mapping.
            if (item.Producto_id !== null && item.Producto_id !== undefined) {
                // It's a product item from the budget
                // Map Presupuesto_Items fields to Venta_Items fields
                mappedItem = {
                    type: 'product', // Identificar el tipo de ítem
                    Producto_id: item.Producto_id,
                    Cantidad: item.Cantidad, // Quantity is the same
                    // Calculate Precio_Unitario_Venta based on Total_Item and Quantity
                    // Or use item.Precio_Unitario from the budget if provided and valid
                    Precio_Unitario_Venta: (item.Total_Item !== null && item.Cantidad > 0)
                                            ? parseFloat((item.Total_Item / item.Cantidad).toFixed(2))
                                            : (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && item.Precio_Unitario !== '')
                                                ? parseFloat(item.Precio_Unitario) // Fallback to original item price from budget
                                                : '', // If neither is possible, leave empty
                    Total_Item: item.Total_Item, // Total is the same
                    Descuento_Porcentaje: item.Descuento_Porcentaje !== null ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje
                    // Include product details for display in VentaItemsEditor
                    codigo: item.codigo, // This should come from the JOIN in the backend query for presupuestos
                    Descripcion: item.Descripcion, // This should come from the JOIN (alias Producto_Descripcion)
                };
                 // Ensure custom-specific fields are null for product items
                 mappedItem.Descripcion_Personalizada = null;
                 mappedItem.Cantidad_Personalizada = null;
                 mappedItem.Precio_Unitario_Personalizada = null;

                 // LOGGING para depurar item mapeado de producto
                 console.log("Mapped product item:", mappedItem);
                 return mappedItem;

            } else {
                // Assume it's a custom item
                // Map Presupuesto_Items personalized fields to Venta_Items personalized fields
                const mappedItem = {
                    type: 'custom', // Identificar el tipo de ítem
                    Descripcion_Personalizada: item.Descripcion_Personalizada,
                    Cantidad_Personalizada: item.Cantidad_Personalizada, // Quantity is the same
                    Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada, // Price is the same
                    Total_Item: item.Total_Item, // Total is the same
                    Descuento_Porcentaje: item.Descuento_Porcentaje !== null ? parseFloat(item.Descuento_Porcentaje) : null, // Include Descuento_Porcentaje
                };
                 // Ensure product-specific fields are null for custom items
                 mappedItem.Producto_id = null;
                 mappedItem.Cantidad = null;
                 mappedItem.Precio_Unitario_Venta = null;
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
                 Fact_Nro: '', // Keep empty for manual entry
                 Cliente_id: presupuestoData.Cliente_id || '', // Set client ID
                 // Estado: '', // Keep empty
                 // Pago: '', // Keep empty
                 items: importedItems, // Set the imported items

                 // Keep IVA from budget if available, otherwise default or empty.
                 IVA: presupuestoData.IVA_Porcentaje !== null ? String(presupuestoData.IVA_Porcentaje) : '',
                 // Import Cotizacion_Dolar from budget
                 Cotizacion_Dolar: presupuestoData.Cotizacion_Dolar !== null ? String(presupuestoData.Cotizacion_Dolar) : '',

                 // The useEffect watching items, IVA, and Cotizacion_Dolar will now handle the total recalculation
                 // No need to call handleNewVentaItemsChange directly here anymore.

                 // Keep other fields as they were
                 Fact_Nro: prevState.Fact_Nro,
                 Estado: prevState.Estado,
                 Pago: prevState.Pago,
                 Subtotal: prevState.Subtotal,
                 Total: prevState.Total,
                 Total_ARS: prevState.Total_ARS,
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


             return updatedState; // Return the state with updated items and potentially updated IVA and Cotizacion_Dolar
        });

        // Close the modal is handled by the modal's onImport callback
        // setShowImportModal(false); // This is handled by the modal's onClose prop callback
    };


  // Helper function to get the display text for Estado (Keep this)
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

  // Helper function to get the color for Estado (Keep this)
  const getEstadoColor = (estado) => {
      switch (estado) {
          case 'entregado': return '#4CAF50'; // Green
          case 'en maquina':
          case 'pedido': return '#FF9800'; // Orange
          case 'cancelado': return '#F4436'; // Red
          case 'listo': return '#2196F3'; // Blue
          default: return 'inherit'; // Default color
      }
  };

    // Helper function to get the display text for Pago (Keep this)
   const getPagoDisplayText = (pago) => {
       switch (pago) {
           case 'abonado': return 'Abonado';
           case 'seña': return 'Seña';
           case 'debe': return 'Debe';
           default: return pago;
       }
   };

    // Helper function to get the color for Pago (Keep this)
    const getPagoColor = (pago) => {
        switch (pago) {
            case 'abonado': return '#2196F3'; // Blue
            case 'seña': return '#FF9800'; // Orange
            case 'debe': return '#F44336'; // Red
            default: return 'inherit'; // Default color
        }
    };

     // Helper to get client details by ID (NEW)
     const getClientDetails = (clientId) => {
        return clientes.find(c => c.id === clientId);
     };


  return (
    <div className="container">
      <h2>Gestión de Ventas</h2>

       {/* Button to show the add form */}
       {!showAddForm && (
           <button onClick={handleNewVentaClick} disabled={loading || loadingEditData || savingData || deletingVentaId !== null}>
               Nueva Venta
           </button>
       )}

      {/* Form to Add New Venta (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nueva Venta</h3>
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
                    {/* Removed Fact Nro input field */}

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
                    {/* IVA Select Field */}
                     <div>
                        <label htmlFor="new-iva">IVA (%):</label>
                         <select
                            id="new-iva"
                            name="IVA"
                            value={newVentaData.IVA}
                            onChange={handleNewVentaInputChange}
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                        >
                            <option value="">Seleccione IVA</option> {/* Default option */}
                            <option value="21">21%</option>
                            <option value="10.5">10.5%</option>
                            <option value="27">27%</option>
                        </select>
                    </div>
             <div>
                <label htmlFor="new-total">Total USD:</label>
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

                    <VentaItemsEditor
                         items={newVentaData.items}
                         onItemsChange={handleNewVentaItemsChange}
                         productos={productos}
                         savingData={savingData || loadingEditData || deletingVentaId !== null}
                         // NUEVO: Pasa el clearTrigger al VentaItemsEditor
                         clearTrigger={clearItemsEditorErrorsTrigger}
                    />
                     {productos.length === 0 && (loading || loadingEditData) && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos...</p>}
                     {productos.length === 0 && !loading && !loadingEditData && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero.</p>}


                   {/* Button container for form actions */}
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                        {/* *** Added validation to submit button for client_id *** */}
                       <button type="submit" disabled={savingData || loadingEditData || deletingVentaId !== null || !newVentaData.Cliente_id || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0}>Agregar Venta</button>
                       {/* Cancel button for the add form */}
                       <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingVentaId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                           Cancelar
                       </button>
                   </div>
               </form>
          </>
      )}


      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

      {/* Display Client List (Conditional Rendering) */}
      {!showAddForm && (
          <>
              <h3>Ventas Existentes (Últimas 10)</h3>

               {/* Edit and Delete Buttons */}
               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedVentaId === null || editingVentaId !== null || loadingEditData || savingData || deletingVentaId !== null}
                   >
                       Editar Venta Seleccionada
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedVentaId === null || editingVentaId !== null || loadingEditData || savingData || deletingVentaId !== null}
                       style={{ marginLeft: '10px' }}
                   >
                       Eliminar Venta Seleccionada
                   </button>
               </div>


              {loading && <p>Cargando ventas...</p>}
              {loadingEditData && <p>Cargando datos de venta para editar...</p>}
              {savingData && <p>Guardando cambios de venta...</p>}
              {deletingVentaId && <p>Eliminando venta...</p>}

              {!loading && ventas.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Fact Nro</th>
                      <th>Cliente</th>
                      <th>Cuit</th>
                      <th>Estado</th>
                      <th>Pago</th>
                      <th>Subtotal</th>
                      <th>Iva (%)</th>
                      <th>Total USD</th>
                      <th>Cotización Dólar</th>
                      <th>Total ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => (
                      <React.Fragment key={venta.id}>
                        <tr
                            onClick={() => handleRowClick(venta.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedVentaId === venta.id ? '#424242' : 'transparent' }}
                        >
                          {/* Format the date here */}
                          <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                          <td>{venta.Fact_Nro}</td>
                          <td>{venta.Nombre_Cliente}</td>
                          <td>{venta.Cuit_Cliente}</td>

                          <td style={{ backgroundColor: getEstadoColor(venta.Estado), color: '#212121', fontWeight: 'bold' }}>
                              {getEstadoDisplayText(venta.Estado)}
                          </td>

                          <td style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold' }}>
                              {getPagoDisplayText(venta.Pago)} {/* Corrected typo here */}
                           </td>

                          {/* Safely access and format numerical values */}
                          <td>{venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal).toFixed(2) : 'N/A'}</td>
                           <td>{venta.IVA !== null && venta.IVA !== undefined && !isNaN(parseFloat(venta.IVA)) ? parseFloat(venta.IVA).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS).toFixed(2) : 'N/A'}</td>
                        </tr>
                        {editingVentaId === venta.id && !showAddForm && (
                            <tr>
                                <td colSpan="11">
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Venta (ID: {venta.id})</h4>
                                        <form onSubmit={handleSaveEdit}>
                                             <div>
                                                <label htmlFor={`edit-fecha-${venta.id}`}>Fecha:</label>
                                                 {/* The date input type expectsYYYY-MM-DD format, so we format the fetched date for the input */}
                                                <input type="date" id={`edit-fecha-${venta.id}`} name="Fecha" value={editedVentaData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                            </div>
                                            {/* Display Fact Nro as read-only */}
                                            <div>
                                                <label htmlFor={`edit-fact-nro-${venta.id}`}>Fact Nro:</label>
                                                <input type="text" id={`edit-fact-nro-${venta.id}`} name="Fact_Nro" value={editedVentaData.Fact_Nro || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
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
                                                      disabled={savingData || clientes.length === 0}
                                                 />
                                                  {clientes.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando clientes...</p>}
                                             </div>

                                            {/* Display Selected Client or message */}
                                            {editedVentaData.Cliente_id ? (
                                                 <div style={{ fontSize: '0.9rem', color: '#bdbdbyd', marginBottom: '10px' }}>
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
                                                <input type="number" id={`edit-subtotal-${venta.id}`} name="Subtotal" value={editedVentaData.Subtotal || ''} onChange={handleEditFormChange} disabled={savingData} step="0.01"/>
                                            </div>
                                             {/* IVA Select Field */}
                                             <div>
                                                <label htmlFor={`edit-iva-${venta.id}`}>IVA (%):</label>
                                                 <select
                                                    id={`edit-iva-${venta.id}`}
                                                    name="IVA"
                                                    value={editedVentaData.IVA || ''}
                                                    onChange={handleEditFormChange}
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione IVA</option>
                                                    <option value="21">21%</option>
                                                    <option value="10.5">10.5%</option>
                                                    <option value="27">27%</option>
                                                </select>
                                            </div>
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

                                            {/* VentaItemsEditor para EDITAR */}
                                             <VentaItemsEditor
                                                  items={editedVentaData.items}
                                                  onItemsChange={handleEditedVentaItemsChange}
                                                  productos={productos}
                                                  savingData={savingData || clientes.length === 0 || productos.length === 0}
                                             />
                                              {productos.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}
                                               {productos.length === 0 && !loadingEditData && !loading && !savingData && editingVentaId !== null && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero.</p>}


                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                 {/* Botón Guardar Cambios */}
                                                 {/* *** Added validation to submit button for client_id *** */}
                                                 <button type="submit" disabled={savingData || !editedVentaData.Cliente_id || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0 || editedVentaData.items.length === 0}> {/* Added validation to submit button */}
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
              {!loading && ventas.length === 0 && !error && <p>No hay ventas registradas.</p>}
          </>
      )}

        {/* Render the Import Presupuesto Modal */}
        {/* The modal component itself will need to be adapted separately */}
        {showImportModal && (
             <ImportPresupuestoModal
                 onClose={() => setShowImportModal(false)} // Function to close the modal
                 onImport={handlePresupuestoImported} // Callback to receive imported data
                 existingClientId={newVentaData.Cliente_id} // Pass the selected client ID for filtering
             />
        )}

    </div>
  );
}

export default ListaVentas;