// src/components/ListaProductos.js (Frontend Filtering Implemented)
import React, { useState, useEffect } from 'react';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

// Define los tipos de producto y las etiquetas correspondientes para el costo principal
const PRODUCT_TYPES = [
    { value: '', label: 'Seleccionar Tipo' }, // Opción por defecto
    { value: 'Rollo', label: 'Rollo', costLabel: 'Costo x 1.000' }, // Etiqueta para el campo de entrada que influye en el cálculo de rollo
    { value: 'Ribbon', label: 'Ribbon', costLabel: 'Costo x Unidad' }, // Etiqueta para el costo directo
    { value: 'Poliamida', label: 'Poliamida', costLabel: 'Costo x Metros' }, // Etiqueta para el costo directo
    { value: 'Stickers', label: 'Stickers', costLabel: 'Costo x Plancha' }, // Etiqueta para el costo directo
    { value: 'Maquina', label: 'Maquina', costLabel: 'Costo x Unidad' }, // Etiqueta para el costo directo
    // Agrega otros tipos si los hay
];


function ListaProductos() {
  // --- MODIFIED STATE: Store all products and displayed products ---
  const [allProductos, setAllProductos] = useState([]); // Stores the full list fetched initially
  const [displayedProductos, setDisplayedProductos] = useState([]); // Stores the currently displayed (filtered) list
  // --- END MODIFIED STATE ---

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProductoId, setSelectedProductoId] = useState(null); // Selected row ID
  const [editingProductoId, setEditingProductoId] = useState(null); // ID of product being edited

  // --- STATE FOR SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  // --- END STATE ---

  const [editedProductoData, setEditedProductoData] = useState({
      id: null,
      codigo: '',
      Descripcion: '', // New column name
      tipo: '', // <-- NUEVO CAMPO
      eti_x_rollo: '', // New column name - Solo para Rollo
      costo_x_1000: '', // New column name - Campo de costo principal (etiqueta cambia)
      costo_x_rollo: '', // New column name (stored now) - Solo para Rollo (calculado)
      precio: '', // New column name - Común a todos
      banda: '', // New field - Común a todos
      material: '', // New field - Común a todos
      Buje: '', // New field - Común a todos
  });

  const [newProductoData, setNewProductoData] = useState({
    codigo: '',
    Descripcion: '',
    tipo: '', // <-- NUEVO CAMPO
    eti_x_rollo: '', // Solo para Rollo
    costo_x_1000: '', // Campo de costo principal (etiqueta cambia)
    costo_x_rollo: '', // Solo para Rollo (calculado)
    precio: '', // Común a todos
    banda: '', // Común a todos
    material: '', // Común a todos
    Buje: '', // Común a todos
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingProductoId, setDeletingProductoId] = useState(null);

   // State to control visibility of the add form
   const [showAddForm, setShowAddForm] = useState(false);

   // --- Helper function: Calculate Costo x rollo --- (Solo aplica si tipo es 'Rollo')
   const calculateCostoPorRollo = (costoPorMil, etiPorRollo) => {
       // La fórmula parece ser (costo_x_1000 / 1000) * eti_x_rollo

       if (costoPorMil === null || etiPorRollo === null || costoPorMil === '' || etiPorRollo === '') {
           return 'N/A'; // No se puede calcular si faltan entradas o son cadenas vacías
       }

        const costoPorMilFloat = parseFloat(costoPorMil);
        const etiPorRolloFloat = parseFloat(etiPorRollo);

        if (isNaN(costoPorMilFloat) || isNaN(etiPorRolloFloat) || etiPorRolloFloat <= 0) { // Added check for etiPorRolloFloat <= 0
            return 'N/A'; // No se puede calcular si las entradas no son números válidos o eti es cero/negativo
        }

        const costoPorRolloCalc = (costoPorMilFloat / 1000) * etiPorRolloFloat;
       return costoPorRolloCalc.toFixed(2); // Formato a 2 decimales
   };

    // --- Helper function to get the correct cost label based on type ---
    const getCostLabel = (typeValue) => {
        const type = PRODUCT_TYPES.find(t => t.value === typeValue);
        return type ? type.costLabel : 'Costo'; // Etiqueta por defecto si el tipo no se encuentra o es ''
    };


    // --- Function to fetch ALL products initially ---
    const fetchAllProductos = async () => {
      setLoading(true);
      setError(null);
      setSelectedProductoId(null);
      setEditingProductoId(null);
      setEditedProductoData({
          id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '',
          costo_x_1000: '', costo_x_rollo: '', precio: '',
          banda: '', material: '', Buje: '',
      });

      try {
          console.log('Fetching all products.');
          // Call the backend API WITHOUT a search term to get the full list
          const data = await electronAPI.getProductos(''); // Pass empty string for no search term
          console.log('All products loaded:', data);
          setAllProductos([...data]); // Store the full list
          // No need to set displayedProducts here, the filtering effect will handle it
      } catch (err) {
          console.error('Error fetching all products:', err);
          setError(err.message || 'Error al cargar los productos.');
          setAllProductos([]);
          setDisplayedProductos([]); // Clear displayed list on error
      } finally {
          setLoading(false);
      }
    };

  // Effect to fetch ALL initial data on mount
  useEffect(() => {
    console.log('Initial fetchAllProductos useEffect triggered.');
    fetchAllProductos();
  }, []); // Empty dependency array: runs only once on mount


   // --- NEW useEffect for Frontend Filtering ---
   useEffect(() => {
       console.log('Filtering products useEffect triggered. Search term:', searchTerm);
       if (searchTerm === '') {
           setDisplayedProductos(allProductos); // If search term is empty, show all products
       } else {
           const lowerCaseSearchTerm = searchTerm.toLowerCase();
           const filtered = allProductos.filter(producto =>
               (producto.codigo && String(producto.codigo).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (producto.Descripcion && String(producto.Descripcion).toLowerCase().includes(lowerCaseSearchTerm))
           );
           setDisplayedProductos(filtered); // Update displayed list with filtered results
       }
   }, [searchTerm, allProductos]); // Re-run effect when searchTerm or allProductos changes
   // --- END NEW useEffect ---


   // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (productoId) => {
       if (selectedProductoId === productoId) {
           setSelectedProductoId(null);
           setEditingProductoId(null);
            // Reset edited data structure, ADD 'tipo'
           setEditedProductoData({
               id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Añadir tipo
               costo_x_1000: '', costo_x_rollo: '', precio: '',
               banda: '', material: '', Buje: '', // Reset new fields
           });
       } else {
           setSelectedProductoId(productoId);
           if(editingProductoId !== null && editingProductoId !== productoId) {
                setEditingProductoId(null);
                // Reset edited data structure, ADD 'tipo'
                setEditedProductoData({
                    id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Añadir tipo
                    costo_x_1000: '', costo_x_rollo: '', precio: '',
                    banda: '', material: '', Buje: '', // Reset new fields
                });
           }
       }
        setError(null); // Clear errors on row selection change
   };


  // --- Add Producto Functionality ---
  const handleNewProductoInputChange = (e) => {
      const { name, value } = e.target;
       // Use a temporary variable to calculate based on the potential new value
       let updatedNewProductoData = { ...newProductoData, [name]: value };

       // --- Lógica Condicional para CAMPOS y CÁLCULOS según el Tipo ---
       // Esta lógica se ejecuta cada vez que cambia CUALQUIER campo del formulario

       // Si el campo que cambió es el TIPO, limpia campos relacionados que son específicos de otros tipos
       if (name === 'tipo') {
           if (value !== 'Rollo') { // Si el nuevo tipo NO es Rollo, limpia los campos específicos de Rollo
               updatedNewProductoData.eti_x_rollo = '';
               updatedNewProductoData.costo_x_rollo = ''; // Limpia el costo calculado
               // Puedes agregar aquí lógica para limpiar otros campos si fueran específicos de otros tipos
           } else { // Si el nuevo tipo ES Rollo, limpia campos que podrían ser específicos de otros tipos (si los hubiera)
               // (Por ahora no hay campos específicos de otros tipos aparte del 'costo_x_1000')
           }
           // Cuando cambia el tipo, la etiqueta del costo principal (costo_x_1000) se actualizará automáticamente en el JSX
       }

       // Lógica de cálculo de Costo x rollo: SOLO si el tipo es 'Rollo' y cambian los inputs relevantes
       if (updatedNewProductoData.tipo === 'Rollo' && (name === 'costo_x_1000' || name === 'eti_x_rollo' || name === 'tipo')) {
            const costoPorMil = updatedNewProductoData.costo_x_1000;
            const etiPorRollo = updatedNewProductoData.eti_x_rollo;

            if (costoPorMil !== '' && etiPorRollo !== '') {
                const costoPorMilFloat = parseFloat(costoPorMil);
                const etiPorRolloFloat = parseFloat(etiPorRollo);

                 if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
                     const costoRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
                     updatedNewProductoData.costo_x_rollo = costoRollo.toFixed(2); // Actualiza el costo calculado
                 } else {
                      updatedNewProductoData.costo_x_rollo = ''; // Limpia si inputs inválidos para Rollo
                 }
            } else {
                 updatedNewProductoData.costo_x_rollo = ''; // Limpia si inputs vacíos para Rollo
            }
       } else if (updatedNewProductoData.tipo !== 'Rollo') {
            // Si el tipo NO es Rollo, asegura que el costo calculado (costo_x_rollo) siempre esté vacío
            updatedNewProductoData.costo_x_rollo = '';
       }
       // --- Fin Lógica Condicional ---


        setNewProductoData(updatedNewProductoData); // Actualiza el estado con los cambios y cálculos
  };

  const handleAddProductoSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation, INCLUDE 'tipo'
      if (!newProductoData.codigo || !newProductoData.Descripcion || !newProductoData.tipo) { // Validate 'tipo' is selected
           setError('Código, Descripción y Tipo son campos obligatorios.');
           setSavingData(false);
           return;
      }

       // --- Validaciones Condicionales según el Tipo ---
       // Validar el campo de costo principal (costo_x_1000) usando la etiqueta correcta
       if (newProductoData.costo_x_1000 !== '' && isNaN(parseFloat(newProductoData.costo_x_1000))) {
           setError(getCostLabel(newProductoData.tipo) + ' debe ser un número válido.'); // Usa dynamic label in error
           setSavingData(false);
           return;
       }

       // Validaciones específicas solo para el tipo "Rollo"
       if (newProductoData.tipo === 'Rollo') {
           if (newProductoData.eti_x_rollo === '' || isNaN(parseFloat(newProductoData.eti_x_rollo))) {
               setError('Eti x rollo es obligatorio y debe ser un número válido para el tipo Rollo.');
               setSavingData(false);
               return;
           }
           if (parseFloat(newProductoData.eti_x_rollo) <= 0) {
                setError('Eti x rollo debe ser un número positivo para el tipo Rollo.');
                setSavingData(false);
                return;
           }
           // Aquí podrías agregar validación para costo_x_1000 específica para Rollo si fuera diferente
       } else {
           // Validaciones para tipos NO Rollo (si las hubiera aparte del costo principal)
           // (Actualmente la primera validación de costo_x_1000 ya lo cubre si no está vacío)
       }
       // --- Fin Validaciones Condicionales ---

       // Validar Precio (común a todos)
       if (newProductoData.precio !== '' && isNaN(parseFloat(newProductoData.precio))) {
          setError('Precio debe ser un número válido.');
          setSavingData(false);
          return;
       }
        // Validar otros campos comunes si son obligatorios


       // Calcular costo_x_rollo por última vez antes de enviar, basado en valores finales
       let calculatedCostoXRollo = null;
       // SOLO calcular si el tipo es 'Rollo'
       if (newProductoData.tipo === 'Rollo') {
           const costoPorMilFloat = parseFloat(newProductoData.costo_x_1000);
           const etiPorRolloFloat = parseFloat(newProductoData.eti_x_rollo);
            if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
                calculatedCostoXRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
            }
       }


      // Prepare data to send to backend - ensure fields are numbers or null based on TYPE and value
      const dataToSend = {
          codigo: newProductoData.codigo,
          Descripcion: newProductoData.Descripcion,
          tipo: newProductoData.tipo, // <-- Incluir tipo
          // Campos específicos de Rollo: enviar null si el tipo no es Rollo
          eti_x_rollo: newProductoData.tipo === 'Rollo' && newProductoData.eti_x_rollo !== '' ? parseFloat(newProductoData.eti_x_rollo) : null,
          costo_x_rollo: calculatedCostoXRollo, // <-- El costo calculado (null si no es Rollo)

          // Campo de costo principal: enviar como número o null
          costo_x_1000: newProductoData.costo_x_1000 !== '' ? parseFloat(newProductoData.costo_x_1000) : null,

          // Campos comunes a todos
          precio: newProductoData.precio !== '' ? parseFloat(newProductoData.precio) : null,
          banda: newProductoData.banda || null,
          material: newProductoData.material || null,
          Buje: newProductoData.Buje || null,
      };


      try {
           // Call the async API function for adding
          const response = await electronAPI.addProducto(dataToSend); // New API call
           console.log('Producto added successfully:', response.success);
           // Handle success response (e.g., { success: { id: newId } })

           // Clear form using new column names, including 'tipo'
          setNewProductoData({
              codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Limpiar tipo
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Clear new fields
          });
          setShowAddForm(false); // Hide the add form after successful submission
          fetchAllProductos(); // Refresh the full list after adding
      } catch (err) {
          // Handle errors (e.g., duplicate codigo)
          console.error('Error adding producto:', err);
           // The backend returns { error: "message" } on failure, access err.message
          setError(err.message || 'Error al agregar el producto.');
      } finally {
          setSavingData(false); // Reset saving state
      }
  };


  // --- Edit Functionality ---

  // Handle click on Edit button (now uses selectedProductoId)
  const handleEditClick = async () => { // Make the function async
       if (selectedProductoId === null) return;

       setEditingProductoId(selectedProductoId);
       setLoadingEditData(true);
       setError(null);

       try {
           // Call the async API function to get product data by ID
          const data = await electronAPI.getProductoById(selectedProductoId); // New API call
           console.log(`Producto ID ${selectedProductoId} data loaded:`, data);
           // Populate editedProductoData using new DB column names from fetched data, ADD 'tipo'
           // Ensure numerical values from DB are converted to strings for input fields
          setEditedProductoData({
              id: data.id, // Keep the ID for update
              codigo: data.codigo || '',
              Descripcion: data.Descripcion || '',
              tipo: data.tipo || '', // <-- Cargar tipo
              eti_x_rollo: data.eti_x_rollo !== null ? String(data.eti_x_rollo) : '', // Cargar valor
              costo_x_1000: data.costo_x_1000 !== null ? String(data.costo_x_1000) : '', // Cargar valor
              costo_x_rollo: data.costo_x_rollo !== null ? String(data.costo_x_rollo) : '', // Cargar valor
              precio: data.precio !== null ? String(data.precio) : '', // Cargar valor
              banda: data.banda || '', // Populate new fields
              material: data.material || '',
              Buje: data.Buje || '',
          });
      } catch (err) {
          // Handle errors
          console.error(`Error fetching producto by ID ${selectedProductoId}:`, err);
          setError(err.message || `Error al cargar los datos del producto.`);
          setEditingProductoId(null);
          setSelectedProductoId(null);
           // Reset edited data structure, ADD 'tipo'
          setEditedProductoData({
              id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Añadir tipo
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Reset new fields
          });
      } finally {
          setLoadingEditData(false);
      }
   };


  // Handle changes in the edit form (uses editedProductoData state with new DB column names), ADD 'tipo' logic
  const handleEditFormChange = (e) => {
      const { name, value } = e.target;
       let updatedEditedData = { ...editedProductoData, [name]: value }; // Use a temporary variable

        // --- Lógica Condicional para CAMPOS y CÁLCULOS según el Tipo en Editar ---
        // Esta lógica se ejecuta cada vez que cambia CUALQUIER campo del formulario

        // Si el campo que cambió es el TIPO, limpia campos relacionados que son específicos de otros tipos
       if (name === 'tipo') {
            if (value !== 'Rollo') { // Si el nuevo tipo NO es Rollo, limpia los campos específicos de Rollo
                updatedEditedData.eti_x_rollo = '';
                updatedEditedData.costo_x_rollo = ''; // Limpia el costo calculado
                // Puedes agregar aquí lógica para limpiar otros campos si fueran específicos de otros tipos
            } else { // Si el nuevo tipo ES Rollo, limpia campos que podrían ser específicos de otros tipos (si los hubiera)
                // (Por ahora no hay campos específicos de otros tipos aparte del 'costo_x_1000')
            }
            // Cuando cambia el tipo, la etiqueta del costo principal (costo_x_1000) se actualizará automáticamente en el JSX
        }

        // Lógica de cálculo de Costo x rollo: SOLO si el tipo es 'Rollo' y cambian los inputs relevantes
        if (updatedEditedData.tipo === 'Rollo' && (name === 'costo_x_1000' || name === 'eti_x_rollo' || name === 'tipo')) {
             const costoPorMil = updatedEditedData.costo_x_1000;
             const etiPorRollo = updatedEditedData.eti_x_rollo;

             if (costoPorMil !== '' && etiPorRollo !== '') {
                 const costoPorMilFloat = parseFloat(costoPorMil);
                 const etiPorRolloFloat = parseFloat(etiPorRollo);

                  if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
                      const costoRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
                      updatedEditedData.costo_x_rollo = costoRollo.toFixed(2); // Actualiza el costo calculado
                  } else {
                       updatedEditedData.costo_rollo = ''; // Limpia si inputs inválidos para Rollo
                  }
             } else {
                  updatedEditedData.costo_x_rollo = ''; // Limpia si inputs vacíos para Rollo
             }
        } else if (updatedEditedData.tipo !== 'Rollo') {
             // Si el tipo NO es Rollo, asegura que el costo calculado (costo_x_rollo) siempre esté vacío
             updatedEditedData.costo_x_rollo = '';
        }
        // --- Fin Lógica Condicional ---


        setEditedProductoData(updatedEditedData); // Actualiza el estado con los cambios y cálculos
  };


  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation, INCLUDE 'tipo'
      if (!editedProductoData.codigo || !editedProductoData.Descripcion || !editedProductoData.tipo) { // Validate 'tipo' is selected
           setError('Código, Descripción y Tipo son campos obligatorios.');
           setSavingData(false);
           return;
      }

      // --- Validaciones Condicionales según el Tipo en Editar ---
      // Validar el campo de costo principal (costo_x_1000) usando la etiqueta correcta
      if (editedProductoData.costo_x_1000 !== '' && isNaN(parseFloat(editedProductoData.costo_x_1000))) {
          setError(getCostLabel(editedProductoData.tipo) + ' debe ser un número válido.'); // Usa dynamic label in error
          setSavingData(false);
          return;
      }

      // Validaciones específicas solo para el tipo "Rollo"
      if (editedProductoData.tipo === 'Rollo') {
          if (editedProductoData.eti_x_rollo === '' || isNaN(parseFloat(editedProductoData.eti_x_rollo))) {
              setError('Eti x rollo es obligatorio y debe ser un número válido para el tipo Rollo.');
              setSavingData(false);
              return;
          }
          if (parseFloat(editedProductoData.eti_x_rollo) <= 0) {
               setError('Eti x rollo debe ser un número positivo para el tipo Rollo.');
               setSavingData(false);
               return;
          }
          // Aquí podrías agregar validación para costo_x_1000 específica para Rollo si fuera diferente
      } else {
          // Validaciones para tipos NO Rollo (si las hubiera aparte del costo principal)
          // (Actualmente la primera validación de costo_x_1000 ya lo cubre si no está vacío)
      }
      // --- Fin Validaciones Condicionales ---

       // Validar Precio (común a todos)
       if (editedProductoData.precio !== '' && isNaN(parseFloat(editedProductoData.precio))) {
          setError('Precio debe ser un número válido.');
          setSavingData(false);
          return;
      }
       // Validar otros campos comunes si son obligatorios


       // Calcular costo_x_rollo por última vez antes de enviar, basado en valores finales
       let calculatedCostoXRollo = null;
       // SOLO calcular si el tipo es 'Rollo'
       if (editedProductoData.tipo === 'Rollo') {
           const costoPorMilFloat = parseFloat(editedProductoData.costo_x_1000);
           const etiPorRolloFloat = parseFloat(editedProductoData.eti_x_rollo);
            if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
                calculatedCostoXRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
            }
       }


      // Prepare data to send to backend - ensure fields are numbers or null based on TYPE and value
      const dataToSend = {
           id: editedProductoData.id,
           codigo: editedProductoData.codigo,
           Descripcion: editedProductoData.Descripcion,
           tipo: editedProductoData.tipo, // <-- Incluir tipo
           // Campos específicos de Rollo: enviar null si el tipo no es Rollo
           eti_x_rollo: editedProductoData.tipo === 'Rollo' && editedProductoData.eti_x_rollo !== '' ? parseFloat(editedProductoData.eti_x_rollo) : null,
           costo_x_rollo: calculatedCostoXRollo, // <-- El costo calculado (null si no es Rollo)

           // Campo de costo principal: enviar como número o null
           costo_x_1000: editedProductoData.costo_x_1000 !== '' ? parseFloat(editedProductoData.costo_x_1000) : null,

           // Campos comunes a todos
           precio: editedProductoData.precio !== '' ? parseFloat(editedProductoData.precio) : null,
           banda: editedProductoData.banda || null,
           material: editedProductoData.material || null,
           Buje: editedProductoData.Buje || null,
           // Podrías necesitar otros campos de costo/cantidad aquí dependiendo del tipo
      };


      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
          const response = await electronAPI.updateProducto(editedProductoData.id, dataToSend); // New API call
           console.log('Producto updated successfully:', response.success);
           // Handle success response (e.g., { success: { id: ..., changes: ... } })

          setEditingProductoId(null);
           // Reset edited data structure, ADD 'tipo'
          setEditedProductoData({
              id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Añadir tipo
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Reset new fields
          });
          setSelectedProductoId(null); // Deselect after saving
          fetchAllProductos(); // Refresh the full list after saving
      } catch (err) {
          // Handle errors (e.g., duplicate codigo)
           console.error('Error updating producto:', err);
          setError(err.message || `Error al actualizar el producto.`);
      } finally {
          setSavingData(false); // Reset saving state
      }
  };

  const handleCancelEdit = () => {
      setEditingProductoId(null);
      // Reset edited data structure, ADD 'tipo'
      setEditedProductoData({
          id: null, codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Añadir tipo
          costo_x_1000: '', costo_x_rollo: '', precio: '',
          banda: '', material: '', Buje: '', // Reset new fields
      });
      setError(null);
  };


  // --- Delete Functionality ---

  // Handle click on Delete button (now uses selectedProductoId)
  const handleDeleteClick = async () => { // Make the function async
       if (selectedProductoId === null) return;

      if (window.confirm(`¿Está seguro de eliminar el producto con ID ${selectedProductoId}? Si el producto tiene entradas de stock asociadas, no se podrá eliminar.`)) { // Updated confirmation message
          setDeletingProductoId(selectedProductoId);
          setError(null);

          try {
              // Call the async API function for deleting
              const response = await electronAPI.deleteProducto(selectedProductoId); // New API call
               console.log(`Producto with ID ${selectedProductoId} deleted successfully.`, response.success);
               // Handle success response (e.g., { success: { id: ..., changes: ... } })

              setSelectedProductoId(null); // Deselect after deleting
              fetchAllProductos(); // Refresh the full list after deleting
          } catch (err) {
              // Handle errors (e.g., foreign key constraints)
               console.error(`Error deleting producto with ID ${selectedProductoId}:`, err);
               setError(err.message || `Error al eliminar el producto.`);
          } finally {
              setDeletingProductoId(null); // Reset deleting state
          }
      }
   };

    // Handle click on "Nuevo Producto" button (Keep this)
    const handleNewProductoClick = () => {
        setShowAddForm(true);
        setError(null); // Clear any previous errors
         // Ensure newProductoData state is reset when opening the form, ADD 'tipo'
         setNewProductoData({
             codigo: '', Descripcion: '', tipo: '', eti_x_rollo: '', // <-- Limpiar tipo
             costo_x_1000: '', costo_x_rollo: '', precio: '',
             banda: '', material: '', Buje: '', // Reset new fields
         });
        setSelectedProductoId(null); // Deselect any product
        setEditingProductoId(null); // Close any open edit form
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
         // Optional: Reset newProductoData state here too, or rely on handleNewProductoClick
    };

    // --- Función para manejar la Exportación ---
      const handleExportClick = async () => { // Hazla async porque llamará a una API asíncrona
          setError(null); // Limpia cualquier error previo

          try {
              // Llama a una nueva función en tu electronAPI para solicitar la exportación
              // Podrías pasarle un formato si tu backend soporta varios
              const result = await electronAPI.exportProductosCsv(); // Suponemos que tienes una API así

              if (result.success) {
                  // Muestra un mensaje de éxito al usuario (opcional)
                  console.log('Exportación exitosa:', result.filePath);
                  // Podrías mostrar una notificación al usuario, ej:
                  // alert(`Productos exportados a:\n${result.filePath}`);
              } else {
                   // Si el backend reporta un error pero no lanza una excepción
                  console.error('Error en la exportación:', result.error);
                  setError(result.error || 'Error desconocido durante la exportación.');
              }

          } catch (err) {
              // Maneja errores si la llamada a la API falla o lanza una excepción
              console.error('Error al solicitar la exportación:', err);
              setError(err.message || 'Ocurrió un error al solicitar la exportación.');
          }
      };


  return (
    <div className="container">
      <h2>Gestión de Productos</h2>

      {/* Botón para mostrar el formulario de agregar */}
      {!showAddForm && (
           <button onClick={handleNewProductoClick} disabled={loading || loadingEditData || savingData || deletingProductoId !== null}>
               Nuevo Producto
           </button>
      )}

       {/* Botón de Exportar (colócalo donde prefieras, aquí lo ponemos junto a los de acción) */}
       {/* Deshabilítalo si se están realizando otras operaciones */}
       <button
           onClick={handleExportClick}
           disabled={loading || loadingEditData || savingData || deletingProductoId !== null}
           style={{ marginLeft: '10px' }} // Añade algo de espacio si está junto a otros botones
       >
           Exportar Productos (CSV)
       </button>


      {/* Formulario para Agregar Nuevo Producto (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nuevo Producto</h3>
              {/* Use new column names in the form for adding, map UI labels */}
              <form onSubmit={handleAddProductoSubmit}>
                <div>
                  <label htmlFor="new-codigo">Código:</label>
                  <input type="text" id="new-codigo" name="codigo" value={newProductoData.codigo} onChange={handleNewProductoInputChange} required disabled={savingData || loadingEditData || deletingProductoId !== null} />
                </div>
                <div>
                  <label htmlFor="new-descripcion">Descripción:</label>
                  <input type="text" id="new-descripcion" name="Descripcion" value={newProductoData.Descripcion} onChange={handleNewProductoInputChange} required disabled={savingData || loadingEditData || deletingProductoId !== null} />
                </div>

                {/* --- CAMPO: Tipo de Producto --- */}
                <div>
                    <label htmlFor="new-tipo">Tipo:</label>
                    <select id="new-tipo" name="tipo" value={newProductoData.tipo} onChange={handleNewProductoInputChange} required disabled={savingData || loadingEditData || deletingProductoId !== null}>
                        {PRODUCT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
                {/* --- FIN CAMPO --- */}


                {/* --- CAMPOS CONDICIONALES según el Tipo --- */}

                {/* Campos que SOLO se muestran para el tipo "Rollo" */}
                {newProductoData.tipo === 'Rollo' && (
                    <>
                        <div>
                          <label htmlFor="new-eti-rollo">Eti x rollo:</label>
                          <input type="number" id="new-eti-rollo" name="eti_x_rollo" value={newProductoData.eti_x_rollo} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="any" /> {/* Allow any step for decimals */}
                        </div>
                         {/* Display calculated costo x rollo */}
                         <div>
                             <label>Costo x rollo:</label> {/* Esta etiqueta es fija para el campo calculado */}
                             <input
                                 type="text"
                                 value={calculateCostoPorRollo(newProductoData.costo_x_1000, newProductoData.eti_x_rollo)} /* Calculate and display */
                                 readOnly
                                 disabled={true} /* Always disabled as it's calculated */
                                 style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} // Dark theme styles for readOnly input
                             />
                         </div>
                    </>
                )}

                {/* Campo de Costo Principal (etiqueta cambia) - Se muestra para TODOS los tipos EXCEPTO cuando no se ha seleccionado tipo */}
                {newProductoData.tipo !== '' && (
                     <div>
                       {/* La etiqueta cambia dinámicamente según el tipo */}
                       <label htmlFor="new-costo-principal">{getCostLabel(newProductoData.tipo)}:</label>
                       {/* Usamos 'costo_x_1000' como el campo donde se ingresa este valor principal */}
                       <input type="number" id="new-costo-principal" name="costo_x_1000" value={newProductoData.costo_x_1000} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="0.01" />
                     </div>
                )}
                {/* --- FIN CAMPOS CONDICIONALES --- */}

                 {/* Campos comunes a todos los tipos */}
                 <div>
                  <label htmlFor="new-precio">Precio:</label>
                  <input type="number" id="new-precio" name="precio" value={newProductoData.precio} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="0.01" />
                </div>
                 <div>
                     <label htmlFor="new-banda">Banda:</label>
                     <input type="text" id="new-banda" name="banda" value={newProductoData.banda} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>
                 <div>
                     <label htmlFor="new-material">Material:</label>
                     <input type="text" id="new-material" name="material" value={newProductoData.material} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>
                 <div>
                     <label htmlFor="new-buje">Buje:</label>
                     <input type="text" id="new-buje" name="Buje" value={newProductoData.Buje} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>


                {/* Button container for form actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                   <button type="submit" disabled={savingData || loadingEditData || deletingProductoId !== null}>Agregar Producto</button>
                    {/* Cancel button for the add form */}
                   <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingProductoId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                       Cancelar
                   </button>
                </div>
              </form>
          </>
      )}


       {/* Display errors if any */}
      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>} {/* Use dark theme error color */}

      {/* Display Producto List (Conditional Rendering) */}
      {!showAddForm && (
          <>
              <h3>Productos Existentes</h3>

               {/* --- SEARCH INPUT --- */}
               <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="search-term">Buscar:</label>
                  <input
                    type="text"
                    id="search-term"
                    value={searchTerm}
                    onChange={(e) => {
                        console.log('Search term changed:', e.target.value);
                        setSearchTerm(e.target.value); // Update only the search term state
                        // The filtering will now happen in the useEffect
                    }}
                    placeholder="Buscar por código o descripción"
                    disabled={loading || loadingEditData || savingData || deletingProductoId !== null}
                   />
               </div>
               {/* --- END SEARCH INPUT --- */}


               {/* Edit and Delete Buttons */}
               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedProductoId === null || editingProductoId !== null || loadingEditData || savingData || deletingProductoId !== null}
                   >
                       Editar Producto Seleccionado
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedProductoId === null || editingProductoId !== null || loadingEditData || savingData || deletingProductoId !== null}
                       style={{ marginLeft: '10px' }} // This inline style is targeted by CSS for danger color
                   >
                   Eliminar Producto Seleccionado
                   </button>
               </div>


              {loading && <p>Cargando productos...</p>}
              {loadingEditData && <p>Cargando datos de producto para editar...</p>}
              {savingData && <p>Guardando datos...</p>}
              {deletingProductoId && <p>Eliminando producto...</p>}


              {/* --- PRODUCTOS TABLE (Now using displayedProductos) --- */}
              {!loading && displayedProductos.length > 0 && ( // Use displayedProductos here
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Tipo</th>
                      <th>Eti x Rollo</th>
                      <th>Costo x 1.000</th>
                      <th>Costo x Rollo</th>
                      <th>Precio</th>
                      <th>Banda</th>
                      <th>Material</th>
                      <th>Buje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Map over displayedProductos */}
                    {displayedProductos.map((producto) => (
                      <React.Fragment key={producto.id}>
                        <tr
                            onClick={() => handleRowClick(producto.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedProductoId === producto.id ? '#424242' : 'transparent' }}
                        >
                          <td>{producto.id}</td>
                          <td>{producto.codigo}</td>
                          <td>{producto.Descripcion}</td>
                          <td>{producto.tipo}</td>
                          <td>{producto.eti_x_rollo}</td>
                          <td>{producto.costo_x_1000}</td>
                          <td>{producto.costo_x_rollo}</td>
                          <td>{producto.precio}</td>
                          <td>{producto.banda}</td>
                          <td>{producto.material}</td>
                          <td>{producto.Buje}</td>
                        </tr>
                        {/* Inline Edit Form Row */}
                        {editingProductoId === producto.id && !showAddForm && (
                            <tr>
                                 <td colSpan="11">
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Producto (ID: {producto.id})</h4>
                                        <form onSubmit={handleSaveEdit}>
                                             <div>
                                                <label htmlFor={`edit-codigo-${producto.id}`}>Código:</label>
                                                <input type="text" id={`edit-codigo-${producto.id}`} name="codigo" value={editedProductoData.codigo || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                            </div>
                                            <div>
                                                <label htmlFor={`edit-descripcion-${producto.id}`}>Descripción:</label>
                                                <input type="text" id={`edit-descripcion-${producto.id}`} name="Descripcion" value={editedProductoData.Descripcion || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                            </div>

                                            <div>
                                                <label htmlFor={`edit-tipo-${producto.id}`}>Tipo:</label>
                                                <select id={`edit-tipo-${producto.id}`} name="tipo" value={editedProductoData.tipo || ''} onChange={handleEditFormChange} required disabled={savingData}>
                                                    {PRODUCT_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {editedProductoData.tipo === 'Rollo' && (
                                                <>
                                                    <div>
                                                        <label htmlFor={`edit-eti-rollo-${producto.id}`}>Eti x Rollo:</label>
                                                        <input type="number" id={`edit-eti-rollo-${producto.id}`} name="eti_x_rollo" value={editedProductoData.eti_x_rollo || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="any" />
                                                    </div>
                                                    <div>
                                                         <label>Costo x rollo:</label>
                                                         <input
                                                             type="text"
                                                             value={calculateCostoPorRollo(editedProductoData.costo_x_1000, editedProductoData.eti_x_rollo)}
                                                             readOnly
                                                             disabled={true}
                                                             style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                         />
                                                     </div>
                                                </>
                                            )}

                                             {editedProductoData.tipo !== '' && (
                                                  <div>
                                                    <label htmlFor={`edit-costo-principal-${producto.id}`}>{getCostLabel(editedProductoData.tipo)}:</label>
                                                    <input type="number" id={`edit-costo-principal-${producto.id}`} name="costo_x_1000" value={editedProductoData.costo_x_1000 || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="0.01" />
                                                  </div>
                                             )}

                                             <div>
                                                <label htmlFor={`edit-precio-${producto.id}`}>Precio:</label>
                                                <input type="number" id={`edit-precio-${producto.id}`} name="precio" value={editedProductoData.precio || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="0.01" />
                                            </div>
                                             <div>
                                                 <label htmlFor={`edit-banda-${producto.id}`}>Banda:</label>
                                                 <input type="text" id={`edit-banda-${producto.id}`} name="banda" value={editedProductoData.banda || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>
                                             <div>
                                                 <label htmlFor={`edit-material-${producto.id}`}>Material:</label>
                                                 <input type="text" id={`edit-material-${producto.id}`} name="material" value={editedProductoData.material || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>
                                             <div>
                                                 <label htmlFor={`edit-buje-${producto.id}`}>Buje:</label>
                                                 <input type="text" id={`edit-buje-${producto.id}`} name="Buje" value={editedProductoData.Buje || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>


                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                 <button type="submit" disabled={savingData}>Guardar Cambios</button>
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
              {/* --- END PRODUCTOS TABLE --- */}

              {!loading && displayedProductos.length === 0 && !error && searchTerm === '' && <p>No hay productos registrados.</p>}
              {/* Show message if no products found for the current search term */}
              {!loading && displayedProductos.length === 0 && searchTerm !== '' && <p>No se encontraron productos para el término "{searchTerm}".</p>}
              {/* Ensure we don't show "No hay productos registrados" when searching and finding nothing */}
          </>
      )}
    </div>
  );
}

export default ListaProductos;