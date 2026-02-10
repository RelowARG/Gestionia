// src/components/ventas/VentaItemsEditor.js (Lógica de descuento ajustada en handleAddItem y Debug Logs)
import React, { useState, useEffect, useRef } from 'react';

// Componente para gestionar la adición y listado de ítems de venta (productos y personalizados)
function VentaItemsEditor({ items, onItemsChange, productos, savingData, clearTrigger }) {
    // items: Array de ítems de la venta actual (recibido del componente padre).
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista COMPLETA de productos del catálogo
    // savingData: Booleano para deshabilitar inputs mientras se guarda
    // clearTrigger: Prop que cambia para indicar que se limpien los errores internos

    const [itemTypeToAdd, setItemTypeToAdd] = useState('product');

    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '',
        Cantidad: '',
        Precio_Unitario_Venta: '', // Precio de venta unitario ANTES de descuento
        Descuento_Porcentaje: '', // Campo para el porcentaje de descuento
        codigo: '',
        Descripcion: '',
    });

    const [newItemCustomData, setNewItemCustomData] = useState({
        Descripcion_Personalizada: '',
        Cantidad_Personalizada: '',
        Precio_Unitario_Personalizada: '',
        // Descuento_Porcentaje_Personalizado: '',
    });

    const [itemError, setItemError] = useState(null);

    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [displayList, setDisplayList] = useState([]);

    useEffect(() => {
        setDisplayList(productos);
        setProductSearchTerm('');
    }, [productos]);

    useEffect(() => {
        console.log('[VentaItemsEditor] Clear trigger fired. Clearing internal item error.');
        setItemError(null);
    }, [clearTrigger]);


    const handleItemTypeChange = (e) => {
        setItemTypeToAdd(e.target.value);
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
        setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        setProductSearchTerm('');
        setDisplayList(productos);
        setItemError(null);
    };

    // --- Lógica de Cálculo de Descuento por Cantidad según la Fórmula del usuario ---
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

    // --- Lógica de Cálculo de Total del Ítem con Descuento ---
     const calculateTotalItem = (cantidad, precioUnitario, descuentoPorcentaje) => {
         const cantidadFloat = parseFloat(cantidad);
         const precioUnitarioFloat = parseFloat(precioUnitario);
         const descuentoFloat = parseFloat(descuentoPorcentaje) || 0; // Usa 0 si el descuento es null/undefined/NaN

         const subtotal = (isNaN(cantidadFloat) || cantidadFloat < 0 || isNaN(precioUnitarioFloat) || precioUnitarioFloat < 0)
                           ? 0
                           : cantidadFloat * precioUnitarioFloat;

         const effectiveDescuento = Math.max(0, Math.min(100, descuentoFloat));

         const totalItem = subtotal * (1 - effectiveDescuento / 100);

         return parseFloat(totalItem.toFixed(2));
     };


    // --- Handlers para Ítems de Producto ---

    const handleProductSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase();
        setProductSearchTerm(term);

        if (term === '') {
            setDisplayList(productos);
        } else {
            const filtered = productos.filter(producto =>
                (producto.codigo && String(producto.codigo).toLowerCase().includes(term)) ||
                (producto.Descripcion && String(producto.Descripcion).toLowerCase().includes(term))
            );
            setDisplayList(filtered);
        }

        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
         setItemError(null);
    };

    const handleProductSelect = (product) => {
        console.log('[VentaItemsEditor] Product selected:', product);

        const initialPrecioVenta = product.precio !== null && product.precio !== undefined
                                    ? parseFloat(product.precio)
                                    : '';

        const defaultCantidad = 1;
        const cantidadFloat = parseFloat(defaultCantidad);

        const defaultDiscount = calculateDiscountPercentage(cantidadFloat);

        // --- DEBUG LOG ---
        console.log(`[VentaItemsEditor - DEBUG] Producto seleccionado. Cantidad inicial por defecto: ${defaultCantidad}, Descuento calculado por fórmula: ${defaultDiscount}`);
        // --- END DEBUG LOG ---


        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: product.id,
            codigo: product.codigo || '',
            Descripcion: product.Descripcion || '',
            Precio_Unitario_Venta: initialPrecioVenta !== '' ? String(initialPrecioVenta) : '',
            Cantidad: String(defaultCantidad),
            Descuento_Porcentaje: String(defaultDiscount), // Establecer descuento por defecto inicial
        }));
        setProductSearchTerm(`${product.codigo || ''} - ${product.Descripcion || ''}`);
         setItemError(null);
    };


    const handleNewItemProductoDetailChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

         if (['Cantidad', 'Precio_Unitario_Venta', 'Descuento_Porcentaje'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemProductoData(prevState => {
             const updatedState = { ...prevState, [name]: updatedValue };

              // Si cambia la Cantidad, recalcular el Descuento Porcentaje por defecto
              if (name === 'Cantidad') {
                   const cantidadFloat = parseFloat(updatedState.Cantidad);
                   const defaultDiscount = calculateDiscountPercentage(cantidadFloat);
                   // Esto sobreescribirá cualquier descuento manual previo al cambiar la cantidad
                   updatedState.Descuento_Porcentaje = String(defaultDiscount); // Ensure it's stored as string
              }

               // --- NUEVO LOG DE DEBUG MUY ESPECÍFICO ---
               // Este log muestra el estado del descuento justo después de procesar tu input
               console.log(`[VentaItemsEditor - DEBUG - POST-INPUT] Campo "${name}" cambiado a "${value}". Estado P_Descuento ahora: "${updatedState.Descuento_Porcentaje}" (parseado: ${parseFloat(updatedState.Descuento_Porcentaje)})`);
               // --- FIN NUEVO LOG DE DEBUG ---

             return updatedState;
         });
         setItemError(null);
    };


    // --- Handlers para Ítems Personalizados ---

     const handleNewItemCustomChange = (e) => {
         const { name, value } = e.target;
         let updatedValue = value;

         if (['Cantidad_Personalizada', 'Precio_Unitario_Personalizada'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemCustomData(prevState => {
              const updatedState = { ...prevState, [name]: updatedValue };
              return updatedState;
         });

         setItemError(null);
     };


    // --- Handler para Agregar Ítem ---
    const handleAddItem = () => {
        setItemError(null);

        let newItem = null;

        if (itemTypeToAdd === 'product') {
            // Validaciones
            if (!newItemProductoData.Producto_id) {
                setItemError('Debe seleccionar un producto de la lista de abajo.');
                return;
            }
            const cantidad = parseFloat(newItemProductoData.Cantidad);
            if (newItemProductoData.Cantidad === '' || isNaN(cantidad) || cantidad <= 0) {
                setItemError('Debe ingresar una cantidad válida (> 0) para el producto seleccionado.');
                return;
            }
             const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario_Venta);
             if (newItemProductoData.Precio_Unitario_Venta === '' || isNaN(precioUnitario) || precioUnitario < 0) {
                  setItemError('Debe ingresar un precio unitario de venta válido (>= 0) para el producto seleccionado.');
                  return;
             }

             // --- Lógica ajustada para determinar el Descuento_Porcentaje final ---
             const stateDescuentoValue = parseFloat(newItemProductoData.Descuento_Porcentaje);
             const formulaCalculatedDiscount = calculateDiscountPercentage(cantidad);

             let finalDescuentoPorcentaje;

             // Si el valor en el estado del Descuento_Porcentaje es un número válido
             // Aquí se verifica si lo que está en el estado (que viene del input) es un número válido
             if (newItemProductoData.Descuento_Porcentaje !== '' && !isNaN(stateDescuentoValue)) {
                 // Usamos el valor del estado (permite override manual si llegó correctamente al estado)
                 finalDescuentoPorcentaje = stateDescuentoValue;
                  // Validación para el valor manual
                 if (finalDescuentoPorcentaje < 0 || finalDescuentoPorcentaje > 100) {
                      setItemError('El descuento debe ser un número válido entre 0 y 100.');
                      return;
                 }
             } else {
                 // Si el estado está vacío o NaN, usamos el descuento calculado por fórmula
                 finalDescuentoPorcentaje = formulaCalculatedDiscount;
             }
             // --- Fin Lógica ajustada ---


             // --- DEBUG LOG ---
             console.log(`[VentaItemsEditor - DEBUG] handleAddItem: Determinando descuento final.`);
             console.log(`[VentaItemsEditor - DEBUG] Estado Descuento_Porcentaje: "${newItemProductoData.Descuento_Porcentaje}" (parseado: ${stateDescuentoValue})`);
             console.log(`[VentaItemsEditor - DEBUG] Descuento calculado por fórmula para cantidad ${cantidad}: ${formulaCalculatedDiscount}`);
             console.log(`[VentaItemsEditor - DEBUG] Descuento final a usar para el ítem: ${finalDescuentoPorcentaje}`);
             // --- END DEBUG LOG ---


             // Calcula el Total_Item que se va a guardar, usando el finalDescuentoPorcentaje (que respeta tu manual)
             const totalItem = calculateTotalItem(cantidad, precioUnitario, finalDescuentoPorcentaje);
              if (isNaN(totalItem)) {
                  setItemError('Error al calcular el Total del Ítem. Revise los valores.');
                  return;
              }


            newItem = {
                type: 'product',
                Producto_id: parseInt(newItemProductoData.Producto_id),
                Cantidad: cantidad,
                Precio_Unitario_Venta: precioUnitario,
                Descuento_Porcentaje: finalDescuentoPorcentaje, // Usar el descuento final determinado (0% en tu caso)
                Total_Item: totalItem, // Guardar el total calculado CON tu 0%

                codigo: newItemProductoData.codigo,
                Descripcion: newItemProductoData.Descripcion,
            };

             // --- DEBUG LOG ---
             console.log('[VentaItemsEditor - DEBUG] handleAddItem: Objeto newItem creado:', newItem);
             // --- END DEBUG LOG ---


            setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', Descuento_Porcentaje: '', codigo: '', Descripcion: '' });
            setProductSearchTerm('');
            setDisplayList(productos);

        } else { // itemTypeToAdd === 'custom'
             const descripcionPersonalizada = newItemCustomData.Descripcion_Personalizada;
             const cantidadPersonalizada = parseFloat(newItemCustomData.Cantidad_Personalizada);
             const precioUnitarioPersonalizada = parseFloat(newItemCustomData.Precio_Unitario_Personalizada);

             if (!descripcionPersonalizada) { setItemError('Debe ingresar una descripción para el ítem personalizado.'); return; }
             if (newItemCustomData.Cantidad_Personalizada === '' || isNaN(cantidadPersonalizada) || cantidadPersonalizada <= 0) {
                 setItemError('Debe ingresar una cantidad válida (> 0) para el ítem personalizado.');
                 return;
             }
             if (newItemCustomData.Precio_Unitario_Personalizada === '' || isNaN(precioUnitarioPersonalizada) || precioUnitarioPersonalizada < 0) {
                  setItemError('Debe ingresar un precio unitario válido (>= 0) para el ítem personalizado.');
                  return;
             }

             const totalItem = cantidadPersonalizada * precioUnitarioPersonalizada;

             newItem = {
                 type: 'custom',
                 Descripcion_Personalizada: descripcionPersonalizada,
                 Cantidad_Personalizada: cantidadPersonalizada,
                 Precio_Unitario_Personalizada: precioUnitarioPersonalizada,
                 Total_Item: parseFloat(totalItem.toFixed(2)),
             };
              if (isNaN(totalItem)) {
                  setItemError('Error al calcular el Total del Ítem personalizado. Revise los valores.');
                  return;
              }

            setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        }

        console.log('[VentaItemsEditor] Nuevo item final agregado a la lista y enviado al padre:', newItem);
        onItemsChange([...items, newItem]); // Este es el objeto que se envía al componente padre y eventualmente al backend

        setItemError(null);
    };


    // --- Handlers para la Tabla de Ítems (Eliminar Ítem) ---
    const handleRemoveItem = (indexToRemove) => {
        const updatedItems = items.filter((_, index) => index !== indexToRemove);
        onItemsChange(updatedItems);
        setItemError(null);
    };

    const handleEditItem = (indexToEdit) => {
        console.log("Edit item at index:", indexToEdit);
        setItemError('La edición de ítems aún no está implementada.');
    };


    // Helper para encontrar los detalles completos de un producto por su ID
    const getProductDetails = (productId) => {
        return productos.find(p => p.id === productId);
    };


    // --- Renderizado ---

    // Calcular el Total Ítem para mostrar en tiempo real en el formulario de "Agregar Ítem Producto"
    // Esta parte usa el valor del estado (manual o por formula) para mostrar el total ANTES de agregarlo
     const currentItemTotal = calculateTotalItem(
         newItemProductoData.Cantidad,
         newItemProductoData.Precio_Unitario_Venta,
         newItemProductoData.Descuento_Porcentaje // Usa el valor actual en el estado para el cálculo en tiempo real
     );


    return (
        <>
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Agregar Ítem</h4>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="item-type-select">Tipo de Ítem a Agregar:</label>
                    <select id="item-type-select" value={itemTypeToAdd} onChange={handleItemTypeChange} disabled={savingData}>
                        <option value="product">Producto del Catálogo</option>
                        <option value="custom">Ítem Personalizado</option>
                    </select>
                </div>

                {itemTypeToAdd === 'product' && (
                    <div key="add-product-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                         {/* Input de búsqueda/filtro */}
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

                         {/* Mostrar detalles del producto SELECCIONADO y campos */}
                         {newItemProductoData.Producto_id ? (
                             <>
                                  <div style={{ flexBasis: '300px', flexGrow: 1, fontSize: '0.9rem', color: '#bdbdbd', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                      <p style={{margin: 0}}><strong>Seleccionado:</strong></p>
                                      <p style={{margin: 0}}>{newItemProductoData.codigo} - {newItemProductoData.Descripcion}</p>
                                  </div>
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
                                 <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                                     <label htmlFor="item-producto-precio">Precio Unitario:</label> {/* Este es el precio SIN descuento */}
                                     <input
                                         type="number"
                                         id="item-producto-precio"
                                         name="Precio_Unitario_Venta"
                                         value={newItemProductoData.Precio_Unitario_Venta}
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
                                   {/* Total Ítem (Calculado incluyendo descuento) */}
                                   <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                                       <label>Total Ítem:</label>
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
                                              !newItemProductoData.Producto_id ||
                                              newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0 ||
                                              newItemProductoData.Precio_Unitario_Venta === '' || isNaN(parseFloat(newItemProductoData.Precio_Unitario_Venta)) || parseFloat(newItemProductoData.Precio_Unitario_Venta) < 0 ||
                                               newItemProductoData.Descuento_Porcentaje === '' || isNaN(parseFloat(newItemProductoData.Descuento_Porcentaje)) || parseFloat(newItemProductoData.Descuento_Porcentaje) < 0 || parseFloat(newItemProductoData.Descuento_Porcentaje) > 100 ||
                                               isNaN(currentItemTotal)
                                          }
                                      >
                                         Agregar Producto
                                    </button>
                                 </div>
                             </>
                         ) : (
                             <div style={{ flex: 4, fontSize: '0.9rem', color: '#ffcc80', display: 'flex', alignItems: 'center' }}>
                                 Seleccione un producto de la lista de abajo.
                             </div>
                         )}
                    </div>
                )}

                {itemTypeToAdd === 'custom' && (
                     <div key="add-custom-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                         <div style={{ flexBasis: '300px', flexGrow: 1 }}>
                             <label htmlFor="item-custom-descripcion">Descripción:</label>
                             <input
                                 type="text"
                                 id="item-custom-descripcion"
                                 name="Descripcion_Personalizada"
                                 value={newItemCustomData.Descripcion_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                  required
                             />
                         </div>
                         <div style={{ flexBasis: '80px', flexGrow: 0 }}>
                             <label htmlFor="item-custom-cantidad">Cantidad:</label>
                             <input
                                 type="number"
                                 id="item-custom-cantidad"
                                 name="Cantidad_Personalizada"
                                 value={newItemCustomData.Cantidad_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                 min="0"
                                 step="any"
                                  required
                             />
                         </div>
                         <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                             <label htmlFor="item-custom-precio">Precio Unitario:</label>
                             <input
                                 type="number"
                                 id="item-custom-precio"
                                 name="Precio_Unitario_Personalizada"
                                 value={newItemCustomData.Precio_Unitario_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                 min="0"
                                 step="0.01"
                                  required
                             />
                         </div>
                           {/* Total Ítem para personalizados */}
                           <div style={{ flexBasis: '100px', flexGrow: 0 }}>
                               <label>Total Ítem:</label>
                               <input
                                   type="text"
                                    value={parseFloat(parseFloat(newItemCustomData.Cantidad_Personalizada || 0) * parseFloat(newItemCustomData.Precio_Unitario_Personalizada || 0)).toFixed(2)}
                                   readOnly
                                   disabled={true}
                                    style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                               />
                           </div>
                         <div style={{ flexBasis: 'auto', flexGrow: 0, alignSelf: 'flex-end' }}>
                             {/* Botón Agregar Ítem Personalizado */}
                             <button
                                 type="button"
                                 onClick={handleAddItem}
                                 disabled={
                                     savingData ||
                                     !newItemCustomData.Descripcion_Personalizada ||
                                     newItemCustomData.Cantidad_Personalizada === '' || isNaN(parseFloat(newItemCustomData.Cantidad_Personalizada)) || parseFloat(newItemCustomData.Cantidad_Personalizada) <= 0 ||
                                     newItemCustomData.Precio_Unitario_Personalizada === '' || isNaN(parseFloat(newItemCustomData.Precio_Unitario_Personalizada)) || parseFloat(newItemCustomData.Precio_Unitario_Personalizada) < 0
                                 }
                             >
                                 Agregar Ítem Personalizado
                             </button>
                         </div>
                     </div>
                )}


            </div>


            {/* --- Lista de Productos para Seleccionar (Filtrada por el input) --- */}
            {itemTypeToAdd === 'product' && (
                 <div style={{ marginTop: '20px' }}>
                    <h4>Seleccione un Producto:</h4>
                    {productos.length === 0 && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Asegúrese de que la lista de productos se cargue correctamente.</p>}

                     {productos.length > 0 && (
                         displayList.length > 0 ? (
                             <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c' }}>
                                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                     <thead>
                                         <tr>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Código</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Descripción</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Tipo</th>
                                              {productos[0]?.costo_unitario !== undefined && (
                                                <th style={{ textAlign: 'left', padding: '10px' }}>Costo Unitario</th>
                                             )}
                                              {productos[0]?.precio !== undefined && (
                                                <th style={{ textAlign: 'left', padding: '10px' }}>Precio Catálogo</th>
                                             )}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {displayList.map(producto => (
                                             <tr
                                                 key={producto.id}
                                                 onClick={() => handleProductSelect(producto)}
                                                 style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                             >
                                                 <td style={{ padding: '10px' }}>{producto.codigo}</td>
                                                 <td style={{ padding: '10px' }}>{producto.Descripcion}</td>
                                                 <td style={{ padding: '10px' }}>{producto.tipo || 'N/A'}</td>
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
                             productSearchTerm !== '' && !savingData && (
                                 <p style={{fontSize: '14px', color: '#ffcc80'}}>
                                     No se encontraron productos con "{productSearchTerm}".
                                 </p>
                             )
                         )
                     )}
                 </div>
            )}


            {/* Tabla de Ítems de la Venta (Ítems agregados) */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Ítems Vendidos</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Detalle</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario</th> {/* Precio antes de descuento */}
                                <th>Descuento (%)</th>
                                <th>Total Ítem</th> {/* Precio después de descuento */}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const productDetails = item.type === 'product' && item.Producto_id !== null
                                    ? getProductDetails(item.Producto_id)
                                    : null;

                                // --- MODIFICACIÓN PARA MOSTRAR DESCUENTO GUARDADO ---
                                // Ya NO usamos calculatedDisplayDiscount para productos, usamos el valor guardado
                                const displayDiscount = item.type === 'product'
                                    ? (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== undefined ? item.Descuento_Porcentaje : 0) // Usa el valor GUARDADO
                                    : (item.Descuento_Porcentaje_Personalizado !== undefined && item.Descuento_Porcentaje_Personalizado !== null ? item.Descuento_Porcentaje_Personalizado : null);

                                // Recalculamos el total para MOSTRAR usando el descuento GUARDADO
                                const displayTotalItem = item.type === 'product'
                                    ? calculateTotalItem(item.Cantidad, item.Precio_Unitario_Venta, item.Descuento_Porcentaje) // Calcula con el valor GUARDADO
                                    : (item.Total_Item !== null && item.Total_Item !== undefined ? item.Total_Item : 'N/A'); // Para personalizados, usa el Total_Item guardado


                                return (
                                    <tr key={item.id || index}>
                                        <td>{item.type === 'product' ? 'Producto' : 'Personalizado'}</td>
                                        <td>
                                            {item.type === 'product'
                                                ? `${productDetails?.codigo || item.codigo || 'N/A'} - ${productDetails?.Descripcion || item.Descripcion || 'N/A'}`
                                                : item.Descripcion_Personalizada || 'N/A'
                                            }
                                        </td>
                                        <td>
                                            {item.type === 'product'
                                                ? (item.Cantidad !== null ? item.Cantidad : 'N/A')
                                                : (item.Cantidad_Personalizada !== null ? item.Cantidad_Personalizada : 'N/A')
                                            }
                                        </td>
                                        <td>
                                            {item.type === 'product'
                                                ? (item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta).toFixed(2) : 'N/A')
                                                : (item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A')
                                            }
                                        </td>
                                        {/* Mostrar Descuento (%) - AHORA USA item.Descuento_Porcentaje */}
                                        <td>
                                             {item.type === 'product'
                                                 ? (displayDiscount !== null ? parseFloat(displayDiscount).toFixed(2) : '0.00')
                                                 : 'N/A' // Los personalizados siguen como N/A si no guardan este campo
                                             }
                                        </td>
                                        {/* Mostrar Total_Item - AHORA USA EL TOTAL CALCULADO CON item.Descuento_Porcentaje */}
                                        <td>{displayTotalItem !== 'N/A' && displayTotalItem !== null && !isNaN(displayTotalItem) ? parseFloat(displayTotalItem).toFixed(2) : 'N/A'}</td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={savingData}
                                                style={{ backgroundColor: '#ef9a9a', color: '#212121' }}
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
                    <p>No hay ítems agregados a esta venta.</p>
                )}
            </div>
        </>
    );
}

export default VentaItemsEditor;