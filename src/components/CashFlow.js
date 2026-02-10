// src/components/CashFlow.js
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const electronAPI = window.electronAPI;

function CashFlow() {
    const [movements, setMovements] = useState([]);
    const [clients, setClients] = useState([]); // For client dropdown in manual movements and filtering
    const [providers, setProviders] = useState([]); // For provider dropdown in manual movements and filtering
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMovementId, setSelectedMovementId] = useState(null);
    const [editingMovementId, setEditingMovementId] = useState(null);

    const [newMovementData, setNewMovementData] = useState({
        Fecha: '',
        Tipo: '', // 'ingreso manual', 'egreso manual'
        Subtipo: '', // Optional: e.g., 'prestamo', 'interes', 'pago cliente/proveedor'
        Referencia: '', // Manual reference text (e.g., "Pago Cliente X", "Factura #123")
        Cliente_Proveedor_id: '', // Optional: Link to client/provider ID
        Tipo_Cliente_Proveedor: '', // Optional: 'cliente' or 'proveedor'
        Forma_Pago: '', // 'Efectivo', 'MP', 'UALA', 'ICBC'
        Descripcion_Manual: '', // Detailed description for manual entries
        Monto_Pesos: '',
        Cotizacion_Dolar: '',
        Monto_USD: '', // Calculated
        Monto_ARS: '', // Calculated
        Notas: '', // Optional notes
    });

    const [editedMovementData, setEditedMovementData] = useState({
        id: null,
        Fecha: '',
        Tipo: '',
        Subtipo: '',
        Referencia: '',
        Cliente_Proveedor_id: '',
        Tipo_Cliente_Proveedor: '',
        Forma_Pago: '',
        Descripcion_Manual: '',
        Monto_Pesos: '',
        Cotizacion_Dolar: '',
        Monto_USD: '',
        Monto_ARS: '',
        Notas: '',
    });

    const [loadingEditData, setLoadingEditData] = useState(false);
    const [savingData, setSavingData] = useState(false);
    const [deletingMovementId, setDeletingMovementId] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);

    // State variables for filters
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [filterType, setFilterType] = useState(''); // State for Type filter
    const [filterFormaPago, setFilterFormaPago] = useState(''); // State for Forma_Pago filter
    // For Client/Provider filter, combining clients and providers for a single filter dropdown
    const [filterEntityId, setFilterEntityId] = useState(''); // State for Client/Provider ID filter


    // Tipos de movimientos para el dropdown de FILTRO
    const movementTypesFilter = [
        { value: '', label: 'Todos los Tipos' }, // Option for filter
        { value: 'venta', label: 'Venta (Factura A)' },
        { value: 'ventaX', label: 'Venta X' },
        { value: 'compra', label: 'Compra' }, // Added 'compra'
        { value: 'ingreso manual', label: 'Ingreso Manual' },
        { value: 'egreso manual', label: 'Egreso Manual' },
    ];

     // Tipos de movimientos para el dropdown en el formulario de AGREGAR (solo manuales)
     const manualMovementTypesAdd = [
         { value: '', label: 'Seleccione Tipo' },
         { value: 'ingreso manual', label: 'Ingreso Manual' },
         { value: 'egreso manual', label: 'Egreso Manual' },
     ];

     // Subtipos sugeridos para movimientos manuales
     const manualSubtypes = {
         'ingreso manual': ['Pago Cliente', 'Prestamo Recibido', 'Intereses Cobrados', 'Reintegro', 'Varios Ingresos'],
         'egreso manual': ['Pago Proveedor', 'Salario', 'Alquiler', 'Servicios', 'Impuestos', 'Prestamo Otorgado', 'Intereses Pagados', 'Varios Egresos'],
     };

     // Formas de pago para el dropdown de FILTRO y formulario Add
    const paymentMethods = [
        'Efectivo',
        'MP',
        'UALA',
        'ICBC',
        'Transferencia Bancaria',
        'Cheque',
        'Otro',
    ];
     const filterPaymentMethods = [{ value: '', label: 'Todas las Formas' }, ...paymentMethods.map(method => ({ value: method, label: method }))];

     // Combined list of clients and providers for the filter dropdown
     const filterEntities = [
         { value: '', label: 'Todos los Clientes/Proveedores' },
         ...clients.map(client => ({ value: `c-${client.id}`, label: `Cliente: ${client.Empresa}` })), // Prefix with 'c-' for client
         ...providers.map(provider => ({ value: `p-${provider.id}`, label: `Proveedor: ${provider.Empresa}` })), // Prefix with 'p-' for provider
     ];


    // NUEVO: Función async para obtener movimientos de CashFlow con filtros
    const fetchMovements = async (filters = {}) => { // Make async
        console.log('[CashFlow] Fetching cash flow movements with filters:', filters);
        setLoading(true);
        setError(null);
        setSelectedMovementId(null);
        setEditingMovementId(null);
        setEditedMovementData({
             id: null, Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
        });

        // Prepare filters object to send to backend
        const currentFilters = {
            startDate: filters.startDate, // Already formatted date string or null
            endDate: filters.endDate,     // Already formatted date string or null
            type: filterType || null,
            formaPago: filterFormaPago || null,
            // Pass the combined entity filter value
             clientProviderId: filterEntityId || null, // Use filterEntityId
        };

        try {
            // Usar await con la nueva función API
             const movementsData = await electronAPI.getCashFlowMovements(currentFilters); // Use camelCase channel name
             console.log('Cash Flow movements loaded:', movementsData.length, 'items');
             // MODIFICACIÓN: Forzar una nueva referencia al array para asegurar la actualización de estado
             setMovements([...movementsData]); // <-- Usar spread operator para crear una nueva referencia
        } catch (err) {
            console.error('Error fetching cash flow movements:', err);
            setError(err.message || 'Error al cargar los movimientos de CashFlow.');
            setMovements([]); // Clear the list on error
        } finally {
            setLoading(false); // Always set loading to false
            console.log('[CashFlow] Data loading finished.');
        }
    };

    // NUEVO: Función async para obtener clientes y proveedores
    const fetchClientsAndProviders = async () => {
         try {
             const clientsData = await electronAPI.getClients(); // Reuse existing channel
             console.log('[CashFlow] Clients loaded:', clientsData.length);
             setClients(clientsData);
         } catch (err) {
             console.error('[CashFlow] Error fetching clients:', err);
             // Decide how to handle
         }

         try {
             const providersData = await electronAPI.getProveedores(); // Reuse existing channel
              console.log('[CashFlow] Providers loaded:', providersData.length);
             setProviders(providersData);
         } catch (err) {
             console.error('[CashFlow] Error fetching providers:', err);
             // Decide how to handle
         }
    };

    // Effect to load initial data (movements, clients, providers)
    useEffect(() => {
        // Llamar a las funciones async para cargar datos
        fetchMovements({}); // Fetch initial movements with default filters
        fetchClientsAndProviders(); // Fetch clients and providers

        // Limpiar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        return () => {
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, []); // Empty dependency array: run only once on mount

    // Effect to refetch movements when ANY filter changes
    useEffect(() => {
        console.log('[CashFlow] Filter state changed, refetching movements.');
        const formattedStartDate = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
        const formattedEndDate = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null;

         // Call fetchMovements with ALL current filter states
        fetchMovements({
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            type: filterType,
            formaPago: filterFormaPago,
            clientProviderId: filterEntityId, // Use filterEntityId
        });

         // Limpiar listeners IPC que ya no se usan (si aún existieran por error en preload)
        return () => {
             console.log('[CashFlow] Cleaning up filter effect listeners.');
              // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, [filterStartDate, filterEndDate, filterType, filterFormaPago, filterEntityId]); // Dependencies: ALL filter states


     // Handlers for predetermined date filters
     const setFilterToday = () => {
         const today = new Date();
         setFilterStartDate(startOfDay(today));
         setFilterEndDate(endOfDay(today));
     };

     const setFilterThisWeek = () => {
         const today = new Date();
         setFilterStartDate(startOfWeek(today));
         setFilterEndDate(endOfWeek(today));
     };

     const setFilterThisMonth = () => {
         const today = new Date();
         setFilterStartDate(startOfMonth(today));
         setFilterEndDate(endOfMonth(today));
     };

     const clearFilters = () => {
         setFilterStartDate(null);
         setFilterEndDate(null);
         setFilterType(''); // Clear type filter
         setFilterFormaPago(''); // Clear payment method filter
         setFilterEntityId(''); // Clear entity filter
     };


    // --- Add Manual Movement Functionality ---

    // Handle input change for New Manual Movement form
    const handleNewMovementInputChange = (e) => {
        const { name, value } = e.target;
        let updatedNewMovementData = { ...newMovementData, [name]: value };

        // Handle type-specific logic or calculations
        if (name === 'Monto_Pesos' || name === 'Cotizacion_Dolar') {
            const montoPesos = parseFloat(updatedNewMovementData.Monto_Pesos);
            const cotizacion = parseFloat(updatedNewMovementData.Cotizacion_Dolar);
            if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) {
                updatedNewMovementData.Monto_USD = (montoPesos / cotizacion).toFixed(2);
            } else {
                updatedNewMovementData.Monto_USD = '';
            }
             // Calculate Monto_ARS when Monto_Pesos or Cotizacion changes
            if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) { // Check for valid numbers and non-zero cotizacion
                 updatedNewMovementData.Monto_ARS = (montoPesos).toFixed(2); // Monto_ARS is just Monto_Pesos here
             } else {
                 updatedNewMovementData.Monto_ARS = '';
             }

        } else if (name === 'Monto_USD' || name === 'Cotizacion_Dolar') {
             const montoUSD = parseFloat(updatedNewMovementData.Monto_USD);
             const cotizacion = parseFloat(updatedNewMovementData.Cotizacion_Dolar);
             if (!isNaN(montoUSD) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedNewMovementData.Monto_Pesos = (montoUSD * cotizacion).toFixed(2);
             } else {
                 updatedNewMovementData.Monto_Pesos = '';
             }
             // Calculate Monto_ARS when Monto_USD or Cotizacion changes
              if (!isNaN(montoUSD) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedNewMovementData.Monto_ARS = (montoUSD * cotizacion).toFixed(2); // Calculate Monto_ARS from USD
              } else {
                 updatedNewMovementData.Monto_ARS = '';
              }
        }

        // If changing Tipo, reset Subtipo and related entity fields
        if (name === 'Tipo') {
            updatedNewMovementData.Subtipo = '';
            updatedNewMovementData.Cliente_Proveedor_id = '';
            updatedNewMovementData.Tipo_Cliente_Proveedor = '';
        }
         // If changing Tipo_Cliente_Proveedor, reset the ID
         if (name === 'Tipo_Cliente_Proveedor') {
             updatedNewMovementData.Cliente_Proveedor_id = '';
         }


        setNewMovementData(updatedNewMovementData);
    };

     // Handle submission of the New Manual Movement form
    const handleAddManualMovementSubmit = async (e) => { // Make async
        e.preventDefault();
        setSavingData(true);
        setError(null);

        // Basic validation for required fields
        if (!newMovementData.Fecha || !newMovementData.Tipo || !newMovementData.Forma_Pago || newMovementData.Monto_Pesos === '' || isNaN(parseFloat(newMovementData.Monto_Pesos)) || parseFloat(newMovementData.Monto_Pesos) < 0 || newMovementData.Cotizacion_Dolar === '' || isNaN(parseFloat(newMovementData.Cotizacion_Dolar)) || parseFloat(newMovementData.Cotizacion_Dolar) <= 0 || newMovementData.Monto_ARS === '' || isNaN(parseFloat(newMovementData.Monto_ARS)) || parseFloat(newMovementData.Monto_ARS) < 0) {
            setError('Fecha, Tipo, Forma de Pago, Monto Pesos (>=0), Cotización Dólar (>0) y Monto ARS (>=0) son campos obligatorios.');
            setSavingData(false);
            return;
        }

        // Additional validation based on Tipo if needed (e.g., require Subtipo for some types)
        // Prepare data to send to backend (ensure numbers are parsed)
        const dataToSend = {
            ...newMovementData,
            Monto_Pesos: parseFloat(newMovementData.Monto_Pesos),
            Cotizacion_Dolar: parseFloat(newMovementData.Cotizacion_Dolar),
            Monto_USD: parseFloat(newMovementData.Monto_USD) || 0,
            Monto_ARS: parseFloat(newMovementData.Monto_ARS) || 0,
            // Parse Cliente_Proveedor_id if it exists
            Cliente_Proveedor_id: newMovementData.Cliente_Proveedor_id ? parseInt(newMovementData.Cliente_Proveedor_id, 10) : null,
        };

        try {
            // Usar await con la nueva función API
            await electronAPI.addManualCashflowMovement(dataToSend); // Use camelCase channel name
            console.log('Manual movement added successfully.');

            // Reset form and hide it
            setNewMovementData({
                Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
            });
            setShowAddForm(false);
             // Refetch list with current filters after adding a movement
            const formattedStartDate = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
            const formattedEndDate = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null;
            fetchMovements({
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                type: filterType,
                formaPago: filterFormaPago,
                clientProviderId: filterEntityId,
            });

        } catch (err) {
            console.error('Error adding manual movement:', err);
            setError(err.message || `Error al agregar el movimiento: ${err.message}`);
        } finally {
            setSavingData(false);
        }
    };

    // --- Edit Manual Movement Functionality ---

    // Handle click on Edit button
    const handleEditClick = async () => { // Make async
         if (selectedMovementId === null) return;

         // Find the selected movement to check its type
         const movementToEdit = movements.find(mov => mov.id === selectedMovementId);

         // Only allow editing manual movements for now
         if (!movementToEdit || (movementToEdit.Tipo !== 'ingreso manual' && movementToEdit.Tipo !== 'egreso manual')) {
             setError('Solo se pueden editar movimientos manuales directamente.');
             return;
         }


         setEditingMovementId(selectedMovementId);
         setLoadingEditData(true);
         setError(null);

         try {
            // Usar await con la nueva función API
            const movementData = await electronAPI.getCashFlowMovementById(selectedMovementId); // Use camelCase channel name
             console.log(`Movement ID ${selectedMovementId} data loaded:`, movementData);
             // Populate editedMovementData, ensuring numerical fields are converted to string for inputs
             setEditedMovementData({
                 id: movementData.id,
                 Fecha: movementData.Fecha || '',
                 Tipo: movementData.Tipo || '',
                 Subtipo: movementData.Subtipo || '',
                 Referencia: movementData.Referencia || '',
                 Cliente_Proveedor_id: movementData.Cliente_Proveedor_id || '', // Keep ID for dropdown
                 Tipo_Cliente_Proveedor: movementData.Tipo_Cliente_Proveedor || '',
                 Forma_Pago: movementData.Forma_Pago || '',
                 Descripcion_Manual: movementData.Descripcion_Manual || '',
                 Monto_Pesos: movementData.Monto_Pesos !== null ? String(movementData.Monto_Pesos) : '',
                 Cotizacion_Dolar: movementData.Cotizacion_Dolar !== null ? String(movementData.Cotizacion_Dolar) : '',
                 Monto_USD: movementData.Monto_USD !== null ? String(movementData.Monto_USD) : '',
                 Monto_ARS: movementData.Monto_ARS !== null ? String(movementData.Monto_ARS) : '',
                 Notas: movementData.Notas || '',
             });
         } catch (err) {
             console.error(`Error fetching movement by ID ${selectedMovementId}:`, err);
             setError(err.message || `Error al cargar los datos del movimiento: ${err.message}`);
             setEditingMovementId(null);
             setSelectedMovementId(null);
              setEditedMovementData({
                  id: null, Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
              });
         } finally {
             setLoadingEditData(false);
         }
     };

    // Handle change in the Edit form
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        let updatedEditedMovementData = { ...editedMovementData, [name]: value };

        // Handle type-specific logic or calculations
        if (name === 'Monto_Pesos' || name === 'Cotizacion_Dolar') {
            const montoPesos = parseFloat(updatedEditedMovementData.Monto_Pesos);
            const cotizacion = parseFloat(updatedEditedMovementData.Cotizacion_Dolar);
            if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) {
                updatedEditedMovementData.Monto_USD = (montoPesos / cotizacion).toFixed(2);
            } else {
                updatedEditedMovementData.Monto_USD = '';
            }
             // Calculate Monto_ARS when Monto_Pesos or Cotizacion changes
             if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedEditedMovementData.Monto_ARS = (montoPesos).toFixed(2); // Monto_ARS is just Monto_Pesos here
             } else {
                 updatedEditedMovementData.Monto_ARS = '';
             }

        } else if (name === 'Monto_USD' || name === 'Cotizacion_Dolar') {
             const montoUSD = parseFloat(updatedEditedMovementData.Monto_USD);
             const cotizacion = parseFloat(updatedEditedMovementData.Cotizacion_Dolar);
             if (!isNaN(montoUSD) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedEditedMovementData.Monto_Pesos = (montoUSD * cotizacion).toFixed(2);
             } else {
                 updatedEditedMovementData.Monto_Pesos = '';
             }
             // Calculate Monto_ARS when Monto_USD or Cotizacion changes
              if (!isNaN(montoUSD) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedEditedMovementData.Monto_ARS = (montoUSD * cotizacion).toFixed(2); // Calculate Monto_ARS from USD
              } else {
                 updatedEditedMovementData.Monto_ARS = '';
              }
        }

         // If changing Tipo_Cliente_Proveedor, reset the ID
         if (name === 'Tipo_Cliente_Proveedor') {
             updatedEditedMovementData.Cliente_Proveedor_id = '';
         }


        setEditedMovementData(updatedEditedMovementData);
    };


    // Handle saving the edited manual movement
    const handleSaveEdit = async (e) => { // Make async
        e.preventDefault();
        setSavingData(true);
        setError(null);

         // Basic validation for required fields (similar to add)
         if (!editedMovementData.Fecha || !editedMovementData.Tipo || !editedMovementData.Forma_Pago || editedMovementData.Monto_Pesos === '' || isNaN(parseFloat(editedMovementData.Monto_Pesos)) || parseFloat(editedMovementData.Monto_Pesos) < 0 || editedMovementData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedMovementData.Cotizacion_Dolar)) || parseFloat(editedMovementData.Cotizacion_Dolar) <= 0 || editedMovementData.Monto_ARS === '' || isNaN(parseFloat(editedMovementData.Monto_ARS)) || parseFloat(editedMovementData.Monto_ARS) < 0) {
             setError('Fecha, Tipo, Forma de Pago, Monto Pesos (>=0), Cotización Dólar (>0) y Monto ARS (>=0) son campos obligatorios.');
             setSavingData(false);
             return;
         }

         // Ensure type is still manual before sending for update
         if (editedMovementData.Tipo !== 'ingreso manual' && editedMovementData.Tipo !== 'egreso manual') {
              setError('Error interno: Intento de actualizar un tipo de movimiento no manual.');
              setSavingData(false);
              return;
         }


        // Prepare data to send to backend
         const dataToSend = {
            ...editedMovementData,
            Monto_Pesos: parseFloat(editedMovementData.Monto_Pesos),
            Cotizacion_Dolar: parseFloat(editedMovementData.Cotizacion_Dolar),
            Monto_USD: parseFloat(editedMovementData.Monto_USD) || 0,
            Monto_ARS: parseFloat(editedMovementData.Monto_ARS) || 0,
             Cliente_Proveedor_id: editedMovementData.Cliente_Proveedor_id ? parseInt(editedMovementData.Cliente_Proveedor_id, 10) : null,
         };


        try {
            // Usar await con la nueva función API
             await electronAPI.updateManualCashflowMovement(dataToSend.id, dataToSend); // Use camelCase channel name
             console.log('Movement updated successfully.');

             setEditingMovementId(null); // Close edit form
              setEditedMovementData({
                  id: null, Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
              });
             setSelectedMovementId(null); // Deselect
              // Refetch list with current filters after saving
             const formattedStartDate = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
             const formattedEndDate = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null;
              fetchMovements({
                 startDate: formattedStartDate,
                 endDate: formattedEndDate,
                 type: filterType,
                 formaPago: filterFormaPago,
                 clientProviderId: filterEntityId,
             });

        } catch (err) {
            console.error('Error updating movement:', err);
            setError(err.message || `Error al actualizar el movimiento: ${err.message}`);
        } finally {
            setSavingData(false);
        }
    };

    // Handle cancel editing
    const handleCancelEdit = () => {
        setEditingMovementId(null);
         setEditedMovementData({
             id: null, Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
         });
        setError(null);
    };


    // --- Delete Movement Functionality ---
    const handleDeleteClick = async () => { // Make async
        if (selectedMovementId === null) return;

         // Optional: Check if the movement is manual before confirming deletion via UI button
         const movementToDelete = movements.find(mov => mov.id === selectedMovementId);
          if (!movementToDelete || (movementToDelete.Tipo !== 'ingreso manual' && movementToDelete.Tipo !== 'egreso manual')) {
              setError('Solo se pueden eliminar movimientos manuales directamente.');
              return;
          }


        if (window.confirm(`¿Está seguro de eliminar el movimiento con ID ${selectedMovementId}?`)) {
            setDeletingMovementId(selectedMovementId);
            setError(null);

            try {
                // Usar await con la nueva función API
                 await electronAPI.deleteCashflowMovement(selectedMovementId); // Use camelCase channel name
                 console.log(`Movement with ID ${selectedMovementId} deleted successfully.`);
                 setSelectedMovementId(null); // Deselect
                  // Refetch list with current filters after deleting
                 const formattedStartDate = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
                 const formattedEndDate = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null;
                 fetchMovements({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: filterType,
                    formaPago: filterFormaPago,
                    clientProviderId: filterEntityId,
                });
            } catch (err) {
                console.error(`Error deleting movement with ID ${selectedMovementId}:`, err);
                setError(err.message || `Error al eliminar el movimiento: ${err.message}`);
            } finally {
                setDeletingMovementId(null);
            }
        }
    };


    // Helper function to get display text for movement Type
    const getMovementTypeDisplayText = (type) => {
        switch (type) {
            case 'venta': return 'Venta (Factura A)';
            case 'ventaX': return 'Venta X';
            case 'compra': return 'Compra';
            case 'ingreso manual': return 'Ingreso Manual';
            case 'egreso manual': return 'Egreso Manual';
            default: return type;
        }
    };

    // Helper function to determine if a movement type is income or expense for display styling
    const isIncomeMovement = (type) => ['venta', 'ventaX', 'ingreso manual'].includes(type);


    // Function to show the add form
    const handleNewMovementClick = () => {
        setShowAddForm(true);
        setError(null);
         // Reset new form data
         setNewMovementData({
             Fecha: '', Tipo: '', Subtipo: '', Referencia: '', Cliente_Proveedor_id: '', Tipo_Cliente_Proveedor: '', Forma_Pago: '', Descripcion_Manual: '', Monto_Pesos: '', Cotizacion_Dolar: '', Monto_USD: '', Monto_ARS: '', Notas: ''
         });
        setSelectedMovementId(null); // Deselect any selected row
        setEditingMovementId(null); // Close edit form if open
         // Re-fetch clients and providers just in case for the dropdowns
         fetchClientsAndProviders();
    };

    // Function to cancel adding a movement
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
    };

    // Calculate totals for the displayed movements
    const totalIncomeUSD = movements
        .filter(mov => isIncomeMovement(mov.Tipo))
        .reduce((sum, mov) => sum + (mov.Monto_USD || 0), 0);

     const totalExpenseUSD = movements
        .filter(mov => !isIncomeMovement(mov.Tipo)) // Movements that are NOT income (i.e., 'compra' and 'egreso manual') are considered expenses
        .reduce((sum, mov) => sum + (mov.Monto_USD || 0), 0);

    const netFlowUSD = totalIncomeUSD - totalExpenseUSD;

    const totalIncomeARS = movements
        .filter(mov => isIncomeMovement(mov.Tipo))
        .reduce((sum, mov) => sum + (mov.Monto_ARS || 0), 0);

     const totalExpenseARS = movements
         .filter(mov => !isIncomeMovement(mov.Tipo)) // Movements that are NOT income
         .reduce((sum, mov) => sum + (mov.Monto_ARS || 0), 0);

     const netFlowARS = totalIncomeARS - totalExpenseARS;


    // Render nothing while loading initially or if no data after loading
     if (loading && movements.length === 0 && !error && !filterStartDate && !filterEndDate && !filterType && !filterFormaPago && !filterEntityId) {
          return <p>Cargando movimientos de CashFlow...</p>;
     }


    return (
        <div className="container">
            <h2>CashFlow</h2>

            {/* Button to show the add form */}
            {!showAddForm && (
                <button onClick={handleNewMovementClick} disabled={loading || loadingEditData || savingData || deletingMovementId !== null}>
                    Nuevo Movimiento Manual
                </button>
            )}

             {/* Form to Add New Manual Movement (Conditional Rendering) */}
             {showAddForm && (
                 <>
                     <h3>Agregar Nuevo Movimiento Manual</h3>
                     <form onSubmit={handleAddManualMovementSubmit}>
                         <div>
                             <label htmlFor="new-fecha">Fecha:</label>
                             <input type="date" id="new-fecha" name="Fecha" value={newMovementData.Fecha} onChange={handleNewMovementInputChange} required disabled={savingData} />
                         </div>
                         <div>
                             <label htmlFor="new-tipo-movimiento">Tipo de Movimiento:</label>
                             <select id="new-tipo-movimiento" name="Tipo" value={newMovementData.Tipo} onChange={handleNewMovementInputChange} required disabled={savingData}>
                                 {/* Usamos el array específico para el formulario de agregar (solo manuales) */}
                                 {manualMovementTypesAdd.map(type => (
                                     <option key={type.value} value={type.value}>{type.label}</option>
                                 ))}
                             </select>
                         </div>

                          {/* Optional Subtipo based on Tipo */}
                          {newMovementData.Tipo && manualSubtypes[newMovementData.Tipo] && manualSubtypes[newMovementData.Tipo].length > 0 && (
                              <div>
                                  <label htmlFor="new-subtipo-movimiento">Subtipo:</label>
                                  <select id="new-subtipo-movimiento" name="Subtipo" value={newMovementData.Subtipo} onChange={handleNewMovementInputChange} disabled={savingData}>
                                       <option value="">Seleccione Subtipo (Opcional)</option>
                                       {manualSubtypes[newMovementData.Tipo].map(subtype => (
                                           <option key={subtype} value={subtype}>{subtype}</option>
                                       ))}
                                   </select>
                               </div>
                          )}
                           {/* Allow manual subtipo entry if no predefined options */}
                            {newMovementData.Tipo && (!manualSubtypes[newMovementData.Tipo] || manualSubtypes[newMovementData.Tipo].length === 0) && (
                                 <div>
                                     <label htmlFor="new-subtipo-manual">Subtipo:</label>
                                     <input
                                         type="text"
                                         id="new-subtipo-manual"
                                         name="Subtipo"
                                         value={newMovementData.Subtipo}
                                         onChange={handleNewMovementInputChange}
                                         disabled={savingData}
                                         placeholder="Ej: Pago Cliente Nuevo"
                                     />
                                 </div>
                            )}


                          {/* Reference Field (can be text for manual entries) */}
                           <div>
                               <label htmlFor="new-referencia">Referencia:</label>
                                <input
                                   type="text"
                                   id="new-referencia"
                                   name="Referencia"
                                   value={newMovementData.Referencia}
                                   onChange={handleNewMovementInputChange}
                                   disabled={savingData}
                                   placeholder="Ej: Factura 123, Transferencia MP"
                                />
                           </div>

                           {/* Related Entity (Client/Provider) dropdowns */}
                           {(newMovementData.Tipo === 'ingreso manual' || newMovementData.Tipo === 'egreso manual') && (clients.length > 0 || providers.length > 0) && ( // Only show if there are clients or providers to select
                                <>
                                     <div>
                                         <label htmlFor="new-tipo-entity">Relacionado con:</label>
                                         <select id="new-tipo-entity" name="Tipo_Cliente_Proveedor" value={newMovementData.Tipo_Cliente_Proveedor} onChange={handleNewMovementInputChange} disabled={savingData}>
                                             <option value="">Ninguno</option>
                                              {/* Only show relevant type options based on movement type heuristic */}
                                             {(newMovementData.Tipo === 'ingreso manual' && clients.length > 0) && <option value="cliente">Cliente</option>}
                                              {(newMovementData.Tipo === 'egreso manual' && providers.length > 0) && <option value="proveedor">Proveedor</option>}
                                               {/* Allow both for flexibility if needed later */}
                                             {/* {(clients.length > 0 || providers.length > 0) && <option value="cliente">Cliente</option>}
                                             {(clients.length > 0 || providers.length > 0) && <option value="proveedor">Proveedor</option>} */}
                                         </select>
                                     </div>

                                     {newMovementData.Tipo_Cliente_Proveedor === 'cliente' && clients.length > 0 && (
                                         <div>
                                             <label htmlFor="new-cliente-id">Seleccionar Cliente:</label>
                                              <select id="new-cliente-id" name="Cliente_Proveedor_id" value={newMovementData.Cliente_Proveedor_id} onChange={handleNewMovementInputChange} disabled={savingData}>
                                                 <option value="">Seleccione Cliente</option>
                                                 {clients.map(client => (
                                                     <option key={client.id} value={client.id}>{client.Empresa}</option>
                                                 ))}
                                             </select>
                                         </div>
                                     )}
                                     {newMovementData.Tipo_Cliente_Proveedor === 'proveedor' && providers.length > 0 && (
                                         <div>
                                             <label htmlFor="new-proveedor-id">Seleccionar Proveedor:</label>
                                              <select id="new-proveedor-id" name="Cliente_Proveedor_id" value={newMovementData.Cliente_Proveedor_id} onChange={handleNewMovementInputChange} disabled={savingData}>
                                                  <option value="">Seleccione Proveedor</option>
                                                  {providers.map(provider => (
                                                      <option key={provider.id} value={provider.id}>{provider.Empresa}</option>
                                                  ))}
                                              </select>
                                         </div>
                                     )}
                                </>
                           )}


                         <div>
                             <label htmlFor="new-forma-pago">Forma de Pago:</label>
                             <select id="new-forma-pago" name="Forma_Pago" value={newMovementData.Forma_Pago} onChange={handleNewMovementInputChange} required disabled={savingData}>
                                 <option value="">Seleccione Forma de Pago</option>
                                 {paymentMethods.map(method => (
                                     <option key={method} value={method}>{method}</option>
                                 ))}
                             </select>
                         </div>

                         <div>
                             <label htmlFor="new-monto-pesos">Monto Pesos:</label>
                             <input type="number" id="new-monto-pesos" name="Monto_Pesos" value={newMovementData.Monto_Pesos} onChange={handleNewMovementInputChange} required disabled={savingData} min="0" step="0.01" />
                         </div>
                         <div>
                             <label htmlFor="new-cotizacion-dolar">Cotización Dólar:</label>
                             <input type="number" id="new-cotizacion-dolar" name="Cotizacion_Dolar" value={newMovementData.Cotizacion_Dolar} onChange={handleNewMovementInputChange} required disabled={savingData} min="0.01" step="0.01" />
                         </div>
                         <div>
                             <label htmlFor="new-monto-dolares">Monto Dólares:</label>
                             {/* Este campo es de solo lectura */}
                             <input type="text" id="new-monto-dolares" name="Monto_USD" value={newMovementData.Monto_USD} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                         </div>
                         {/* Asegurarse de mostrar Monto ARS también en el formulario de agregar */}
                          <div>
                              <label htmlFor="new-monto-ars">Monto ARS:</label>
                              <input
                                  type="text"
                                  id="new-monto-ars"
                                  name="Monto_ARS"
                                  value={newMovementData.Monto_ARS}
                                  readOnly
                                  disabled={true}
                                  style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                              />
                          </div>
                          <div>
                              <label htmlFor="new-descripcion-manual">Descripción Detallada:</label>
                              <textarea id="new-descripcion-manual" name="Descripcion_Manual" value={newMovementData.Descripcion_Manual} onChange={handleNewMovementInputChange} disabled={savingData} rows="3"></textarea>
                          </div>
                           <div>
                               <label htmlFor="new-notas">Notas:</label>
                               <textarea id="new-notas" name="Notas" value={newMovementData.Notas} onChange={handleNewMovementInputChange} disabled={savingData} rows="2"></textarea>
                           </div>


                         <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                             <button type="submit" disabled={savingData}>Agregar Movimiento</button>
                             <button type="button" onClick={handleCancelAdd} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                                 Cancelar
                             </button>
                         </div>
                     </form>
                 </>
             )}

            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

             {/* Display CashFlow Movements */}
             {!showAddForm && (
                 <>
                    <h3>Movimientos de CashFlow</h3>

                     {/* Controles de filtro */}
                     <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                          <h4>Filtros</h4>
                         <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
                             {/* Date Filters */}
                             <div>
                                  <label htmlFor="filterStartDate">Fecha Desde:</label>
                                  <DatePicker
                                      id="filterStartDate"
                                      selected={filterStartDate}
                                      onChange={(date) => setFilterStartDate(date)}
                                      dateFormat="dd/MM/yyyy"
                                      isClearable
                                      placeholderText="Inicio"
                                      className="date-picker-input"
                                      disabled={loading}
                                  />
                              </div>
                              <div>
                                  <label htmlFor="filterEndDate">Fecha Hasta:</label>
                                   <DatePicker
                                      id="filterEndDate"
                                      selected={filterEndDate}
                                      onChange={(date) => setFilterEndDate(date)}
                                      dateFormat="dd/MM/yyyy"
                                      isClearable
                                      placeholderText="Fin"
                                      className="date-picker-input"
                                       disabled={loading}
                                  />
                              </div>
                              {/* Predetermined Date Filter Buttons */}
                               <button onClick={setFilterToday} disabled={loading}>Hoy</button>
                               <button onClick={setFilterThisWeek} disabled={loading}>Esta Semana</button>
                               <button onClick={setFilterThisMonth} disabled={loading}>Este Mes</button>

                              {/* Type Filter */}
                              <div>
                                  <label htmlFor="filterType">Tipo:</label>
                                  <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} disabled={loading}>
                                       {/* Usamos el array específico para el filtro */}
                                       {movementTypesFilter.map(type => (
                                           <option key={type.value} value={type.value}>{type.label}</option>
                                       ))}
                                   </select>
                               </div>

                              {/* Forma de Pago Filter */}
                              <div>
                                  <label htmlFor="filterFormaPago">Forma de Pago:</label>
                                  <select id="filterFormaPago" value={filterFormaPago} onChange={(e) => setFilterFormaPago(e.target.value)} disabled={loading}>
                                      {filterPaymentMethods.map(method => (
                                          <option key={method.value} value={method.value}>{method.label}</option>
                                      ))}
                                  </select>
                              </div>

                               {/* Client/Provider Filter (Combined dropdown) */}
                                {(clients.length > 0 || providers.length > 0) && (
                                    <div>
                                        <label htmlFor="filterEntity">Cliente/Proveedor:</label>
                                        <select id="filterEntity" value={filterEntityId} onChange={(e) => setFilterEntityId(e.target.value)} disabled={loading}>
                                            {/* Usamos el array combinado de entidades */}
                                            {filterEntities.map(entity => (
                                                 <option key={entity.value} value={entity.value}>{entity.label}</option>
                                            ))}
                                        </select>
                                    </div>
                               )}
                               {/* Clear Filters Button */}
                                <button onClick={clearFilters} disabled={loading || (!filterStartDate && !filterEndDate && !filterType && !filterFormaPago && !filterEntityId)}>Limpiar Filtros</button>

                          </div>
                     </div>

                    {/* Summary Section */}
                     <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                          <h4>Resumen del Período (Filtrado)</h4>
                          <p><strong>Ingresos Totales (USD):</strong> <span style={{ color: '#81c784' }}>{totalIncomeUSD.toFixed(2)}</span></p>
                          <p><strong>Egresos Totales (USD):</strong> <span style={{ color: '#e57373' }}>{totalExpenseUSD.toFixed(2)}</span></p>
                          <p><strong>Flujo Neto (USD):</strong> <span style={{ color: netFlowUSD >= 0 ? '#81c784' : '#e57373' }}>{netFlowUSD.toFixed(2)}</span></p>
                           <br/>
                           <p><strong>Ingresos Totales (ARS):</strong> <span style={{ color: '#81c784' }}>{totalIncomeARS.toFixed(2)}</span></p>
                           <p><strong>Egresos Totales (ARS):</strong> <span style={{ color: '#e57373' }}>{totalExpenseARS.toFixed(2)}</span></p>
                           <p><strong>Flujo Neto (ARS):</strong> <span style={{ color: netFlowARS >= 0 ? '#81c784' : '#e57373' }}>{netFlowARS.toFixed(2)}</span></p>

                     </div>


                     {/* Edit and Delete Buttons for Manual Movements */}
                    <div style={{ margin: '20px 0' }}>
                        <button
                            onClick={handleEditClick}
                            // Deshabilitar si no es un movimiento manual o si no hay selección
                            disabled={selectedMovementId === null || loadingEditData || savingData || deletingMovementId !== null || (movements.find(mov => mov.id === selectedMovementId)?.Tipo !== 'ingreso manual' && movements.find(mov => mov.id === selectedMovementId)?.Tipo !== 'egreso manual')}
                        >
                            Editar Movimiento Seleccionado
                        </button>
                        <button
                            onClick={handleDeleteClick}
                             // Deshabilitar si no es un movimiento manual o si no hay selección
                            disabled={selectedMovementId === null || loadingEditData || savingData || deletingMovementId !== null || (movements.find(mov => mov.id === selectedMovementId)?.Tipo !== 'ingreso manual' && movements.find(mov => mov.id === selectedMovementId)?.Tipo !== 'egreso manual')}
                            style={{ marginLeft: '10px' }}
                        >
                            Eliminar Movimiento Seleccionado
                        </button>
                    </div>


                     {loading && <p>Cargando movimientos...</p>}
                     {loadingEditData && <p>Cargando datos del movimiento para editar...</p>}
                     {savingData && <p>Guardando cambios...</p>}
                     {deletingMovementId && <p>Eliminando movimiento...</p>}

                     {!loading && movements.length > 0 ? (
                         <table>
                             <thead>
                                 <tr>
                                     <th>Fecha</th>
                                     <th>Tipo</th>
                                      <th>Subtipo</th>
                                     <th>Referencia</th>
                                     <th>Cliente/Proveedor</th>
                                     <th>Forma de Pago</th>
                                     <th>Monto USD</th>
                                     <th>Monto ARS</th>
                                     <th>Cotiz. Dólar</th>
                                      {/* Removed Acciones from header, actions are now buttons above */}
                                 </tr>
                             </thead>
                             <tbody>
                                 {movements.map((movement) => (
                                     <React.Fragment key={`${movement.Tipo}-${movement.id}`}> {/* Use a compound key for safety */}
                                         <tr
                                             onClick={() => handleRowClick(movement.id)}
                                             style={{
                                                 cursor: (movement.Tipo === 'ingreso manual' || movement.Tipo === 'egreso manual') ? 'pointer' : 'default', // Only show pointer for editable rows
                                                 backgroundColor: selectedMovementId === movement.id ? '#424242' : 'transparent',
                                                  color: isIncomeMovement(movement.Tipo) ? '#81c784' : '#e57373', // Green for income, Red for expense
                                                  fontWeight: isIncomeMovement(movement.Tipo) ? 'bold' : 'normal', // Bold for income
                                             }}
                                             title={movement.Descripcion_Detalle || movement.Notas ? `${movement.Descripcion_Detalle ? 'Detalle: ' + movement.Descripcion_Detalle : ''}${movement.Notas ? (movement.Descripcion_Detalle ? '\nNotas: ' : 'Notas: ') + movement.Notas : ''}` : ''} // Show details/notes on hover
                                         >
                                             {/* MODIFICACIÓN: Aplicar formato de fecha */}
                                             <td>{movement.Fecha ? format(new Date(movement.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                             <td>{getMovementTypeDisplayText(movement.Tipo)}</td>
                                              <td>{movement.Subtipo || 'N/A'}</td>
                                             <td>{movement.Referencia || 'N/A'}</td>
                                              <td>{movement.Nombre_Cliente_Proveedor || 'N/A'}</td>
                                             <td>{movement.Forma_Pago || 'N/A'}</td>
                                             <td>{movement.Monto_USD !== null ? movement.Monto_USD.toFixed(2) : 'N/A'}</td>
                                             <td>{movement.Monto_ARS !== null ? movement.Monto_ARS.toFixed(2) : 'N/A'}</td>
                                             <td>{movement.Cotizacion_Dolar !== null ? movement.Cotizacion_Dolar.toFixed(2) : 'N/A'}</td>
                                         </tr>

                                         {/* Inline Edit Form Row - Only show if THIS movement is being edited and is manual */}
                                         {editingMovementId === movement.id && !showAddForm && (movement.Tipo === 'ingreso manual' || movement.Tipo === 'egreso manual') && (
                                             <tr>
                                                 <td colSpan="9"> {/* Adjusted colSpan to match the new number of columns (9) */}
                                                     <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                                         <h4>Editar Movimiento Manual (ID: {movement.id})</h4>
                                                         <form onSubmit={handleSaveEdit}> {/* Added onSubmit */}
                                                             <div>
                                                                 <label htmlFor={`edit-fecha-${movement.id}`}>Fecha:</label>
                                                                 <input type="date" id={`edit-fecha-${movement.id}`} name="Fecha" value={editedMovementData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                                             </div>
                                                              {/* Tipo is not editable for now */}
                                                              <div>
                                                                 <label>Tipo de Movimiento:</label>
                                                                  <p>{getMovementTypeDisplayText(editedMovementData.Tipo)}</p> {/* Display, not edit */}
                                                              </div>
                                                              <div> {/* Allow editing Subtipo */}
                                                                  <label htmlFor={`edit-subtipo-movimiento-${movement.id}`}>Subtipo:</label>
                                                                  <input
                                                                      type="text"
                                                                      id={`edit-subtipo-movimiento-${movement.id}`}
                                                                      name="Subtipo"
                                                                      value={editedMovementData.Subtipo || ''}
                                                                      onChange={handleEditFormChange}
                                                                      disabled={savingData}
                                                                  />
                                                              </div>
                                                              <div> {/* Allow editing Reference */}
                                                                 <label htmlFor={`edit-referencia-${movement.id}`}>Referencia:</label>
                                                                  <input
                                                                     type="text"
                                                                     id={`edit-referencia-${movement.id}`}
                                                                     name="Referencia"
                                                                     value={editedMovementData.Referencia || ''}
                                                                     onChange={handleEditFormChange}
                                                                     disabled={savingData}
                                                                  />
                                                             </div>

                                                             {/* Related Entity (Client/Provider) dropdowns for editing */}
                                                             {(editedMovementData.Tipo === 'ingreso manual' || editedMovementData.Tipo === 'egreso manual') && (clients.length > 0 || providers.length > 0) && (
                                                                 <>
                                                                      <div>
                                                                          <label htmlFor={`edit-tipo-entity-${movement.id}`}>Relacionado con:</label>
                                                                          <select id={`edit-tipo-entity-${movement.id}`} name="Tipo_Cliente_Proveedor" value={editedMovementData.Tipo_Cliente_Proveedor || ''} onChange={handleEditFormChange} disabled={savingData}>
                                                                               <option value="">Ninguno</option>
                                                                               <option value="cliente">Cliente</option>
                                                                               <option value="proveedor">Proveedor</option>
                                                                          </select>
                                                                      </div>

                                                                      {editedMovementData.Tipo_Cliente_Proveedor === 'cliente' && clients.length > 0 && (
                                                                          <div>
                                                                              <label htmlFor={`edit-cliente-id-${movement.id}`}>Seleccionar Cliente:</label>
                                                                               <select id={`edit-cliente-id-${movement.id}`} name="Cliente_Proveedor_id" value={editedMovementData.Cliente_Proveedor_id || ''} onChange={handleEditFormChange} disabled={savingData}>
                                                                                  <option value="">Seleccione Cliente</option>
                                                                                  {clients.map(client => (
                                                                                      <option key={client.id} value={client.id}>{client.Empresa}</option>
                                                                                  ))}
                                                                              </select>
                                                                          </div>
                                                                      )}
                                                                      {editedMovementData.Tipo_Cliente_Proveedor === 'proveedor' && providers.length > 0 && (
                                                                          <div>
                                                                              <label htmlFor={`edit-proveedor-id-${movement.id}`}>Seleccionar Proveedor:</label>
                                                                               <select id={`edit-proveedor-id-${movement.id}`} name="Cliente_Proveedor_id" value={editedMovementData.Cliente_Proveedor_id || ''} onChange={handleEditFormChange} disabled={savingData}>
                                                                                   <option value="">Seleccione Proveedor</option>
                                                                                   {providers.map(provider => (
                                                                                       <option key={provider.id} value={provider.id}>{provider.Empresa}</option>
                                                                                   ))}
                                                                               </select>
                                                                          </div>
                                                                      )}
                                                                 </>
                                                             )}


                                                              <div>
                                                                  <label htmlFor={`edit-forma-pago-${movement.id}`}>Forma de Pago:</label>
                                                                  <select id={`edit-forma-pago-${movement.id}`} name="Forma_Pago" value={editedMovementData.Forma_Pago || ''} onChange={handleEditFormChange} required disabled={savingData}>
                                                                      <option value="">Seleccione Forma de Pago</option>
                                                                      {paymentMethods.map(method => (
                                                                          <option key={method} value={method}>{method}</option>
                                                                      ))}
                                                                  </select>
                                                              </div>

                                                              <div>
                                                                  <label htmlFor={`edit-monto-pesos-${movement.id}`}>Monto Pesos:</label>
                                                                  <input type="number" id={`edit-monto-pesos-${movement.id}`} name="Monto_Pesos" value={editedMovementData.Monto_Pesos || ''} onChange={handleEditFormChange} required disabled={savingData} min="0" step="0.01" />
                                                              </div>
                                                              <div>
                                                                  <label htmlFor={`edit-cotizacion-dolar-${movement.id}`}>Cotización Dólar:</label>
                                                                  <input type="number" id={`edit-cotizacion-dolar-${movement.id}`} name="Cotizacion_Dolar" value={editedMovementData.Cotizacion_Dolar || ''} onChange={handleEditFormChange} required disabled={savingData} min="0.01" step="0.01" />
                                                              </div>
                                                              <div>
                                                                  <label htmlFor={`edit-monto-dolares-${movement.id}`}>Monto Dólares:</label>
                                                                   <input type="text" id={`edit-monto-dolares-${movement.id}`} name="Monto_USD" value={editedMovementData.Monto_USD || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                                              </div>
                                                               {/* Asegurarse de mostrar Monto ARS también en el formulario de editar */}
                                                                <div>
                                                                   <label htmlFor={`edit-monto-ars-${movement.id}`}>Monto ARS:</label>
                                                                   <input
                                                                       type="text"
                                                                       id={`edit-monto-ars-${movement.id}`}
                                                                       name="Monto_ARS"
                                                                       value={editedMovementData.Monto_ARS || ''}
                                                                       readOnly
                                                                       disabled={true}
                                                                        style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                                   />
                                                                </div>
                                                                <div> {/* Allow editing Description Manual */}
                                                                    <label htmlFor={`edit-descripcion-manual-${movement.id}`}>Descripción Detallada:</label>
                                                                    <textarea id={`edit-descripcion-manual-${movement.id}`} name="Descripcion_Manual" value={editedMovementData.Descripcion_Manual || ''} onChange={handleEditFormChange} disabled={savingData} rows="3"></textarea>
                                                                </div>
                                                                 <div> {/* Allow editing Notes */}
                                                                    <label htmlFor={`edit-notas-${movement.id}`}>Notas:</label>
                                                                    <textarea id={`edit-notas-${movement.id}`} name="Notas" value={editedMovementData.Notas || ''} onChange={handleEditFormChange} disabled={savingData} rows="2"></textarea>
                                                                </div>


                                                              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                                  <button type="button" onClick={handleSaveEdit} disabled={savingData}>Guardar Cambios</button>
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
                      ) : (
                          !loading && !error && <p>No hay movimientos registrados para los filtros seleccionados.</p>
                      )}
                  </>
              )}

         </div>
     );
 }

 export default CashFlow;
