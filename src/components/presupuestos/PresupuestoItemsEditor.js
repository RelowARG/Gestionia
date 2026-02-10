// src/components/PresupuestoItemsEditor.js
import React, { useState, useEffect } from 'react'; // No need for useRef based on VentaItemsEditor logic portaed

// Componente para gestionar la adición y listado de ítems de presupuesto
function PresupuestoItemsEditor({ items, onItemsChange, productos, savingData }) {
    // items: Array de ítems del presupuesto actual (recibido del componente padre)
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista de productos del catálogo (para el selector de ítems de producto)
    // savingData: Booleano para deshabilitar inputs mientras se guarda

    // --- Estados para gestionar la UI y datos de nuevos ítems ---
    const [itemTypeToAdd, setItemTypeToAdd] = useState('product'); // 'product' or 'custom'
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [displayList, setDisplayList] = useState([]); // Products filtered by search term

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '',
        Cantidad: '',
        Precio_Unitario: '', // Precio unitario ANTES de descuento (from product or manual input)
        Descuento_Porcentaje: '', // Campo para el porcentaje de descuento (calculated or manual)
        codigo: '', // To display selected product details
        Descripcion: '', // To display selected product details
    });

    // Estado para los datos del nuevo ítem personalizado a agregar
    const [newItemPersonalizadoData, setNewItemPersonalizadoData] = useState({
        Descripcion_Personalizada: '',
        Cantidad_Personalizada: '',
        Precio_Unitario_Personalizada: '',
        // Descuento_Porcentaje is NOT included here, aligning with VentaItemsEditor's custom items
    });

    // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);


    // --- Effects ---

    // Initialize displayList with all products when component mounts or productos change
    useEffect(() => {
        setDisplayList(productos);
        setProductSearchTerm(''); // Clear search term on initial load or productos change
    }, [productos]);

     // No clearTrigger prop in Presupuesto, so no effect for it here.


    // --- Handlers para la selección del tipo de ítem ---

    const handleItemTypeChange = (e) => {
        setItemTypeToAdd(e.target.value);
        // Reset relevant new item data and search state when switching type
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
        setNewItemPersonalizadoData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        setProductSearchTerm('');
        setDisplayList(productos); // Reset product list display
        setItemError(null); // Clear errors
    };


    // --- Funciones de Cálculo (Copied from VentaItemsEditor for consistency) ---

    // Calcula el porcentaje de descuento basado en la cantidad (Formula from VentaItemsEditor)
    const calculateDiscountPercentage = (cantidad) => {
        const cantidadFloat = parseFloat(cantidad);

        if (isNaN(cantidadFloat) || cantidadFloat <= 0) {
            return 0;
        }

        let discountPercentage = 0;
        if (cantidadFloat >= 50) {
            discountPercentage = 12;
        } else if (cantidadFloat >= 25) {
            discountPercentage = 10;
        } else if (cantidadFloat >= 10) {
            discountPercentage = 5;
        } else if (cantidadFloat >= 1) {
             discountPercentage = 0;
        } else {
             return 0;
        }

        return discountPercentage;
    };

     // Calcula el total de un ítem aplicando descuento (Copied from VentaItemsEditor for consistency)
     const calculateTotalItem = (cantidad, precioUnitario, descuentoPorcentaje) => {
         const cantidadFloat = parseFloat(cantidad) || 0; // Use 0 for NaN or null/undefined
         const precioUnitarioFloat = parseFloat(precioUnitario) || 0; // Use 0 for NaN or null/undefined
         const discount = parseFloat(descuentoPorcentaje) || 0;

         const subtotal = cantidadFloat * precioUnitarioFloat;

         const effectiveDescuento = Math.max(0, Math.min(100, discount)); // Ensure discount is between 0 and 100

         const totalItem = subtotal * (1 - effectiveDescuento / 100);

         // Handle potential NaN from calculations
         if (isNaN(totalItem)) {
             return 0; // Or handle as an error case if appropriate
         }

         return parseFloat(totalItem.toFixed(2)); // Formatear a 2 decimales
     };


    // --- Handlers para Ítems de Producto ---

    // Handles changes in the product search input
    const handleProductSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase();
        setProductSearchTerm(term);

        if (term === '') {
            setDisplayList(productos); // Show all products if search term is empty
        } else {
            // Filter products by code or description
            const filtered = productos.filter(producto =>
                (producto.codigo && String(producto.codigo).toLowerCase().includes(term)) ||
                (producto.Descripcion && String(producto.Descripcion).toLowerCase().includes(term))
            );
            setDisplayList(filtered);
        }

        // Clear the selected product data if search term changes after selection
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
         setItemError(null); // Clear errors
    };

    // Handles selection of a product from the filtered list
    const handleProductSelect = (product) => {
        console.log('[PresupuestoItemsEditor] Product selected:', product);

        const initialPrecio = product.precio !== null && product.precio !== undefined
                                    ? parseFloat(product.precio)
                                    : ''; // Use product's price as initial price

        const defaultCantidad = 1; // Default quantity to 1 upon selection
        const cantidadFloat = parseFloat(defaultCantidad);

        const defaultDiscount = calculateDiscountPercentage(cantidadFloat); // Calculate initial discount based on default quantity

        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: product.id,
            codigo: product.codigo || '',
            Descripcion: product.Descripcion || '',
            Precio_Unitario: initialPrecio !== '' ? String(initialPrecio) : '', // Set initial price
            Cantidad: String(defaultCantidad), // Set default quantity
            Descuento_Porcentaje: String(defaultDiscount), // Set initial calculated discount
        }));

         // Display selected product in the search input
        setProductSearchTerm(`${product.codigo || ''} - ${product.Descripcion || ''}`);
         setItemError(null); // Clear errors
    };


    // Handles changes in the product item form fields (Cantidad, Precio_Unitario, Descuento_Porcentaje)
    const handleNewItemProductoDetailChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

         // Convert to float for numeric fields if not empty
         if (['Cantidad', 'Precio_Unitario', 'Descuento_Porcentaje'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemProductoData(prevState => {
             const updatedState = { ...prevState, [name]: updatedValue };

              // If Quantity changes, recalculate the default Discount Percentage
              if (name === 'Cantidad') {
                   const cantidadFloat = parseFloat(updatedState.Cantidad);
                   // This will overwrite any previous manual discount when quantity changes
                   updatedState.Descuento_Porcentaje = String(calculateDiscountPercentage(cantidadFloat));
              }

             return updatedState;
         });
         setItemError(null); // Clear errors on input change
    };


    // --- Handlers for Ítems Personalizados ---

    // Handles changes in the custom item form fields
     const handleNewItemPersonalizadoChange = (e) => {
         const { name, value } = e.target;
         let updatedValue = value;

         // Convert to float for numeric fields if not empty
         if (['Cantidad_Personalizada', 'Precio_Unitario_Personalizado'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemPersonalizadoData(prevState => ({ ...prevState, [name]: updatedValue }));
         setItemError(null); // Clear errors on input change
     };


    // --- Handler para Agregar Ítem (Product or Custom) ---
    const handleAddItem = () => {
        setItemError(null); // Clear previous errors

        let newItem = null;

        if (itemTypeToAdd === 'product') {
            // Validation for product item
            if (!newItemProductoData.Producto_id) {
                setItemError('Debe seleccionar un producto de la lista de abajo.');
                return;
            }
            const cantidad = parseFloat(newItemProductoData.Cantidad);
            if (newItemProductoData.Cantidad === '' || isNaN(cantidad) || cantidad <= 0) {
                setItemError('Debe ingresar una cantidad válida (> 0) para el producto seleccionado.');
                return;
            }
             const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario);
             if (newItemProductoData.Precio_Unitario === '' || isNaN(precioUnitario) || precioUnitario < 0) {
                  setItemError('Debe ingresar un precio unitario válido (>= 0) para el producto seleccionado.');
                  return;
             }

             // --- Determine the final Descuento_Porcentaje to use ---
             const stateDescuentoValue = parseFloat(newItemProductoData.Descuento_Porcentaje);
             const formulaCalculatedDiscount = calculateDiscountPercentage(cantidad);

             let finalDescuentoPorcentaje;

             // If the value in the state for Descuento_Porcentaje is a valid number
             if (newItemProductoData.Descuento_Porcentaje !== '' && !isNaN(stateDescuentoValue)) {
                 // Use the state value (allows manual override)
                 finalDescuentoPorcentaje = stateDescuentoValue;
                  // Validation for the manual value
                 if (finalDescuentoPorcentaje < 0 || finalDescuentoPorcentaje > 100) {
                      setItemError('El descuento debe ser un número válido entre 0 y 100.');
                      return;
                 }
             } else {
                 // If the state is empty or NaN, use the formula calculated discount
                 finalDescuentoPorcentaje = formulaCalculatedDiscount;
             }
             // --- End Discount Determination Logic ---

             const totalItem = calculateTotalItem(cantidad, precioUnitario, finalDescuentoPorcentaje);
              if (isNaN(totalItem)) {
                  setItemError('Error al calcular el Total del Ítem. Revise los valores.');
                  return;
              }

            // Create the new product item object
            // Add 'type' field here when creating new item for internal component use
            newItem = {
                type: 'product', // Add type for distinction in the list (used by the editor)
                Producto_id: parseInt(newItemProductoData.Producto_id),
                Cantidad: cantidad,
                // Store the price before discount
                Precio_Unitario: precioUnitario, // Using Precio_Unitario as the base price field
                // Store the final determined discount percentage
                Descuento_Porcentaje: finalDescuentoPorcentaje,
                Total_Item: totalItem, // Store the calculated total

                // Include product details for display
                codigo: newItemProductoData.codigo,
                Descripcion: newItemProductoData.Descripcion,
                // You might want to include other product details here if needed for display or future use
                // banda: selectedProducto.banda, // If you have product details available
                // material: selectedProducto.material,
                // Buje: selectedProducto.Buje,

                 // Personalized fields will be null/undefined
                 Descripcion_Personalizada: null,
                 Cantidad_Personalizada: null,
                 Precio_Unitario_Personalizada: null,
            };

            // Reset product item form and search state
            setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
            setProductSearchTerm('');
            setDisplayList(productos); // Reset product list display

        } else { // itemTypeToAdd === 'custom'
             // Validation for custom item
             const descripcionPersonalizada = newItemPersonalizadoData.Descripcion_Personalizada;
             const cantidadPersonalizada = parseFloat(newItemPersonalizadoData.Cantidad_Personalizada);
             const precioUnitarioPersonalizada = parseFloat(newItemPersonalizadoData.Precio_Unitario_Personalizada);

             if (!descripcionPersonalizada) { setItemError('Debe ingresar una descripción para el ítem personalizado.'); return; }
             if (newItemPersonalizadoData.Cantidad_Personalizada === '' || isNaN(cantidadPersonalizada) || cantidadPersonalizada <= 0) {
                 setItemError('Debe ingresar una cantidad válida (> 0) para el ítem personalizado.');
                 return;
             }
             if (newItemPersonalizadoData.Precio_Unitario_Personalizada === '' || isNaN(precioUnitarioPersonalizada) || precioUnitarioPersonalizada < 0) {
                  setItemError('Debe ingresar un precio unitario válido (>= 0) para el ítem personalizado.');
                  return;
             }

             // No discount for custom items, calculate total directly
             const totalItem = cantidadPersonalizada * precioUnitarioPersonalizada;

             if (isNaN(totalItem)) {
                  setItemError('Error al calcular el Total del Ítem personalizado. Revise los valores.');
                  return;
              }

            // Create the new custom item object
            // Add 'type' field here when creating new item for internal component use
             newItem = {
                 type: 'custom', // Add type for distinction in the list (used by the editor)
                 Producto_id: null, // Indicate it's not a product from the catalog
                 Descripcion_Personalizada: descripcionPersonalizada,
                 Cantidad_Personalizada: cantidadPersonalizada,
                 Precio_Unitario_Personalizada: precioUnitarioPersonalizada,
                 // Descuento_Porcentaje is not applicable/stored for custom items
                 Total_Item: parseFloat(totalItem.toFixed(2)), // Store the calculated total

                 // Product fields will be null/undefined
                 Cantidad: null,
                 Precio_Unitario: null,
                 Descuento_Porcentaje: null,
                 codigo: null,
                 Descripcion: null,
             };

            // Reset custom item form state
            setNewItemPersonalizadoData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        }

        // Add the new item to the list and notify the parent
        onItemsChange([...items, newItem]);

        setItemError(null); // Clear errors if item was added successfully
    };


    // --- Handlers para la Tabla de Ítems (Eliminar/Editar Ítem) ---

    // Removes an item from the list
    const handleRemoveItem = (indexToRemove) => {
        const updatedItems = items.filter((_, index) => index !== indexToRemove);
        // Notify the parent that the item list has changed
        onItemsChange(updatedItems);
        setItemError(null); // Clear errors if removal was successful
    };

    // TODO: Implement Edit Item logic if needed, similar to VentaItemsEditor's placeholder
    const handleEditItem = (indexToEdit) => {
        console.log("Edit item at index:", indexToEdit);
        setItemError('La edición de ítems aún no está implementada.'); // Temporary message
    };


    // Helper to find the complete product details by ID (might be needed for displaying more info in the table)
    const getProductDetails = (productId) => {
         // Find the product in the original products list
        return productos.find(p => p.id === productId);
    };


    // --- Renderizado ---

    // Calculate the current item total to display in the "Add Product Item" form in real-time
     const currentItemTotal = calculateTotalItem(
         newItemProductoData.Cantidad,
         newItemProductoData.Precio_Unitario,
         newItemProductoData.Descuento_Porcentaje // Use the current value in the state for real-time calculation
     );

      // Calculate the current custom item total to display in the "Add Custom Item" form in real-time
     const currentCustomItemTotal = (parseFloat(newItemPersonalizadoData.Cantidad_Personalizada || 0) * parseFloat(newItemPersonalizadoData.Precio_Unitario_Personalizada || 0)).toFixed(2);


    return (
        <>
            {/* Mostrar errores específicos de ítems */}
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            {/* --- Sección para Agregar Ítem --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Agregar Ítem al Presupuesto</h4>

                {/* Selector de Tipo de Ítem */}
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="item-type-select">Tipo de Ítem a Agregar:</label>
                    <select id="item-type-select" value={itemTypeToAdd} onChange={handleItemTypeChange} disabled={savingData}>
                        <option value="product">Producto del Catálogo</option>
                        <option value="custom">Ítem Personalizado</option>
                    </select>
                </div>

                {/* --- Formulario para Agregar Ítem de Producto --- */}
                {itemTypeToAdd === 'product' && (
                    <div key="add-product-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                         {/* Input de búsqueda/filtro de producto */}
                         <div style={{ flexBasis: '300px', flexGrow: 1 }}>
                             <label htmlFor="product-search-input">Buscar/Filtrar Producto:</label>
                             <input
                                 type="text"
                                 id="product-search-input"
                                 value={productSearchTerm}
                                 onChange={handleProductSearchInputChange}
                                 placeholder="Escribe código o descripción para filtrar..."
                                 disabled={savingData}
                             />
                         </div>

                         {/* Mostrar detalles del producto SELECCIONADO y campos para Cantidad, Precio, Descuento */}
                         {newItemProductoData.Producto_id ? (
                             <>
                                  {/* Mostrar Producto Seleccionado */}
                                  <div style={{ flexBasis: '300px', flexGrow: 1, fontSize: '0.9rem', color: '#bdbdbd', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                      <p style={{margin: 0}}><strong>Producto Seleccionado:</strong></p>
                                      <p style={{margin: 0}}>{newItemProductoData.codigo} - {newItemProductoData.Descripcion}</p>
                                  </div>
                                  {/* Campo Cantidad */}
                                  <div style={{ flexBasis: '80px', flexGrow: 0 }}>
                                     <label htmlFor="item-producto-cantidad">Cantidad:</label>
                                     <input
                                         type="number"
                                         id="item-producto-cantidad"
                                         name="Cantidad"
                                         value={newItemProductoData.Cantidad}
                                         onChange={handleNewItemProductoDetailChange}
                                         disabled={savingData}
                                         min="0"
                                         step="any"
                                         required
                                     />
                                 </div>
                                 {/* Campo Precio Unitario */}
                                 <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                                     <label htmlFor="item-producto-precio">Precio Unitario (USD):</label> {/* Precio ANTES de descuento */}
                                     <input
                                         type="number"
                                         id="item-producto-precio"
                                         name="Precio_Unitario"
                                         value={newItemProductoData.Precio_Unitario}
                                         onChange={handleNewItemProductoDetailChange}
                                         disabled={savingData}
                                         min="0"
                                         step="0.01"
                                         required
                                     />
                                 </div>
                                  {/* Campo Descuento (%) */}
                                  <div style={{ flexBasis: '80px', flexGrow: 0 }}>
                                      <label htmlFor="item-producto-descuento">Descuento (%):</label>
                                      <input
                                          type="number"
                                          id="item-producto-descuento"
                                          name="Descuento_Porcentaje"
                                          value={newItemProductoData.Descuento_Porcentaje}
                                          onChange={handleNewItemProductoDetailChange}
                                          disabled={savingData}
                                          min="0"
                                          max="100"
                                          step="0.01"
                                      />
                                  </div>
                                   {/* Total Ítem (Calculado incluyendo descuento en tiempo real) */}
                                   <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                                       <label>Total Ítem (USD):</label>
                                       <input
                                           type="text"
                                            value={isNaN(currentItemTotal) ? 'N/A' : currentItemTotal.toFixed(2)}
                                           readOnly
                                           disabled={true}
                                            style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                       />
                                   </div>
                                    {/* Botón Agregar Producto */}
                                   <div style={{ flexBasis: 'auto', flexGrow: 0, alignSelf: 'flex-end' }}>
                                     <button
                                         type="button"
                                         onClick={handleAddItem}
                                          disabled={
                                              savingData ||
                                              !newItemProductoData.Producto_id || // Must have a selected product
                                              newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0 || // Valid quantity
                                              newItemProductoData.Precio_Unitario === '' || isNaN(parseFloat(newItemProductoData.Precio_Unitario)) || parseFloat(newItemProductoData.Precio_Unitario) < 0 || // Valid price
                                               newItemProductoData.Descuento_Porcentaje === '' || isNaN(parseFloat(newItemProductoData.Descuento_Porcentaje)) || parseFloat(newItemProductoData.Descuento_Porcentaje) < 0 || parseFloat(newItemProductoData.Descuento_Porcentaje) > 100 || // Valid discount (if entered)
                                               isNaN(currentItemTotal) // Ensure total calculation is valid
                                          }
                                      >
                                         Agregar Producto
                                    </button>
                                 </div>
                             </>
                         ) : (
                             // Message when no product is selected
                             <div style={{ flex: 4, fontSize: '0.9rem', color: '#ffcc80', display: 'flex', alignItems: 'center' }}>
                                 Seleccione un producto de la lista de abajo para agregarlo al presupuesto.
                             </div>
                         )}
                    </div>
                )}

                {/* --- Formulario para Agregar Ítem Personalizado --- */}
                {itemTypeToAdd === 'custom' && (
                     <div key="add-custom-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                         {/* Campo Descripción Personalizada */}
                         <div style={{ flexBasis: '300px', flexGrow: 1 }}>
                             <label htmlFor="item-custom-descripcion">Descripción:</label>
                             <input
                                 type="text"
                                 id="item-custom-descripcion"
                                 name="Descripcion_Personalizada"
                                 value={newItemPersonalizadoData.Descripcion_Personalizada}
                                 onChange={handleNewItemPersonalizadoChange}
                                 disabled={savingData}
                                  required
                             />
                         </div>
                         {/* Campo Cantidad Personalizada */}
                         <div style={{ flexBasis: '80px', flexGrow: 0 }}>
                             <label htmlFor="item-custom-cantidad">Cantidad:</label>
                             <input
                                 type="number"
                                 id="item-custom-cantidad"
                                 name="Cantidad_Personalizada"
                                 value={newItemPersonalizadoData.Cantidad_Personalizada}
                                 onChange={handleNewItemPersonalizadoChange}
                                 disabled={savingData}
                                 min="0"
                                 step="any"
                                  required
                             />
                         </div>
                         {/* Campo Precio Unitario Personalizado */}
                         <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                             <label htmlFor="item-custom-precio">Precio Unitario (USD):</label>
                             <input
                                 type="number"
                                 id="item-custom-precio"
                                 name="Precio_Unitario_Personalizada"
                                 value={newItemPersonalizadoData.Precio_Unitario_Personalizada}
                                 onChange={handleNewItemPersonalizadoChange}
                                 disabled={savingData}
                                 min="0"
                                 step="0.01"
                                  required
                             />
                         </div>
                           {/* Total Ítem para personalizados (Calculado en tiempo real) */}
                           <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                               <label>Total Ítem (USD):</label>
                               <input
                                   type="text"
                                    value={currentCustomItemTotal}
                                   readOnly
                                   disabled={true}
                                    style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                               />
                           </div>
                         {/* Botón Agregar Ítem Personalizado */}
                         <div style={{ flexBasis: 'auto', flexGrow: 0, alignSelf: 'flex-end' }}>
                             <button
                                 type="button"
                                 onClick={handleAddItem}
                                 disabled={
                                     savingData ||
                                     !newItemPersonalizadoData.Descripcion_Personalizada || // Must have description
                                     newItemPersonalizadoData.Cantidad_Personalizada === '' || isNaN(parseFloat(newItemPersonalizadoData.Cantidad_Personalizada)) || parseFloat(newItemPersonalizadoData.Cantidad_Personalizada) <= 0 || // Valid quantity
                                     newItemPersonalizadoData.Precio_Unitario_Personalizada === '' || isNaN(parseFloat(newItemPersonalizadoData.Precio_Unitario_Personalizada)) || parseFloat(newItemPersonalizadoData.Precio_Unitario_Personalizada) < 0 // Valid price
                                 }
                             >
                                 Agregar Ítem Personalizado
                             </button>
                         </div>
                     </div>
                )}


            </div>


            {/* --- Lista de Productos para Seleccionar (Filtrada por el input) --- */}
            {/* Display the filterable product list only when adding a product */}
            {itemTypeToAdd === 'product' && (
                 <div style={{ marginTop: '20px' }}>
                    <h4>Seleccione un Producto del Catálogo:</h4>
                    {productos.length === 0 && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Asegúrese de que la lista de productos se cargue correctamente.</p>}

                     {productos.length > 0 && (
                         displayList.length > 0 ? (
                             // Product list table - scrollable
                             <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c' }}>
                                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                     <thead>
                                         <tr>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Código</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Descripción</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Tipo</th>
                                              {/* Include Costo Unitario and Precio Catálogo columns if they exist in product data */}
                                              {productos[0]?.costo_unitario !== undefined && (
                                                <th style={{ textAlign: 'left', padding: '10px' }}>Costo Unitario (USD)</th>
                                             )}
                                              {productos[0]?.precio !== undefined && (
                                                <th style={{ textAlign: 'left', padding: '10px' }}>Precio Catálogo (USD)</th>
                                             )}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {/* Map through the filtered displayList to show selectable products */}
                                         {displayList.map(producto => (
                                             <tr
                                                 key={producto.id}
                                                 onClick={() => handleProductSelect(producto)} // Select product on row click
                                                 style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                             >
                                                 <td style={{ padding: '10px' }}>{producto.codigo}</td>
                                                 <td style={{ padding: '10px' }}>{producto.Descripcion}</td>
                                                 <td style={{ padding: '10px' }}>{producto.tipo || 'N/A'}</td>
                                                  {/* Display Costo Unitario and Precio Catálogo if available */}
                                                  {producto.costo_unitario !== undefined && (
                                                     <td style={{ padding: '10px' }}>{producto.costo_unitario !== null ? parseFloat(producto.costo_unitario).toFixed(2) : 'N/A'}</td>
                                                  )}
                                                  {producto.precio !== undefined && (
                                                     <td style={{ padding: '10px' }}>{producto.precio !== null ? parseFloat(producto.precio).toFixed(2) : 'N/A'}</td>
                                                  )}
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         ) : (
                             // Message when no products match the search
                             productSearchTerm !== '' && !savingData && (
                                 <p style={{fontSize: '14px', color: '#ffcc80'}}>
                                     No se encontraron productos con "{productSearchTerm}".
                                 </p>
                             )
                         )
                     )}
                 </div>
            )}


            {/* --- Tabla Combinada de Ítems del Presupuesto (Productos y Personalizados) --- */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Ítems Agregados</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Detalle</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario (USD)</th> {/* Precio antes de descuento for products */}
                                <th>Descuento (%)</th> {/* Only for products */}
                                <th>Total Ítem (USD)</th> {/* Price after discount for products */}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Map through the added items to display them */}
                            {items.map((item, index) => {
                                // Determine if the item is a product item based on Producto_id presence
                                const isProductItem = item.Producto_id !== null && item.Producto_id !== undefined;

                                // Helper to get product details for display if the item is a product
                                const productDetails = isProductItem && item.Producto_id !== null
                                    ? getProductDetails(item.Producto_id)
                                    : null;

                                // For displaying in the table, we show the discount percentage stored in the item,
                                // as this is the value that was used to calculate the saved Total_Item.
                                const displayDiscountPercentage = isProductItem && item.Descuento_Porcentaje !== undefined && item.Descuento_Porcentaje !== null
                                    ? item.Descuento_Porcentaje
                                    : null; // No discount column value for custom items


                                // The Total_Item displayed is the one calculated and stored when the item was added
                                const displayTotalItem = item.Total_Item;


                                return (
                                    // Use item.id if available, otherwise use index as a fallback key
                                    <tr key={item.id || index}>
                                        {/* MODIFIED: Determine type based on Producto_id presence */}
                                        <td>{isProductItem ? 'Producto' : 'Personalizado'}</td>
                                        <td>
                                            {/* MODIFIED: Display Code and Description for products, Description for custom items based on Producto_id presence */}
                                            {isProductItem
                                                ? `${item.codigo || productDetails?.codigo || 'N/A'} - ${item.Descripcion || productDetails?.Descripcion || 'N/A'}`
                                                : item.Descripcion_Personalizada || 'N/A'
                                            }
                                        </td>
                                        <td>
                                            {/* MODIFIED: Display Quantity based on Producto_id presence */}
                                            {isProductItem
                                                ? (item.Cantidad !== null && item.Cantidad !== undefined ? item.Cantidad : 'N/A') // Added undefined check
                                                : (item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? item.Cantidad_Personalizada : 'N/A') // Added undefined check
                                            }
                                        </td>
                                        <td>
                                            {/* MODIFIED: Display Unit Price based on Producto_id presence */}
                                            {isProductItem
                                                ? (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario).toFixed(2) : 'N/A') // Added undefined/isNaN checks
                                                : (item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A') // Added undefined/isNaN checks
                                            }
                                        </td>
                                        {/* Display Discount (%) only for products */}
                                        <td>
                                             {isProductItem // MODIFIED: Based on Producto_id presence
                                                 ? (displayDiscountPercentage !== null ? parseFloat(displayDiscountPercentage).toFixed(2) : '0.00')
                                                 : 'N/A'
                                             }
                                        </td>
                                        {/* Display Total_Item */}
                                        <td>
                                             {displayTotalItem !== null && displayTotalItem !== undefined && !isNaN(displayTotalItem) // Added undefined check
                                                 ? parseFloat(displayTotalItem).toFixed(2)
                                                 : 'N/A'
                                             }
                                        </td>
                                        <td>
                                             {/* TODO: Implement Edit Button */}
                                             {/* <button type="button" onClick={() => handleEditItem(index)} disabled={savingData} style={{ marginRight: '5px' }}>Editar</button> */}
                                             {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={savingData}
                                                style={{ backgroundColor: '#ef9a9a', color: '#212121' }} // Red color for delete button
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    // Message when no items are added
                    <p>No hay ítems agregados a este presupuesto.</p>
                )}
            </div>
        </>
    );
}

export default PresupuestoItemsEditor;