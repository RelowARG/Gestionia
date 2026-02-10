// src/components/ventas/VentaEditor.js (Nuevo Componente)
import React, { useState, useEffect, useRef } from 'react';
import VentaItemsEditor from './VentaItemsEditor'; // Asegúrate de que la ruta sea correcta
import { format } from 'date-fns';

const electronAPI = window.electronAPI;

// Este componente recibirá el ID de la venta a editar (`ventaId`)
// y dos funciones (`onCancel`, `onSaveSuccess`) para avisar al padre
// cuando el usuario cancele o guarde exitosamente.
function VentaEditor({ ventaId, onCancel, onSaveSuccess }) {
    const [clientes, setClientes] = useState([]); // Necesario para el selector de cliente
    const [productos, setProductos] = useState([]); // Necesario para el VentaItemsEditor

    // Estado para los datos de la venta que estamos editando.
    // Se inicializa vacío y se llena al cargar la venta.
    const [editedVentaData, setEditedVentaData] = useState({
        id: null,
        Fecha: '',
        Fact_Nro: '', // Se muestra pero no se edita
        Cliente_id: '',
        Estado: '',
        Pago: '',
        Subtotal: '', // Calculado en base a los ítems
        IVA: '', // Porcentaje de IVA
        Total: '', // Total en USD (Subtotal + IVA)
        Cotizacion_Dolar: '', // Cotización del dólar para esta venta
        Total_ARS: '', // Total en ARS (Total USD * Cotización)
        items: [], // Array con los ítems de la venta
    });

    const [loading, setLoading] = useState(true); // Indica si se está cargando la venta inicial
    const [savingData, setSavingData] = useState(false); // Indica si se está guardando la venta
    const [error, setError] = useState(null); // Para mostrar errores

    // Estado y handlers para la búsqueda progresiva de clientes
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [displayClients, setDisplayClients] = useState([]);

     // Estado para forzar la limpieza de errores internos en VentaItemsEditor al intentar guardar
    const [clearItemsEditorErrorsTrigger, setClearItemsEditorErrorsTrigger] = useState(0);


    // --- Cargar Datos Iniciales (Venta, Clientes, Productos) ---
    // Este efecto se ejecuta cuando el componente se monta o si cambia `ventaId`.
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setClearItemsEditorErrorsTrigger(0); // Reiniciar el trigger

            try {
                // 1. Obtener los datos de la venta específica usando el ventaId recibido
                const ventaData = await electronAPI.getVentaById(ventaId);
                console.log(`Datos de Venta ID ${ventaId} cargados para editar:`, ventaData);

                // 2. Obtener la lista de clientes y productos (necesarios para los selects y VentaItemsEditor)
                // Idealmente, estos podrían pasarse como props si se cargan una vez en un componente superior
                const clientsData = await electronAPI.getClients();
                const productosData = await electronAPI.getProductos();

                setClientes(clientsData);
                setDisplayClients(clientsData); // Inicializar la lista de clientes para la búsqueda
                setProductos(productosData);

                // 3. Rellenar el estado `editedVentaData` con los datos cargados
                const formattedFecha = ventaData.Fecha
                    ? format(new Date(ventaData.Fecha), 'yyyy-MM-dd') // Formatear la fecha para el input type="date"
                    : '';

                 // Encontrar el cliente para inicializar el campo de búsqueda progresiva
                const clientForEdit = clientsData.find(c => c.id === ventaData.Cliente_id);
                if (clientForEdit) {
                    setClientSearchTerm(`${clientForEdit.Codigo || ''} - ${clientForEdit.Empresa || ''}`);
                } else {
                    setClientSearchTerm(''); // Limpiar si el cliente no se encuentra
                }

                setEditedVentaData({
                    id: ventaData.id,
                    Fecha: formattedFecha || '',
                    Fact_Nro: ventaData.Fact_Nro || '', // Se carga para mostrar, no para editar
                    Cliente_id: ventaData.Cliente_id || '',
                    Estado: ventaData.Estado || '',
                    Pago: ventaData.Pago || '',
                    // Convertir a string para los inputs, manejar null
                    Subtotal: ventaData.Subtotal !== null ? String(ventaData.Subtotal) : '',
                    IVA: ventaData.IVA !== null ? String(ventaData.IVA) : '',
                    Total: ventaData.Total !== null ? String(ventaData.Total) : '',
                    Cotizacion_Dolar: ventaData.Cotizacion_Dolar !== null ? String(ventaData.Cotizacion_Dolar) : '',
                    Total_ARS: ventaData.Total_ARS !== null ? String(ventaData.Total_ARS) : '',
                    items: ventaData.items || [], // Cargar los ítems existentes
                });

            } catch (err) {
                console.error(`Error al cargar datos para Venta ID ${ventaId}:`, err);
                setError(err.message || 'Error al cargar los datos de la venta para editar.');
                 // Si falla la carga inicial, no tiene sentido seguir editando. Avisamos al padre.
                 if(onCancel) onCancel();
            } finally {
                setLoading(false);
            }
        };

        // Solo ejecutar fetchData si ventaId es un ID válido
        if (ventaId !== null && ventaId !== undefined && ventaId > 0) {
            fetchData();
        } else {
             console.warn("VentaEditor recibió un ventaId inválido:", ventaId);
             setError("No se especificó una venta válida para editar.");
             setLoading(false);
             if(onCancel) onCancel(); // Avisar al padre que no se puede editar
        }

    }, [ventaId, onCancel]); // Dependencias: ventaId y onCancel


    // --- Efecto para Recalcular Totales Automáticamente ---
    // Se ejecuta cuando cambian los ítems, el Subtotal (calculado desde ítems),
    // el porcentaje de IVA o la cotización del dólar.
    useEffect(() => {
        console.log('[VentaEditor] Recalculando totales...');

        // Si el Subtotal no es un número válido, no podemos calcular Totales
        const subtotal = parseFloat(editedVentaData.Subtotal);
        const ivaPercentage = parseFloat(editedVentaData.IVA);
        const cotizacion = parseFloat(editedVentaData.Cotizacion_Dolar);

        let calculatedTotalUSD = '';
         // Calcular Total USD: Subtotal + IVA (si IVA está seleccionado)
        if (!isNaN(subtotal)) { // Solo si el subtotal es un número válido
             if (editedVentaData.IVA !== '' && !isNaN(ivaPercentage)) {
                const ivaAmount = subtotal * (ivaPercentage / 100);
                calculatedTotalUSD = (subtotal + ivaAmount).toFixed(2);
            } else {
                 // Si IVA está vacío o no es número, Total USD es igual al Subtotal
                 calculatedTotalUSD = subtotal.toFixed(2);
            }
        }


        let calculatedTotalARS = '';
         // Calcular Total ARS: Total USD * Cotización Dólar
         // Solo si Total USD es válido Y Cotización Dólar es válida y > 0
        if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
            calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
        }


        // Actualizar el estado `editedVentaData` solo si los valores calculados
        // son diferentes de los que ya están en el estado para evitar bucles infinitos.
        setEditedVentaData(prevState => {
            if (prevState.Total !== calculatedTotalUSD || prevState.Total_ARS !== calculatedTotalARS) {
                 console.log(`[VentaEditor] Actualizando totales: Total USD ${calculatedTotalUSD}, Total ARS ${calculatedTotalARS}`);
                return {
                    ...prevState,
                    Total: calculatedTotalUSD, // Total USD
                    Total_ARS: calculatedTotalARS, // Total ARS
                };
            }
            return prevState; // No hay cambio, retorna el estado anterior
        });
    }, [editedVentaData.items, editedVentaData.Subtotal, editedVentaData.IVA, editedVentaData.Cotizacion_Dolar]); // Dependencias

    // --- Handlers para el Formulario Principal ---

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        // No es necesario procesar el valor aquí, simplemente actualizar el estado.
        // Los cálculos automáticos se harán en el useEffect.
        setEditedVentaData(prevState => ({ ...prevState, [name]: value }));
        setError(null); // Limpiar error al cambiar cualquier campo
    };


    // --- Handler para los cambios en VentaItemsEditor ---
    // Esta función se llama cada vez que VentaItemsEditor agrega/elimina un ítem.
    const handleEditedVentaItemsChange = (newItems) => {
        // Calcular el Subtotal sumando los Total_Item de la nueva lista de ítems.
        const calculatedSubtotal = newItems.reduce((sum, item) => {
             // Asegurarse de que Total_Item sea un número antes de sumar
             const itemTotal = parseFloat(item.Total_Item);
             return sum + (isNaN(itemTotal) ? 0 : itemTotal);
        }, 0).toFixed(2); // Mantener 2 decimales

        // Actualizar el estado `editedVentaData` con la nueva lista de ítems
        // y el Subtotal calculado.
        setEditedVentaData(prevState => ({
            ...prevState,
            items: newItems,
             Subtotal: calculatedSubtotal // Actualizar Subtotal para que se muestre y active el useEffect de totales
        }));
        setError(null); // Limpiar error al cambiar los ítems
    };


    // --- Función para Guardar los Cambios ---
    const handleSaveEdit = async (e) => {
        e.preventDefault(); // Evitar el recarga de la página
        setSavingData(true); // Indicar que estamos guardando
        setError(null); // Limpiar errores previos
        setClearItemsEditorErrorsTrigger(prev => prev + 1); // Disparar limpieza de errores en el editor de ítems

        // --- Validaciones (similares a las de `ListaVentas.js` al guardar edición) ---
        if (!editedVentaData.Fecha || !editedVentaData.Cliente_id || !editedVentaData.Estado || !editedVentaData.Pago || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0) {
             setError('Fecha, Cliente, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.');
             setSavingData(false);
             return;
        }
        if (!Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0) {
            setError('La venta debe tener al menos un ítem.');
            setSavingData(false);
            return;
        }
         // Las validaciones de Subtotal, Total USD y Total ARS ahora dependen de que los valores calculados sean números
          if (editedVentaData.Subtotal !== '' && isNaN(parseFloat(editedVentaData.Subtotal))) {
              setError('Error interno: Subtotal calculado no es un número válido.');
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

        // Formatear la fecha al formato 'YYYY-MM-DD' que espera el backend
        const formattedFecha = editedVentaData.Fecha ? new Date(editedVentaData.Fecha).toISOString().split('T')[0] : '';
        if (!formattedFecha) {
            setError('Formato de fecha no válido.');
            setSavingData(false);
            return;
        }
        // --- Fin Validaciones ---


        // Preparar los datos a enviar al backend.
        // Esto incluye los detalles principales de la venta y la lista de ítems actualizada.
        const dataToSend = {
            id: editedVentaData.id, // Es crucial enviar el ID para saber qué venta actualizar
            Fecha: formattedFecha, // Usar la fecha formateada
            // Fact_Nro NO se envía, ya que no se edita y el backend no debe cambiarlo.
            Cliente_id: parseInt(editedVentaData.Cliente_id, 10), // Convertir a número
            Estado: editedVentaData.Estado,
            Pago: editedVentaData.Pago,
            // Asegurar que los campos numéricos son números o null (no strings vacíos)
            Subtotal: editedVentaData.Subtotal !== '' ? parseFloat(editedVentaData.Subtotal) : null,
            IVA: editedVentaData.IVA !== '' ? parseFloat(editedVentaData.IVA) : null,
            Total: editedVentaData.Total !== '' ? parseFloat(editedVentaData.Total) : null,
            Cotizacion_Dolar: editedVentaData.Cotizacion_Dolar !== '' ? parseFloat(editedVentaData.Cotizacion_Dolar) : null,
            Total_ARS: editedVentaData.Total_ARS !== '' ? parseFloat(editedVentaData.Total_ARS) : null,
            // Enviar la lista de ítems completa al backend.
            // El backend debe manejar la eliminación de ítems viejos y la inserción de los nuevos,
            // y la actualización de stock y CashFlow.
            items: editedVentaData.items.map(item => ({
                id: item.id || undefined, // Incluir ID si existe (para ítems pre-existentes)
                type: item.type, // Enviar el tipo de ítem ('product' o 'custom')
                // Incluir campos relevantes y asegurar que son números o null
                Descuento_Porcentaje: item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && !isNaN(parseFloat(item.Descuento_Porcentaje)) ? parseFloat(item.Descuento_Porcentaje) : null,
                Total_Item: item.Total_Item !== null && item.Total_Item !== '' && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null,
                ...(item.type === 'product' && {
                    Producto_id: item.Producto_id,
                    Cantidad: item.Cantidad !== null && item.Cantidad !== '' && !isNaN(parseFloat(item.Cantidad)) ? parseFloat(item.Cantidad) : null,
                    Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== '' && !isNaN(parseFloat(item.Precio_Unitario_Venta)) ? parseFloat(item.Precio_Unitario_Venta) : null,
                    // No es necesario enviar codigo/Descripcion del producto al backend para la actualización de ítems.
                }),
                ...(item.type === 'custom' && {
                     Descripcion_Personalizada: item.Descripcion_Personalizada,
                     Cantidad_Personalizada: item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' && !isNaN(parseFloat(item.Cantidad_Personalizada)) ? parseFloat(item.Cantidad_Personalizada) : null,
                     Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== '' && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada) : null,
                 }),
            })),
        };

        try {
            // Llamar a la API para actualizar la venta
            const response = await electronAPI.updateVenta(dataToSend.id, dataToSend);
            console.log('Venta actualizada exitosamente:', response.success);

            // Si todo sale bien, llamamos a la función onSaveSuccess pasada por el padre.
            // Esto le indicará al padre que la edición terminó y puede, por ejemplo,
            // volver a mostrar la lista global.
            if (onSaveSuccess) {
                onSaveSuccess();
            }

            // Opcional: Si es necesario, podrías querer recargar la lista de stock
            // aquí después de una edición, ya que los ítems de producto podrían haber cambiado.
            // await electronAPI.getStock(); // Asumiendo que hay una función para recargar stock

        } catch (err) {
            console.error('Error al actualizar la venta:', err);
            setError(err.message || `Error al actualizar la venta.`);
        } finally {
            setSavingData(false); // Resetear el estado de guardado
        }
    };

    // --- Función para Cancelar la Edición ---
    const handleCancelEdit = () => {
         // Llamar a la función onCancel pasada por el componente padre.
         // Esto le indicará al padre que el usuario canceló y debe, por ejemplo,
         // volver a mostrar la lista global.
        if (onCancel) {
            onCancel();
        }
         // Opcional: Resetear el estado localmente (el componente padre probablemente lo desmonte)
         setEditedVentaData({
             id: null, Fecha: '', Fact_Nro: '', Cliente_id: '',
             Estado: '', Pago: '', Subtotal: '', IVA: '', Total: '',
             Cotizacion_Dolar: '', Total_ARS: '', items: []
         });
         setError(null);
         setClientSearchTerm('');
         setDisplayClients(clientes);
    };

    // --- Handlers para la Búsqueda Progresiva de Clientes ---
     const handleClientSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase();
        setClientSearchTerm(term);
        setError(null); // Limpiar error al buscar

        if (term === '') {
            setDisplayClients(clientes);
        } else {
            const filtered = clientes.filter(client =>
                (client.Codigo && String(client.Codigo).toLowerCase().includes(term)) ||
                (client.Empresa && String(client.Empresa).toLowerCase().includes(term)) ||
                (client.Nombre && String(client.Nombre).toLowerCase().includes(term))
            );
            setDisplayClients(filtered);
        }

        // Cuando el usuario escribe en el campo de búsqueda, se asume que quiere
        // seleccionar un cliente nuevo o diferente, así que limpiamos el Cliente_id seleccionado
        setEditedVentaData(prevState => ({ ...prevState, Cliente_id: '' }));
    };

    const handleClientSelect = (client) => {
        console.log('[VentaEditor] Cliente seleccionado:', client);
        // Mostrar el código y la empresa en el campo de búsqueda
        setClientSearchTerm(`${client.Codigo || ''} - ${client.Empresa || ''}`);

        // Actualizar el Cliente_id en el estado de la venta editada
        setEditedVentaData(prevState => ({ ...prevState, Cliente_id: client.id }));

        setDisplayClients([]); // Ocultar la lista de sugerencias después de seleccionar
        setError(null); // Limpiar error
    };
    // --- Fin Handlers Búsqueda Progresiva ---

    // Función auxiliar para obtener los detalles completos de un cliente por ID
    const getClientDetails = (clientId) => {
       // Buscar en la lista de clientes cargada
       return clientes.find(c => c.id === clientId);
    };

     // --- Renderizado ---

     // Mostrar un mensaje de carga mientras se obtienen los datos iniciales
     if (loading) {
         return <p>Cargando datos de la venta para editar...</p>;
     }

     // Si hubo un error al cargar la venta y no tenemos datos, mostrar un error
     if (error && !editedVentaData.id) {
          return (
             <div className="container">
                  <p style={{ color: '#ef9a9a' }}>{error}</p>
                  {/* Botón para volver, llama a la función de cancelación */}
                  <button onClick={handleCancelEdit} style={{ backgroundColor: '#616161', color: 'white' }}>Volver al Listado Global</button>
             </div>
          );
     }

     // Si la venta se cargó correctamente, mostrar el formulario de edición
    return (
        <div className="container">
            {/* Mostramos el ID de la venta que estamos editando */}
            <h2>Editar Venta (ID: {ventaId})</h2>

             {/* Mostrar errores si los hay (ej: validación al guardar) */}
             {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
             {/* Mostrar mensaje mientras se guarda */}
             {savingData && <p>Guardando cambios...</p>}

             {/* Formulario principal de la venta */}
             <form onSubmit={handleSaveEdit}>
                  <div>
                     <label htmlFor={`edit-fecha-${ventaId}`}>Fecha:</label>
                      {/* Input de fecha, el valor se formatea YYYY-MM-DD al cargar y al guardar */}
                     <input type="date" id={`edit-fecha-${ventaId}`} name="Fecha" value={editedVentaData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                  </div>
                  <div>
                      <label htmlFor={`edit-fact-nro-${ventaId}`}>Nro Factura:</label>
                      {/* Número de factura, solo lectura */}
                      <input type="text" id={`edit-fact-nro-${ventaId}`} name="Fact_Nro" value={editedVentaData.Fact_Nro || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                  </div>
                   {/* --- Sección de Búsqueda Progresiva de Cliente --- */}
                   <div style={{ marginBottom: '10px' }}>
                       <label htmlFor={`edit-client-search-input-${ventaId}`}>Buscar/Filtrar Cliente:</label>
                       <input
                           type="text"
                           id={`edit-client-search-input-${ventaId}`}
                           value={clientSearchTerm} // El valor del input de búsqueda
                           onChange={handleClientSearchInputChange} // Manejador al escribir
                           placeholder="Escribe código, nombre o empresa para filtrar..."
                            disabled={savingData || clientes.length === 0} // Deshabilitar si guardando o no hay clientes cargados
                       />
                       {/* Mensajes informativos sobre clientes */}
                       {clientes.length === 0 && loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando clientes...</p>}
                       {clientes.length === 0 && !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay clientes disponibles.</p>}
                   </div>

                  {/* Mostrar el cliente seleccionado o un mensaje */}
                  {editedVentaData.Cliente_id ? (
                       <div style={{ fontSize: '0.9rem', color: '#bdbdbyd', marginBottom: '10px' }}>
                             {/* Mostrar detalles del cliente usando la función auxiliar */}
                            <strong>Cliente Seleccionado:</strong> {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Codigo || 'N/A'} - {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Empresa || 'N/A'} ({getClientDetails(parseInt(editedVentaData.Cliente_id))?.Nombre || 'N/A'})
                            <p style={{margin: 0, marginLeft: '10px'}}>Cuit: {getClientDetails(parseInt(editedVentaData.Cliente_id))?.Cuit || 'N/A'}</p>
                       </div>
                  ) : (
                       <p style={{fontSize: '0.9rem', color: '#ffcc80', marginBottom: '10px'}}>
                           Seleccione un cliente de la lista de abajo.
                       </p>
                  )}

                  {/* Lista de Clientes Sugeridos (visible solo si hay término de búsqueda y no hay cliente seleccionado) */}
                  {clientSearchTerm !== '' && displayClients.length > 0 && !editedVentaData.Cliente_id && (
                       <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c', marginBottom: '10px' }}>
                           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                               <thead>
                                   <tr>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Código</th>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Empresa</th>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Cuit</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {/* Mapear la lista de clientes filtrados */}
                                   {displayClients.map(client => (
                                       <tr
                                           key={client.id}
                                           onClick={() => handleClientSelect(client)} // Manejador al seleccionar un cliente de la lista
                                           style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'}
                                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                       >
                                            <td style={{ padding: '8px' }}>{client.Codigo}</td>
                                            <td style={{ padding: '8px' }}>{client.Empresa}</td>
                                            <td style={{ padding: '8px' }}>{client.Nombre}</td>
                                            <td style={{ padding: '8px' }}>{client.Cuit}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                  )}
                   {/* Mensaje si no se encuentran clientes con el término de búsqueda */}
                   {clientSearchTerm !== '' && displayClients.length === 0 && clientes.length > 0 && !editedVentaData.Cliente_id && (
                       <p style={{fontSize: '14px', color: '#ffcc80', marginTop: '10px'}}>
                           No se encontraron clientes con "{clientSearchTerm}".
                       </p>
                   )}
                   {/* --- Fin Sección Búsqueda Progresiva --- */}

                   {/* Otros campos de la venta */}
                   <div>
                      <label htmlFor={`edit-estado-${ventaId}`}>Estado:</label>
                       <select
                          id={`edit-estado-${ventaId}`}
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
                      <label htmlFor={`edit-pago-${ventaId}`}>Pago:</label>
                       <select
                          id={`edit-pago-${ventaId}`}
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
                      <label htmlFor={`edit-subtotal-${ventaId}`}>Subtotal:</label>
                      {/* Subtotal es calculado por VentaItemsEditor y se muestra aquí (solo lectura) */}
                      <input type="text" id={`edit-subtotal-${ventaId}`} name="Subtotal" value={editedVentaData.Subtotal || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                  </div>
                   <div>
                      <label htmlFor={`edit-iva-${ventaId}`}>IVA (%):</label>
                       <select
                          id={`edit-iva-${ventaId}`}
                          name="IVA"
                          value={editedVentaData.IVA || ''}
                          onChange={handleEditFormChange}
                           disabled={savingData}
                      >
                          <option value="">Seleccione IVA</option>
                          <option value="0">0%</option>
                          <option value="21">21%</option>
                          <option value="10.5">10.5%</option>
                          <option value="27">27%</option>
                      </select>
                  </div>
                   <div>
                      <label htmlFor={`edit-total-${ventaId}`}>Total USD:</label>
                       {/* Total USD es calculado por el useEffect y se muestra aquí (solo lectura) */}
                      <input type="text" id={`edit-total-${ventaId}`} name="Total" value={editedVentaData.Total || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                  </div>
                   <div>
                       <label htmlFor={`edit-cotizacion-dolar-${ventaId}`}>Cotización Dólar:</label>
                       <input
                           type="number"
                           id={`edit-cotizacion-dolar-${ventaId}`}
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
                       <label htmlFor={`edit-total-ars-${ventaId}`}>Total ARS:</label>
                       {/* Total ARS es calculado por el useEffect y se muestra aquí (solo lectura) */}
                       <input
                           type="text"
                           id={`edit-total-ars-${ventaId}`}
                           name="Total_ARS"
                           value={editedVentaData.Total_ARS || ''}
                           readOnly
                           disabled={true}
                           style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                       />
                   </div>

                  {/* --- Integración del VentaItemsEditor --- */}
                  {/* Pasamos los ítems de la venta que estamos editando, la lista de productos
                      y la función para manejar los cambios en los ítems. */}
                  {productos.length > 0 ? ( // Solo renderizar si hay productos cargados
                       <VentaItemsEditor
                           items={editedVentaData.items} // Le pasamos los ítems de esta venta
                           onItemsChange={handleEditedVentaItemsChange} // Maneja los cambios en los ítems
                           productos={productos} // Le pasamos la lista completa de productos
                           savingData={savingData} // Deshabilita el editor mientras se guarda
                           clearTrigger={clearItemsEditorErrorsTrigger} // Trigger para limpiar errores internos
                       />
                  ) : (
                       // Mostrar un mensaje si no hay productos disponibles
                       !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems. Asegúrese de tener productos cargados.</p>
                  )}


                 {/* --- Botones de Acción --- */}
                 <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                      {/* Botón para guardar, deshabilitado si guardando o si faltan datos requeridos */}
                      <button type="submit" disabled={savingData || !editedVentaData.Cliente_id || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0 || editedVentaData.items.length === 0}>
                          Guardar Cambios
                     </button>
                      {/* Botón para cancelar, llama a la función onCancel */}
                      <button type="button" onClick={handleCancelEdit} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Cancelar Edición</button>
                 </div>
             </form>
        </div>
    );
}

export default VentaEditor;