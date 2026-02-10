// src/components/ListaCompras.js (Modified for Backend API Communication and Date Formatting)

import React, { useState, useEffect } from 'react';
import CompraItemsEditor from './compras/CompraItemsEditor';
// You might want a modal for purchase details later, similar to SaleDetailsModal
import PurchaseDetailsModal from './PurchaseDetailsModal'; // Import the modal component
import { format } from 'date-fns'; // Import the format function from date-fns


// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaCompras() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompraId, setSelectedCompraId] = useState(null);
  const [editingCompraId, setEditingCompraId] = useState(null);

  // editedCompraData state keys match the new DB column names, now includes items and dolar fields
  const [editedCompraData, setEditedCompraData] = useState({
      id: null,
      Fecha: '',
      Fact_Nro: '',
      Proveedor_id: '',
      Estado: '',
      MontoTotal: '',
      Cotizacion_Dolar: '',
      Total_ARS: '',
      Pago: '', // <<< NUEVO: Campo Pago
      items: [],
  });

   // New state for adding a new venta, keys match DB column names, includes items and dolar fields
  const [newCompraData, setNewCompraData] = useState({
      Fecha: '',
      Fact_Nro: '',
      Proveedor_id: '',
      Estado: '',
      MontoTotal: '',
      Cotizacion_Dolar: '',
      Total_ARS: '',
      Pago: '', // <<< NUEVO: Campo Pago
      items: [],
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingCompraId, setDeletingCompraId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);

  // --- Estados para el detalle de compra (Para el modal) ---
   const [selectedCompraForDetail, setSelectedCompraForDetail] = useState(null); // { id: number }
   const [compraDetailsData, setCompraDetailsData] = useState(null); // Datos completos de la compra seleccionada
   const [loadingCompraDetails, setLoadingCompraDetails] = useState(false);
   const [compraDetailsError, setCompraDetailsError] = useState(null);
   const [showCompraDetailsModal, setShowCompraDetailsModal] = useState(false);


  // Function to fetch purchases using the new API
  const fetchCompras = async () => { // Make the function async
    setLoading(true);
    setError(null);
     setSelectedCompraId(null);
    setEditingCompraId(null);
    // Reset edited data structure with new DB column names, including dolar fields and Pago
    setEditedCompraData({
        id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
        Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
    });

    try {
        // Call the async API function and await its result
        const data = await electronAPI.getCompras(); // New API call (GET /compras)
        console.log('Compras cargadas:', data);
        setCompras(data); // Data is the direct response

    } catch (err) {
        console.error('Error fetching compras:', err);
        setError(err.message || 'Error al cargar las compras.');
        setCompras([]); // Clear the list on error
         setSelectedCompraId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false
    }
    // Removed all IPC listener setup and cleanup for fetching compras
  };

  // Function to fetch proveedores using the new API
  const fetchProveedores = async () => { // Make the function async
      try {
          const data = await electronAPI.getProveedores(); // New API call (GET /proveedores)
          console.log('Proveedores cargados para compras:', data);
          setProveedores(data);
      } catch (err) {
         console.error('Error fetching proveedores for compras:', err);
         // Decide how to handle error
      }
      // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching proveedores
   };

    // Function to fetch products using the new API
  const fetchProductos = async () => { // Make the function async
      try {
          const data = await electronAPI.getProductos(); // New API call (GET /productos)
          console.log('Products loaded for compra items:', data);
          setProductos(data);
      } catch (err) {
          console.error('Error fetching products for compra items:', err);
          // Decide how to handle error
      }
       // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching products
   };

  // Function to fetch stock (needed to refresh stock view) using the new API
  const fetchStock = async () => { // Make the function async
       try {
            const data = await electronAPI.getStock(); // New API call (GET /stock)
            console.log('Stock data fetched for refresh (Compras):', data);
             // Do something with stock data if needed, or just rely on it being fetched
             // by ListaStock.js itself if that component is mounted elsewhere.
       } catch (err) {
           console.error('Error fetching stock data for refresh (Compras):', err);
           // Handle error
       }
       // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching stock
   };


  // Effect to fetch initial data (compras, proveedores, and products)
  useEffect(() => {
    // Call the async fetch functions directly
    fetchCompras();
    fetchProveedores();
    fetchProductos();

    // Removed IPC listener setup and cleanup from here
    // return () => { ... }; // REMOVED
  }, []);


   // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (compraId) => {
       if (selectedCompraId === compraId) {
           setSelectedCompraId(null);
           setEditingCompraId(null);
           // Clear purchase details and close modal if selected row is deselected
           setSelectedCompraForDetail(null);
            // Reset edited data structure
           setEditedCompraData({
               id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
               Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
           });
       } else {
           setSelectedCompraId(compraId);
           if(editingCompraId !== null && editingCompraId !== compraId) {
                setEditingCompraId(null);
                 // Reset edited data structure
               setEditedCompraData({
                   id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
                   Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
               });
           }
            // Set selected purchase for detail view
            setSelectedCompraForDetail({ id: compraId }); // This will trigger fetching details and showing modal
       }
        setError(null);
   };


  // --- Add Compra Functionality ---
    // Modified to handle Cotizacion_Dolar, Total_ARS, and Pago
  const handleNewCompraInputChange = (e) => {
       const { name, value } = e.target;
       let updatedNewCompraData = { ...newCompraData, [name]: value };
       setNewCompraData(updatedNewCompraData);

       // Recalculate Total ARS when MontoTotal or Cotizacion_Dolar changes
       if (name === 'MontoTotal' || name === 'Cotizacion_Dolar') {
           const montoTotal = parseFloat(updatedNewCompraData.MontoTotal);
           const cotizacion = parseFloat(updatedNewCompraData.Cotizacion_Dolar);

           let calculatedTotalARS = '';
           if (!isNaN(montoTotal) && !isNaN(cotizacion) && cotizacion > 0) {
               calculatedTotalARS = (montoTotal * cotizacion).toFixed(2);
           }

           setNewCompraData(prevData => ({
               ...prevData,
               Total_ARS: calculatedTotalARS
           }));
       }
        // No need to handle items change here, handled by handleNewCompraItemsChange
  };

   // Handler for when the items list changes (no change needed for this handler based on Pago)
   const handleNewCompraItemsChange = (newItems) => {
       setNewCompraData(prevState => ({
           ...prevState,
           items: newItems
       }));
   };


    // Modified to include Pago validation and dataToSend
  const handleAddCompraSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation based on user's required fields for input
      // Include items, Cotizacion_Dolar, and Pago validation
      if (!newCompraData.Fecha || !newCompraData.Fact_Nro || !newCompraData.Proveedor_id || !newCompraData.Estado || !newCompraData.Pago || !Array.isArray(newCompraData.items) || newCompraData.items.length === 0 || newCompraData.Cotizacion_Dolar === '' || isNaN(parseFloat(newCompraData.Cotizacion_Dolar)) || parseFloat(newCompraData.Cotizacion_Dolar) <= 0) {
           setError('Fecha, Fact Nro, Proveedor, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son campos obligatorios.'); // <<< Mensaje actualizado
           setSavingData(false);
           return;
      }
       // Validate MontoTotal if not empty
       if (newCompraData.MontoTotal !== '' && newCompraData.MontoTotal !== null && isNaN(parseFloat(newCompraData.MontoTotal))) {
           setError('Monto Total debe ser un número válido.');
           setSavingData(false);
           return;
       }
        // Validate Total_ARS if not empty (it's calculated, but validate before sending)
        if (newCompraData.Total_ARS !== '' && newCompraData.Total_ARS !== null && isNaN(parseFloat(newCompraData.Total_ARS))) {
            setError('Error interno: Total ARS calculado no es un número válido.');
            setSavingData(false);
            return;
        }


      // Data to send to backend, keys match DB column names
      // Include Cotizacion_Dolar, Total_ARS, and Pago in dataToSend
      const dataToSend = {
          Fecha: newCompraData.Fecha,
          Fact_Nro: newCompraData.Fact_Nro,
          Proveedor_id: parseInt(newCompraData.Proveedor_id, 10),
          Estado: newCompraData.Estado,
          // Ensure numerical fields are numbers or null
          MontoTotal: newCompraData.MontoTotal !== '' && newCompraData.MontoTotal !== null ? parseFloat(newCompraData.MontoTotal) : null,
          Cotizacion_Dolar: newCompraData.Cotizacion_Dolar !== '' ? parseFloat(newCompraData.Cotizacion_Dolar) : null,
          Total_ARS: newCompraData.Total_ARS !== '' && newCompraData.Total_ARS !== null ? parseFloat(newCompraData.Total_ARS) : null,
          Pago: newCompraData.Pago, // <<< Incluido Pago
           // Include the items array to be sent to the backend
          items: newCompraData.items.map(item => ({
              // id is NOT included for new items
              Producto_id: item.Producto_id,
              Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null,
              Precio_Unitario: item.Precio_Unitario !== null ? parseFloat(item.Precio_Unitario) : null,
              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null,
          })),
      };

      try {
           // Call the async API function for adding
          const response = await electronAPI.addCompra(dataToSend); // New API call (POST /compras)
          console.log('Compra added successfully:', response.success);
          // Handle success response

          // Clear form using new column names and items, including dolar fields and Pago
          setNewCompraData({
              Fecha: '', Fact_Nro: '', Proveedor_id: '', Estado: '',
              MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: 'deuda', items: [], // <<< Valor por defecto 'deuda' para Pago
          });
          setShowAddForm(false);
          fetchCompras(); // Refresh the list
          // Recargar la lista de stock después de agregar una compra
          fetchStock(); // Call async fetchStock

      } catch (err) {
          console.error('Error adding compra:', err);
          setError(err.message || `Error al agregar la compra.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for adding
  };


  // --- Edit Functionality ---
    // Modified to handle Cotizacion_Dolar, Total_ARS, and Pago, and include items for update
  const handleEditClick = async () => { // Make the function async
       if (selectedCompraId === null) return;

       setEditingCompraId(selectedCompraId);
       setLoadingEditData(true);
       setError(null);

       try {
           // Call the async API function to get compra data by ID
           const data = await electronAPI.getCompraById(selectedCompraId); // New API call (GET /compras/:id)
           console.log(`Compra ID ${selectedCompraId} data loaded:`, data);
            // Populate editedCompraData including items and dolar fields
           const compraData = data; // Data is the direct response
           setEditedCompraData({
               id: compraData.id,
               Fecha: compraData.Fecha || '',
               Fact_Nro: compraData.Fact_Nro || '',
               Proveedor_id: compraData.Proveedor_id || '',
               Estado: compraData.Estado || '',
                // Handle null, keep as string for input
               MontoTotal: compraData.MontoTotal !== null ? String(compraData.MontoTotal) : '',
               Cotizacion_Dolar: compraData.Cotizacion_Dolar !== null ? String(compraData.Cotizacion_Dolar) : '',
               Total_ARS: compraData.Total_ARS !== null ? String(compraData.Total_ARS) : '',
               Pago: compraData.Pago || 'deuda', // <<< Cargar campo Pago
               items: compraData.items || [], // Load existing items
           });
            // Re-fetch suppliers and products for the dropdowns just in case
            fetchProveedores();
            fetchProductos();

       } catch (err) {
           console.error(`Error fetching compra by ID ${selectedCompraId}:`, err);
           setError(err.message || `Error al cargar los datos de la compra.`);
           setEditingCompraId(null);
           setSelectedCompraId(null);
           // Reset edited data structure
           setEditedCompraData({
               id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
               Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
           });
       } finally {
           setLoadingEditData(false);
       }
       // Removed IPC listener setup and cleanup for fetching data for edit
   };

  // Handle changes in the edit form (main purchase details only, items handled by child component)
    // Modified to handle Cotizacion_Dolar, Total_ARS, and Pago (Keep this logic)
  const handleEditFormChange = (e) => {
       const { name, value } = e.target;
       let processedValue = value;
       setEditedCompraData({ ...editedCompraData, [name]: processedValue });

        // Recalculate Total ARS when MontoTotal or Cotizacion_Dolar changes
       if (['MontoTotal', 'Cotizacion_Dolar'].includes(name)) {
           const montoTotal = parseFloat(editedCompraData.MontoTotal);
           const cotizacion = parseFloat(value);

           let calculatedTotalARS = '';
           if (!isNaN(montoTotal) && !isNaN(cotizacion) && cotizacion > 0) {
               calculatedTotalARS = (montoTotal * cotizacion).toFixed(2);
           }

           setEditedCompraData(prevData => ({
               ...prevData,
               Total_ARS: calculatedTotalARS
           }));
       }
        // No need to handle items change here, handled by handleEditedCompraItemsChange
  };

   // Handler for when the items list changes in the CompraItemsEditor child component during edit
   // NOTE: This calculation is for DISPLAY purposes in the edit form only.
   // The backend update handler currently does NOT use this calculated subtotal from the frontend.
   // Modified to also trigger Total ARS recalculation (Keep this logic)
   const handleEditedCompraItemsChange = (newItems) => {
       // This handler mainly updates the items array in the state.
       setEditedCompraData(prevState => ({
           ...prevState,
           items: newItems
           // The totals calculation based on items should ideally be done here or in a useEffect
           // watching editedCompraData.items, similar to the add form.
           // However, since the backend recalculates based on items sent during update,
           // recalculating here is mostly for UI display consistency during editing.
       }));
       // Trigger Total ARS recalculation based on potential MontoTotal changes (if you uncommented Subtotal update above)
       // handleEditFormChange({ target: { name: 'MontoTotal', value: calculatedMontoTotal.toString() } }); // Example
   };


    // Modified to include Pago validation and dataToSend, and include items for update
    // NOTE: The backend update-compra handler *does* process items and manages CashFlow.
  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation
      // Added Cotizacion_Dolar and Pago validation
      if (!editedCompraData.Fecha || !editedCompraData.Fact_Nro || !editedCompraData.Proveedor_id || !editedCompraData.Estado || !editedCompraData.Pago || editedCompraData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedCompraData.Cotizacion_Dolar)) || parseFloat(editedCompraData.Cotizacion_Dolar) <= 0) {
           setError('Fecha, Fact Nro, Proveedor, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.'); // <<< Mensaje actualizado
           setSavingData(false);
           return;
      }
        if (editedCompraData.MontoTotal !== '' && editedCompraData.MontoTotal !== null && isNaN(parseFloat(editedCompraData.MontoTotal))) {
           setError('Monto Total debe ser un número válido.');
           setSavingData(false);
           return;
       }
        // Validate Total_ARS if not empty
        if (editedCompraData.Total_ARS !== '' && editedCompraData.Total_ARS !== null && isNaN(parseFloat(editedCompraData.Total_ARS))) {
            setError('Error interno: Total ARS calculado no es un número válido.');
            setSavingData(false);
            return;
        }


      // Send data to backend - includes all main details and the items array.
      // The backend update handler is expected to handle item deletion/re-insertion and CashFlow.
      // Include Cotizacion_Dolar, Total_ARS, and Pago in dataToSend
      const dataToSend = {
          id: editedCompraData.id,
          Fecha: editedCompraData.Fecha,
          Fact_Nro: editedCompraData.Fact_Nro,
          Proveedor_id: parseInt(editedCompraData.Proveedor_id, 10),
          Estado: editedCompraData.Estado,
          MontoTotal: editedCompraData.MontoTotal !== '' && editedCompraData.MontoTotal !== null ? parseFloat(editedCompraData.MontoTotal) : null,
          Cotizacion_Dolar: editedCompraData.Cotizacion_Dolar !== '' ? parseFloat(editedCompraData.Cotizacion_Dolar) : null,
          Total_ARS: editedCompraData.Total_ARS !== '' && editedCompraData.Total_ARS !== null ? parseFloat(editedCompraData.Total_ARS) : null,
          Pago: editedCompraData.Pago, // <<< Incluido Pago
          // Include the items array to be sent to the backend for update
          items: editedCompraData.items.map(item => ({
              // id is NOT included for new items added in edit form (they will be new in DB)
              // id IS included for existing items if your backend update logic uses item IDs
              id: item.id, // Include item ID if it exists (from fetched data)
              Producto_id: item.Producto_id,
              Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null,
              Precio_Unitario: item.Precio_Unitario !== null ? parseFloat(item.Precio_Unitario) : null,
              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null,
              // Backend does not need codigo/Descripcion for insertion/update
          })),
      };

      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
          const response = await electronAPI.updateCompra(dataToSend.id, dataToSend); // New API call (PUT /compras/:id)
           console.log('Compra updated successfully:', response.success);
           // Handle success response

          setEditingCompraId(null);
          // Reset edited data structure
          setEditedCompraData({
              id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
              Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
          });
          setSelectedCompraId(null);
          // Close the detail modal if it was open for this purchase
          setSelectedCompraForDetail(null); // This will also clear compraDetailsData and hide modal via effect

          fetchCompras(); // Refresh the list
          // Refresh stock view after updating a purchase (since items might change)
          fetchStock(); // Call async fetchStock

      } catch (err) {
           console.error('Error updating compra:', err);
           setError(err.message || `Error al actualizar la compra.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for updating
  };

  const handleCancelEdit = () => { // Keep this
      setEditingCompraId(null);
      // Reset edited data structure
      setEditedCompraData({
          id: null, Fecha: '', Fact_Nro: '', Proveedor_id: '',
          Estado: '', MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: '', items: [], // <<< Incluido Pago
      });
      setError(null);
  };


  // --- Delete Functionality ---
    // NOTE: The backend delete-compra handler *does* reverse stock changes.
    // The confirmation message text should be updated to reflect this if desired.

  const handleDeleteClick = async () => { // Make the function async
       if (selectedCompraId === null) return;

      // Updated confirmation message to reflect stock reversal and CashFlow deletion
      if (window.confirm(`¿Está seguro de eliminar la compra con ID ${selectedCompraId}? Esta acción eliminará los ítems, revertirá los cambios de stock y eliminará el movimiento de CashFlow asociado.`)) {
          setDeletingCompraId(selectedCompraId);
          setError(null);

          try {
              // Call the async API function for deleting
              const response = await electronAPI.deleteCompra(selectedCompraId); // New API call (DELETE /compras/:id)
              console.log(`Compra with ID ${selectedCompraId} deleted successfully.`, response.success);
               // Handle success response

              setSelectedCompraId(null);
              // Close the detail modal if it was open for this purchase
              setSelectedCompraForDetail(null); // This will also clear compraDetailsData and hide modal via effect

              fetchCompras(); // Refresh the list
               // Refresh stock view after deleting a purchase
               fetchStock(); // Call async fetchStock

          } catch (err) {
               console.error(`Error deleting compra with ID ${selectedCompraId}:`, err);
               setError(err.message || `Error al eliminar la compra.`);
          } finally {
              setDeletingCompraId(null);
          }
      }
      // Removed IPC listener setup and cleanup for deleting
   };

    // Handle click on "Nueva Compra" button (Keep this)
    const handleNewCompraClick = () => {
        setShowAddForm(true);
        setError(null);
         setSavingData(false);
         // Ensure newVentaData state is reset when opening the form, including items and dolar fields and Pago
         setNewCompraData({
             Fecha: '', Fact_Nro: '', Proveedor_id: '', Estado: '',
             MontoTotal: '', Cotizacion_Dolar: '', Total_ARS: '', Pago: 'deuda', items: [], // <<< Valor por defecto 'deuda' para Pago
         });
        setSelectedCompraId(null);
        setEditingCompraId(null);
         // Clear any detail view/modal
         setSelectedCompraForDetail(null); // This will close the modal
         fetchProveedores();
         fetchProductos();
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
        setSavingData(false);
    };

    // Helper function to get the color for Estado (Keep existing)
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'entregado': return '#4CAF50'; // Green
            case 'pedido': return '#FF9800'; // Orange
            default: return 'inherit';
        }
    };

     // Helper function to get the color for Pago (NEW) (Keep existing)
     const getPagoColor = (pago) => {
         switch (pago) {
             case 'abonado': return '#2196F3'; // Blue
             case 'deuda': return '#F44336'; // Red (usar el mismo rojo que para "debe")
             default: return 'inherit';
         }
     };

     // Helper function to get the display text for Estado (Keep this)
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


     // --- Modal de Detalles de Compra ---

     // Effect for fetching details of a selected purchase (Keep this as is)
     useEffect(() => {
         console.log('[ListaCompras] useEffect (selectedCompraForDetail) triggered with:', selectedCompraForDetail);
         if (!selectedCompraForDetail) {
             console.log('[ListaCompras] selectedCompraForDetail is null, clearing detail data.');
             setCompraDetailsData(null);
             setLoadingCompraDetails(false);
             setCompraDetailsError(null);
             setShowCompraDetailsModal(false); // Ensure modal is closed
             return;
         }

         console.log(`[ListaCompras] Fetching details for Compra ID: ${selectedCompraForDetail.id}`);
         setLoadingCompraDetails(true);
         setCompraDetailsError(null);
         setCompraDetailsData(null); // Clear previous data

         // Async function to fetch compra details
         const fetchCompraDetails = async () => {
             try {
                  // Call the async API function and await the result
                 const data = await electronAPI.getCompraById(selectedCompraForDetail.id); // New API call (GET /compras/:id)
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

         fetchCompraDetails(); // Call the async function

         // Removed IPC listener setup and cleanup for this effect
         // return () => { electronAPI.removeAllGetCompraByIdListeners(); }; // REMOVED

     }, [selectedCompraForDetail]); // Re-run effect when a new budget is selected


     // Función para cerrar el modal de detalles (Keep this as is)
     const handleCloseCompraDetailsModal = () => {
         console.log('[ListaCompras] Closing purchase details modal.');
         setSelectedCompraForDetail(null); // This will also clear compraDetailsData and hide the modal via the second useEffect
     };


  return (
    <div className="container">
      <h2>Gestión de Compras</h2>

       {/* Button to show the add form */}
       {!showAddForm && (
           <button onClick={handleNewCompraClick} disabled={loading || loadingEditData || savingData || deletingCompraId !== null}>
               Nueva Compra
           </button>
       )}

      {/* Form to Add New Compra (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nueva Compra</h3>
               <form onSubmit={handleAddCompraSubmit}>
                    <div>
                        <label htmlFor="new-fecha">Fecha:</label>
                        <input type="date" id="new-fecha" name="Fecha" value={newCompraData.Fecha} onChange={handleNewCompraInputChange} required disabled={savingData || loadingEditData || deletingCompraId !== null} />
                    </div>
                    <div>
                        <label htmlFor="new-fact-nro">Fact Nro:</label>
                        <input type="text" id="new-fact-nro" name="Fact_Nro" value={newCompraData.Fact_Nro} onChange={handleNewCompraInputChange} required disabled={savingData || loadingEditData || deletingCompraId !== null} />
                    </div>
                     <div>
                        <label htmlFor="new-proveedor-id">Proveedor:</label>
                        <select
                            id="new-proveedor-id"
                            name="Proveedor_id"
                            value={newCompraData.Proveedor_id}
                            onChange={handleNewCompraInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingCompraId !== null || proveedores.length === 0}
                        >
                            <option value="">Seleccione Proveedor</option>
                            {proveedores.map(proveedor => (
                                <option key={proveedor.id} value={proveedor.id}>{proveedor.Empresa}</option>
                            ))}
                        </select>
                         {proveedores.length === 0 && (loading || loadingEditData) && <p>Cargando proveedores...</p>} {/* Added loading state for providers fetch */}
                         {proveedores.length === 0 && !loading && !loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay proveedores disponibles. Agregue proveedores primero.</p>}
                    </div>
                     {/* Cuit (Derived) - Display only */}
                    {newCompraData.Proveedor_id && proveedores.find(p => p.id === parseInt(newCompraData.Proveedor_id)) && (
                         <div>
                            <label>Cuit Proveedor:</label>
                            <p>{proveedores.find(p => p.id === parseInt(newCompraData.Proveedor_id)).Cuit}</p>
                         </div>
                    )}
                     <div>
                        <label htmlFor="new-estado">Estado:</label>
                        <select
                            id="new-estado"
                            name="Estado"
                            value={newCompraData.Estado}
                            onChange={handleNewCompraInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingCompraId !== null}
                        >
                            <option value="">Seleccione Estado</option>
                            <option value="entregado">Entregado</option>
                            <option value="pedido">Pedido</option>
                        </select>
                    </div>
                    {/* NUEVO CAMPO: Pago */}
                    <div>
                         <label htmlFor="new-pago">Pago:</label>
                         <select
                            id="new-pago"
                            name="Pago"
                            value={newCompraData.Pago}
                            onChange={handleNewCompraInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingCompraId !== null}
                         >
                            <option value="">Seleccione Pago</option>
                            <option value="abonado">Abonado</option>
                            <option value="deuda">Deuda</option>
                         </select>
                    </div>
                     <div>
                        <label htmlFor="new-montototal">Monto Total (USD):</label>
                        <input type="number" id="new-montototal" name="MontoTotal" value={newCompraData.MontoTotal} onChange={handleNewCompraInputChange} disabled={savingData || loadingEditData || deletingCompraId !== null} step="0.01" />
                    </div>
                     {/* New field for Cotizacion Dolar */}
                     <div>
                         <label htmlFor="new-cotizacion-dolar">Cotización Dólar:</label>
                         <input
                             type="number"
                             id="new-cotizacion-dolar"
                             name="Cotizacion_Dolar"
                             value={newCompraData.Cotizacion_Dolar}
                             onChange={handleNewCompraInputChange}
                             required
                             disabled={savingData || loadingEditData || deletingCompraId !== null}
                             min="0.01"
                             step="0.01"
                         />
                     </div>
                     {/* New field for Total ARS (Calculated) */}
                     <div>
                         <label htmlFor="new-total-ars">Total ARS:</label>
                         <input
                             type="text"
                             id="new-total-ars"
                             name="Total_ARS"
                             value={newCompraData.Total_ARS}
                             readOnly
                             disabled={true}
                             style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                         />
                     </div>


                    {/* Compra Items Editor for NEW purchase */}
                    <CompraItemsEditor
                         items={newCompraData.items}
                         onItemsChange={handleNewCompraItemsChange}
                         productos={productos}
                         savingData={savingData || loadingEditData || deletingCompraId !== null || productos.length === 0}
                    />
                     {productos.length === 0 && (loading || loadingEditData) && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos...</p>}
                     {productos.length === 0 && !loading && !loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles para los ítems.</p>}

                   {/* Button container for form actions */}
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                       <button type="submit" disabled={savingData || loadingEditData || deletingCompraId !== null || newCompraData.items.length === 0 || !newCompraData.Proveedor_id || newCompraData.Cotizacion_Dolar === '' || isNaN(parseFloat(newCompraData.Cotizacion_Dolar)) || parseFloat(newCompraData.Cotizacion_Dolar) <= 0}> {/* Added validation to submit button */}
                           Agregar Compra
                       </button>
                       {/* Cancel button for the add form */}
                       <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingCompraId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                           Cancelar
                       </button>
                   </div>
               </form>
          </>
      )}


      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

      {/* Display Compra List (Conditional Rendering) */}
      {!showAddForm && (
          <>
              <h3>Compras Existentes (Últimas 10)</h3>

               {/* Edit and Delete Buttons */}
               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedCompraId === null || editingCompraId !== null || loadingEditData || savingData || deletingCompraId !== null}
                   >
                       Editar Compra Seleccionada
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedCompraId === null || editingCompraId !== null || loadingEditData || savingData || deletingCompraId !== null}
                       style={{ marginLeft: '10px' }}
                   >
                       Eliminar Compra Seleccionada
                   </button>
                    {/* Button to show purchase details modal */}
                     <button
                         onClick={() => setSelectedCompraForDetail({ id: selectedCompraId })} // Set state to trigger modal
                         disabled={selectedCompraId === null || loading || loadingEditData || savingData || deletingCompraId !== null || showCompraDetailsModal}
                         style={{ marginLeft: '10px' }}
                     >
                         Ver Detalles
                     </button>
               </div>


              {loading && <p>Cargando compras...</p>}
              {loadingEditData && <p>Cargando datos de compra para editar...</p>}
              {savingData && <p>Guardando cambios de compra...</p>}
              {deletingCompraId && <p>Eliminando compra...</p>}

              {!loading && compras.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Fact Nro</th>
                      <th>Proveedor</th>
                      <th>Cuit Proveedor</th>
                      <th>Estado</th>
                      <th>Pago</th> {/* <<< NUEVA COLUMNA */}
                      <th>Total USD</th>
                      <th>Cotización Dólar</th>
                      <th>Total ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((compra) => (
                      <React.Fragment key={compra.id}>
                        <tr
                            onClick={() => handleRowClick(compra.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedCompraId === compra.id ? '#424242' : 'transparent' }}
                        >
                          {/* Format the date here */}
                          <td>{compra.Fecha ? format(new Date(compra.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                          <td>{compra.Fact_Nro}</td>
                          <td>{compra.Nombre_Proveedor}</td>
                          <td>{compra.Cuit_Proveedor}</td>
                          {/* Display Estado with conditional styling */}
                          <td style={{ backgroundColor: getEstadoColor(compra.Estado), color: '#212121', fontWeight: 'bold' }}>
                              {compra.Estado}
                          </td>
                           {/* NUEVA CELDA: Pago */}
                           <td style={{ backgroundColor: getPagoColor(compra.Pago), color: '#212121', fontWeight: 'bold' }}>
                               {compra.Pago}
                           </td>
                          <td>{compra.MontoTotal ? compra.MontoTotal.toFixed(2) : 'N/A'}</td>
                          <td>{compra.Cotizacion_Dolar ? compra.Cotizacion_Dolar.toFixed(2) : 'N/A'}</td>
                          <td>{compra.Total_ARS ? compra.Total_ARS.toFixed(2) : 'N/A'}</td>
                        </tr>
                        {editingCompraId === compra.id && !showAddForm && (
                            <tr>
                                {/* Update colSpan to match the new number of columns (9 data columns) */}
                                <td colSpan="9"> {/* Ajustado colSpan */}
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Compra (ID: {compra.id})</h4>
                                        <form onSubmit={handleSaveEdit}> {/* Added onSubmit for form */}
                                             <div>
                                                <label htmlFor={`edit-fecha-${compra.id}`}>Fecha:</label>
                                                 {/* The date input type expects YYYY-MM-DD format, so we format the fetched date for the input */}
                                                <input type="date" id={`edit-fecha-${compra.id}`} name="Fecha" value={editedCompraData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                            </div>
                                            <div>
                                                <label htmlFor={`edit-fact-nro-${compra.id}`}>Fact Nro:</label>
                                                <input type="text" id={`edit-fact-nro-${compra.id}`} name="Fact_Nro" value={editedCompraData.Fact_Nro || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-proveedor-${compra.id}`}>Proveedor:</label>
                                                <select
                                                    id={`edit-proveedor-${compra.id}`}
                                                    name="Proveedor_id"
                                                    value={editedCompraData.Proveedor_id || ''}
                                                    onChange={handleEditFormChange}
                                                    required
                                                     disabled={savingData || proveedores.length === 0}
                                                >
                                                    <option value="">Seleccione Proveedor</option>
                                                    {proveedores.map(proveedor => (
                                                        <option key={proveedor.id} value={proveedor.id}>{proveedor.Empresa}</option>
                                                    ))}
                                                </select>
                                                 {proveedores.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando proveedores...</p>}
                                                 {editedCompraData.Proveedor_id && proveedores.find(p => p.id === parseInt(editedCompraData.Proveedor_id)) && (
                                                     <div style={{marginTop: '5px', fontSize: '14px', color: '#bdbdbd'}}>
                                                        Cuit Proveedor: {proveedores.find(p => p.id === parseInt(editedCompraData.Proveedor_id)).Cuit}
                                                     </div>
                                                )}
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-estado-${compra.id}`}>Estado:</label>
                                                 <select
                                                    id={`edit-estado-${compra.id}`}
                                                    name="Estado"
                                                    value={editedCompraData.Estado || ''}
                                                    onChange={handleEditFormChange}
                                                    required
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione Estado</option>
                                                    <option value="entregado">Entregado</option>
                                                    <option value="pedido">Pedido</option>
                                                </select>
                                            </div>
                                            {/* NUEVO CAMPO DE EDICIÓN: Pago */}
                                            <div>
                                                 <label htmlFor={`edit-pago-${compra.id}`}>Pago:</label>
                                                 <select
                                                    id={`edit-pago-${compra.id}`}
                                                    name="Pago"
                                                    value={editedCompraData.Pago || ''}
                                                    onChange={handleEditFormChange}
                                                    required
                                                     disabled={savingData}
                                                 >
                                                    <option value="">Seleccione Pago</option>
                                                    <option value="abonado">Abonado</option>
                                                    <option value="deuda">Deuda</option>
                                                 </select>
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-montototal-${compra.id}`}>Monto Total (USD):</label>
                                                <input type="number" id={`edit-montototal-${compra.id}`} name="MontoTotal" value={editedCompraData.MontoTotal || ''} onChange={handleEditFormChange} disabled={savingData} step="0.01" />
                                            </div>
                                             {/* Edit field for Cotizacion Dolar */}
                                             <div>
                                                 <label htmlFor={`edit-cotizacion-dolar-${compra.id}`}>Cotización Dólar:</label>
                                                 <input
                                                     type="number"
                                                     id={`edit-cotizacion-dolar-${compra.id}`}
                                                     name="Cotizacion_Dolar"
                                                     value={editedCompraData.Cotizacion_Dolar || ''}
                                                     onChange={handleEditFormChange}
                                                     required
                                                     disabled={savingData}
                                                     min="0.01"
                                                     step="0.01"
                                                 />
                                             </div>
                                             {/* Edit field for Total ARS (Calculated) */}
                                             <div>
                                                 <label htmlFor={`edit-total-ars-${compra.id}`}>Total ARS:</label>
                                                 <input
                                                     type="text"
                                                     id={`edit-total-ars-${compra.id}`}
                                                     name="Total_ARS"
                                                     value={editedCompraData.Total_ARS || ''}
                                                     readOnly
                                                     disabled={true}
                                                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                 />
                                             </div>

                                            {/* Compra Items Editor for EDITING purchase - Displays fetched items */}
                                            {/* NOTE: Changes here in the edit form's items WILL be saved to the backend currently */}
                                             <CompraItemsEditor
                                                  items={editedCompraData.items}
                                                  onItemsChange={handleEditedCompraItemsChange}
                                                  productos={productos}
                                                  savingData={savingData || proveedores.length === 0 || productos.length === 0}
                                             />
                                             {productos.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}

                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                 {/* NOTE: Save button will save main sale details AND items currently */}
                                                 <button type="submit" disabled={savingData || !editedCompraData.Proveedor_id || editedCompraData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedCompraData.Cotizacion_Dolar)) || parseFloat(editedCompraData.Cotizacion_Dolar) <= 0}> {/* Added validation to submit button */}
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
              {!loading && compras.length === 0 && !error && <p>No hay compras registradas.</p>}
          </>
      )}

        {/* Render the Purchase Details Modal (Conditionally) */}
        {/* It will show if showCompraDetailsModal is true */}
        {showCompraDetailsModal && selectedCompraForDetail && ( // Ensure selectedCompraForDetail is not null
             <PurchaseDetailsModal
                 compraData={compraDetailsData} // Pass the fetched data
                 onClose={handleCloseCompraDetailsModal} // Function to close the modal
                 loading={loadingCompraDetails} // State for loading details
                 error={compraDetailsError} // State for error in details fetch
             />
        )}

    </div>
  );
}

export default ListaCompras;
