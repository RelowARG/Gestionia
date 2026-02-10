// src/components/CompraItemsEditor.js (Modified to include Product Search)
import React, { useState, useEffect } from 'react';

// Componente para gestionar la adición y listado de ítems de compra
function CompraItemsEditor({ items, onItemsChange, productos, savingData }) {
    // items: Array de ítems de la compra actual (recibido del componente padre)
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista COMPLETA de productos del catálogo (se usará para mostrar la lista y filtrar)
    // savingData: Booleano para deshabilitar inputs mientras se guarda

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '', // ID del producto seleccionado (ahora viene de la selección en la lista filtrada)
        Cantidad: '',
        Precio_Unitario: '', // Opcional: precio al que se compró (no está en tu DB, pero puede ser útil)
        // Campos para mostrar detalles del producto seleccionado en la UI
        codigo: '',
        Descripcion: '',
        // Total_Item no se guarda en la DB de Compra_Items según tu esquema actual,
        // pero podemos calcularlo y mostrarlo aquí si quieres.
    });

     // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);

    // --- Estados para la búsqueda y lista visible ---
    const [productSearchTerm, setProductSearchTerm] = useState(''); // Lo que el usuario escribe en el input de búsqueda/filtro
    // Lista de productos actualmente mostrada (filtrada o completa)
    // Inicialmente vacía, se llenará con el efecto al recibir la prop 'productos'
    const [displayList, setDisplayList] = useState([]);
    // --- FIN NUEVOS Estados ---


     // --- Efecto para inicializar la lista mostrada cuando los productos cambian ---
    useEffect(() => {
        // Cuando la lista completa de productos (prop 'productos') cambie (ej: al cargar la vista),
        // actualiza la lista mostrada con la lista completa.
        setDisplayList(productos);
         // Limpiar el término de búsqueda por si había algo escrito de una carga anterior
         setProductSearchTerm('');
    }, [productos]); // Dependencia: la lista completa de productos


    // --- Handlers para Ítems de Producto (Con Filtrado Frontend) ---

    // Maneja cambios en el input de búsqueda/filtro de producto
    const handleProductSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase(); // Convertir a minúsculas para búsqueda insensible a mayúsculas/minúsculas
        setProductSearchTerm(term); // Actualiza el término de búsqueda

        if (term === '') {
            // Si el término está vacío, mostrar la lista completa
            setDisplayList(productos);
        } else {
            // Si hay un término, filtrar la lista COMPLETA de productos recibida como prop
            const filtered = productos.filter(producto =>
                (producto.codigo && String(producto.codigo).toLowerCase().includes(term)) || // Buscar en código
                (producto.Descripcion && String(producto.Descripcion).toLowerCase().includes(term)) // Buscar en descripción
            );
            setDisplayList(filtered); // Actualiza la lista mostrada con los resultados filtrados
        }

        // Limpiar los detalles del producto SELECCIONADO si el usuario empieza a escribir de nuevo
        // Esto es importante porque si ya había seleccionado uno, ahora quiere seleccionar otro.
        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: '', // Limpiar ID del producto seleccionado (ya no hay un producto válido seleccionado)
            codigo: '', // Limpiar detalles del producto seleccionado
            Descripcion: '',
            // Mantener Cantidad y Precio_Unitario si ya estaban ingresados para facilitar re-selección
        }));
         setItemError(null); // Limpiar errores al empezar a escribir
    };

    // Maneja la selección de un producto de la lista mostrada (filtrada o completa)
    const handleProductSelect = (product) => {
        console.log('Product selected from list:', product);
        // Rellenar el estado con los detalles del producto seleccionado
        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: product.id, // Establecer el ID del producto seleccionado
            codigo: product.codigo || '', // Rellenar código y descripción
            Descripcion: product.Descripcion || '',
            Precio_Unitario: '', // Limpiar precio unitario anterior al cambiar de producto
            Cantidad: '', // Limpiar cantidad para nueva entrada (es un nuevo ítem)
        }));
        // Establecer el valor del input de búsqueda/filtro con el código y descripción del producto seleccionado
        setProductSearchTerm(`${product.codigo || ''} - ${product.Descripcion || ''}`);
        // Opcional: Limpiar la lista mostrada después de seleccionar (para que no se vea la tabla)
        // setDisplayList([]); // Si descomentas esto, la tabla de productos se ocultará al seleccionar
         setItemError(null); // Limpiar errores de ítems al seleccionar
    };


    // Maneja cambios en los campos Cantidad y Precio Unitario para el nuevo ítem de producto
    const handleNewItemProductoChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (['Cantidad', 'Precio_Unitario'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : '';
        }

        setNewItemProductoData(prevState => ({ ...prevState, [name]: updatedValue }));
         setItemError(null); // Limpiar errores al cambiar estos campos
    };


    // Agrega el nuevo ítem de producto a la lista de ítems
    const handleAddItemProducto = () => {
        setItemError(null); // Reset previous errors for the current add attempt

        // Validaciones básicas para ítem de producto (Adaptadas al nuevo flujo de selección)
        // Validar que se haya SELECCIONADO un producto válido (Producto_id != '')
        if (!newItemProductoData.Producto_id) {
            setItemError('Debe seleccionar un producto de la lista de abajo.');
            return;
        }
        // Validar Cantidad
        if (newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0) {
            setItemError('Debe ingresar una cantidad válida (> 0) para el producto seleccionado.');
            return;
        }
         // Validar Precio Unitario si no está vacío
         if (newItemProductoData.Precio_Unitario !== '' && isNaN(parseFloat(newItemProductoData.Precio_Unitario))) {
              setItemError('El precio unitario debe ser un número válido.');
              return;
         }


        const selectedProducto = productos.find(p => p.id === parseInt(newItemProductoData.Producto_id));
        if (!selectedProducto) {
             // Esto no debería pasar si el Producto_id viene de la selección, pero es una salvaguarda.
             setItemError('Error interno: Producto seleccionado no encontrado.');
             return;
        }

         // Calcular Total_Item (opcional, si quieres mostrarlo o guardarlo)
         const cantidad = parseFloat(newItemProductoData.Cantidad) || 0;
         const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario) || 0; // Usar 0 si el precio unitario está vacío
         const totalItem = (cantidad * precioUnitario);


        const newItem = {
            // Campos de ítem de compra (Productos)
            Producto_id: parseInt(newItemProductoData.Producto_id),
            Cantidad: cantidad, // Usar el valor parsed/validado
            Precio_Unitario: newItemProductoData.Precio_Unitario !== '' ? precioUnitario : null, // Guardar como float o null
            Total_Item: totalItem !== 'NaN' ? parseFloat(totalItem.toFixed(2)) : null, // Agregar Total_Item calculado (o null si hay NaN)
            // Incluir algunos datos del producto para mostrar en la tabla
            codigo: selectedProducto.codigo,
            Descripcion: selectedProducto.Descripcion,
        };

        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange([...items, newItem]);

        // Resetear el formulario de nuevo ítem de producto
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '', codigo: '', Descripcion: '' });
        setProductSearchTerm(''); // Limpiar el input de búsqueda/filtro
        setDisplayList(productos); // Mostrar la lista completa de nuevo después de agregar
        setItemError(null); // Limpiar errores si la adición fue exitosa
    };


    // --- Handlers para la Tabla de Ítems (Eliminar Ítem) ---

    // Elimina un ítem de la lista de ítems
    const handleRemoveItem = (indexToRemove) => {
        const updatedItems = items.filter((_, index) => index !== indexToRemove);
        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange(updatedItems);
        setItemError(null); // Limpiar errores si la eliminación fue exitosa
    };


    // --- Renderizado ---

    return (
        <>
            {/* Mostrar errores específicos de ítems */}
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            {/* --- Sección de Ítems de la Compra (Productos) --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Agregar Producto Comprado</h4>
                {/* Formulario para agregar ítem de producto a la compra */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>

                    {/* Input de búsqueda/filtro */}
                    <div style={{ flex: 2 }}>
                        <label htmlFor="product-search-input">Buscar/Filtrar Producto:</label>
                        <input
                            type="text"
                            id="product-search-input"
                            value={productSearchTerm}
                            onChange={handleProductSearchInputChange} // Manejador de cambio para filtrar
                            placeholder="Escribe código o descripción para filtrar..."
                            disabled={savingData || productos.length === 0}
                        />
                         {productos.length === 0 && !savingData && <p style={{fontSize: '14px', color: '#ffcc80', marginTop: '5px'}}>Cargando productos o no hay productos disponibles.</p>}
                    </div>

                     {/* Mostrar detalles del producto SELECCIONADO */}
                    {/* Mostrar solo si un producto ha sido seleccionado (tiene Producto_id) */}
                    {newItemProductoData.Producto_id ? (
                        <>
                            <div style={{ flex: 2, fontSize: '0.9rem', color: '#bdbdbd', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                {/* Mostrar código y descripción del producto seleccionado */}
                                <p style={{margin: 0}}><strong>Seleccionado:</strong></p>
                                <p style={{margin: 0}}>{newItemProductoData.codigo} - {newItemProductoData.Descripcion}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="item-producto-cantidad">Cantidad:</label>
                                <input
                                    type="number"
                                    id="item-producto-cantidad"
                                    name="Cantidad"
                                    value={newItemProductoData.Cantidad}
                                    onChange={handleNewItemProductoChange} // Usar manejador específico
                                    disabled={savingData}
                                    min="0"
                                    step="any"
                                    required // Cantidad es obligatoria y > 0
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="item-producto-precio">Precio Unitario:</label> {/* Etiqueta actualizada */}
                                <input
                                    type="number"
                                    id="item-producto-precio"
                                    name="Precio_Unitario"
                                    value={newItemProductoData.Precio_Unitario}
                                    onChange={handleNewItemProductoChange} // Usar manejador específico
                                    disabled={savingData}
                                    min="0"
                                    step="0.01"
                                    // Precio Unitario no es requerido por tu estructura de DB actual para Compra_Items
                                />
                            </div>
                             {/* Opcional: Mostrar Total Ítem si quieres */}
                             <div style={{ flex: 0.5 }}>
                                 <label>Total Ítem:</label>
                                  {/* Calcular Total Ítem basado en los valores actuales de Cantidad y Precio Unitario */}
                                 <input
                                     type="text"
                                      value={parseFloat(parseFloat(newItemProductoData.Cantidad || 0) * parseFloat(newItemProductoData.Precio_Unitario || 0)).toFixed(2)}
                                     readOnly
                                     disabled={true}
                                      style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                 />
                             </div>
                            {/* Botón Agregar Producto - Solo si se ha seleccionado Y campos válidos */}
                            <div>
                                <button
                                    type="button"
                                    onClick={handleAddItemProducto}
                                    disabled={
                                        savingData ||
                                        !newItemProductoData.Producto_id || // Debe tener un producto seleccionado
                                        newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0 || // Validar Cantidad
                                        (newItemProductoData.Precio_Unitario !== '' && isNaN(parseFloat(newItemProductoData.Precio_Unitario))) // Validar Precio Unitario si no está vacío
                                    }
                                >
                                    Agregar Producto a Compra
                                </button>
                            </div>
                        </>
                    ) : (
                        // Mostrar mensaje si NO se ha seleccionado un producto aún
                        <div style={{ flex: 4, fontSize: '0.9rem', color: '#ffcc80', display: 'flex', alignItems: 'center' }}>
                            Seleccione un producto de la lista de abajo.
                        </div>
                    )}
                </div>
            </div>

             {/* --- Lista de Productos para Seleccionar (Filtrada por el input) --- */}
            {/* Mostrar esta lista si hay productos cargados inicialmente */}
             {productos.length > 0 && (
                 <div style={{ marginTop: '20px' }}>
                    <h4>Seleccione un Producto:</h4>
                     {displayList.length > 0 ? (
                         <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c' }}> {/* Contenedor con scroll y estilo oscuro */}
                             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                 <thead>
                                     <tr>
                                         <th style={{ textAlign: 'left', padding: '10px' }}>Código</th>
                                         <th style={{ textAlign: 'left', padding: '10px' }}>Descripción</th>
                                         <th style={{ textAlign: 'left', padding: '10px' }}>Tipo</th> {/* Mostrar Tipo */}
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {displayList.map(producto => (
                                         <tr
                                             key={producto.id}
                                             onClick={() => handleProductSelect(producto)} // Manejar selección al hacer clic en la fila
                                             style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'} // Efecto hover en fila
                                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                         >
                                             <td style={{ padding: '10px' }}>{producto.codigo}</td>
                                             <td style={{ padding: '10px' }}>{producto.Descripcion}</td>
                                             <td style={{ padding: '10px' }}>{producto.tipo || 'N/A'}</td> {/* Mostrar Tipo */}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     ) : (
                          /* Mostrar mensaje si la lista filtrada está vacía pero hay productos cargados inicialmente */
                         productSearchTerm !== '' && !savingData && (
                             <p style={{fontSize: '14px', color: '#ffcc80'}}>
                                 No se encontraron productos con "{productSearchTerm}".
                             </p>
                         )
                     )}
                 </div>
            )}
            {/* --- Fin Lista de Productos para Seleccionar --- */}


            {/* Tabla de Ítems de la Compra */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Productos Comprados</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario</th>
                                <th>Total Ítem</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                // Si item tiene un id (viene de la DB al editar), usarlo como key, sino usar index
                                <tr key={item.id || index}>
                                    <td>{item.codigo || 'N/A'}</td> {/* Mostrar código del producto */}
                                    <td>{item.Descripcion || 'N/A'}</td> {/* Mostrar descripción del producto */}
                                    <td>{item.Cantidad !== null ? item.Cantidad : 'N/A'}</td> {/* Asegurar que Cantidad no sea null */}
                                    <td>{item.Precio_Unitario !== null ? parseFloat(item.Precio_Unitario).toFixed(2) : 'N/A'}</td> {/* Mostrar precio unitario si existe y formatear */}
                                     {/* Mostrar Total_Item calculado (o null si hay NaN) */}
                                    <td>{item.Total_Item !== null ? parseFloat(item.Total_Item).toFixed(2) : 'N/A'}</td>
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
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay productos agregados a esta compra.</p>
                )}
            </div>
        </>
    );
}

export default CompraItemsEditor;