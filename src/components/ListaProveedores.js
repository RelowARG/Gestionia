// ListaProveedores.js (Modified for Backend API Communication)
import React, { useState, useEffect } from 'react';
// Importar el nuevo componente para los detalles de compra del proveedor (este también necesitará ser adaptado)
import SupplierPurchasesDetails from './SupplierPurchasesDetails';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaProveedores() {
  const [proveedores, setProveedores] = useState([]);
  // newProveedor state uses the new DB column names directly
  const [newProveedor, setNewProveedor] = useState({
    Empresa: '',
    Cuit: '',
    Contacto: '',
    Telefono: '',
    Mail: '',
    Direccion: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Estado para controlar qué proveedor está seleccionado
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);
  const [editingProveedorId, setEditingProveedorId] = useState(null);
  // editedProveedorData state uses the new DB column names
  const [editedProveedorData, setEditedProveedorData] = useState({
    id: null,
    Empresa: '',
    Cuit: '',
    Contacto: '',
    Telefono: '',
    Mail: '',
    Direccion: '',
  });
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingProveedorId, setDeletingProveedorId] = useState(null);

  // Estado para controlar visibilidad del formulario de agregar
  const [showAddForm, setShowAddForm] = useState(false);

  // Estado para el ancho de la ventana, para tabla responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

   // Effect para actualizar ancho de ventana (Keep this)
   useEffect(() => {
     const handleResize = () => {
       setWindowWidth(window.innerWidth);
     };

     window.addEventListener('resize', handleResize);
     return () => {
       window.removeEventListener('resize', handleResize);
     };
   }, []);


  // Función para obtener proveedores usando la nueva API
  const fetchProveedores = async () => { // Make the function async
    setLoading(true);
    setError(null);
    // No deseleccionamos proveedor aquí si no estamos en modo add/edit para mantener la vista de compras
    if (!showAddForm && editingProveedorId === null) {
       // Don't change selectedProveedorId
    } else {
        setSelectedProveedorId(null);
        setEditingProveedorId(null);
    }
     // Resetear datos de edición
     setEditedProveedorData({
         id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
     });

    try {
         // Call the async API function directly and await its result
        const data = await electronAPI.getProveedores(); // New API call
        console.log('Proveedores cargados:', data);
        setProveedores(data); // Data is the direct response from the backend API

        // Si había un proveedor seleccionado antes de refrescar y sigue en la lista, mantener selección
       if (selectedProveedorId && data.find(p => p.id === selectedProveedorId)) {
            // selectedProveedorId state is already set
             console.log(`[ListaProveedores] Kept selected provider ID: ${selectedProveedorId}`);
       } else if (selectedProveedorId !== null) {
            // Si el proveedor seleccionado ya no existe o no había selección previa (y selectedProveedorId no era null)
            // Y si no estamos en modo add/edit, limpiar la selección.
            if (!showAddForm && editingProveedorId === null) {
                 setSelectedProveedorId(null);
                 console.log('[ListaProveedores] Cleared selected provider because it was not found after refresh.');
            }
       }

    } catch (err) {
        // Handle errors from the API call
        console.error('Error fetching proveedores:', err);
        setError(err.message || 'Error al cargar los proveedores.');
        setProveedores([]); // Clear the list on error
         setSelectedProveedorId(null); // Clear selection on error in case of fetch error
    } finally {
        setLoading(false); // Always set loading to false when the fetch is complete
    }
    // Removed all IPC listener setup and cleanup for fetching
  };

  // Effect para obtener proveedores cuando el componente monta
  // No depende de selectedProveedorId aquí para evitar refetch innecesarios
  useEffect(() => {
    // La fetchProveedores function is now async and called directly
    fetchProveedores();

    // Removed IPC listener setup and cleanup from here
    return () => {
         // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
    };
  }, []); // Empty dependency array: run only once on mount


  // Manejar cambios en el formulario (agregar nuevo proveedor) (Keep this)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProveedor({ ...newProveedor, [name]: value }); // Updates newProveedor state with new column names
  };

  // Manejar envío del formulario (agregar nuevo proveedor)
  const handleSubmit = async (e) => { // Make the function async
    e.preventDefault();
    setError(null);

    if (!newProveedor.Empresa || !newProveedor.Cuit) { // Use new column names for validation
      setError('Empresa y Cuit son campos obligatorios.');
      // setSavingData(false); // This will be set to false in finally block
      return;
    }

    setSavingData(true); // Set saving state

    try {
         // Call the async API function for adding
        const response = await electronAPI.addProveedor(newProveedor); // New API call
        console.log('Proveedor added successfully:', response.success);
        // Handle success response (e.g., { success: { id: newId } })

        setNewProveedor({ Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '' });
        setShowAddForm(false); // Hide the add form
        fetchProveedores(); // Refresh the list

    } catch (err) {
        // Handle errors (e.g., duplicate Cuit)
        console.error('Error adding proveedor:', err);
         // The backend returns { error: "message" } on failure, access err.message
        setError(err.message || 'Error al agregar el proveedor.');
    } finally {
        setSavingData(false); // Reset saving state when the operation is complete
    }
    // Removed IPC listener setup and cleanup for adding
  };

  // --- Lógica de Selección de Fila --- (Keep this)
   const handleRowClick = (proveedorId) => {
       if (editingProveedorId !== null && editingProveedorId === proveedorId) {
           // Si la fila clickeada es la que se está editando, cancelar edición
           handleCancelEdit();
       } else if (selectedProveedorId === proveedorId) {
           // Si la fila ya seleccionada es clickeada de nuevo, deseleccionarla
           setSelectedProveedorId(null);
       } else {
           // Seleccionar la fila clickeada
           setSelectedProveedorId(proveedorId);
           // Si se estaba editando otra fila, cancelarla
           if (editingProveedorId !== null) {
               setEditingProveedorId(null);
               setEditedProveedorData({
                   id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
               });
           }
       }
        setError(null); // Limpiar errores al cambiar de selección
   };


  // --- Funcionalidad de Edición ---
  const handleEditClick = async () => { // Make the function async
       if (selectedProveedorId === null) return;

       setEditingProveedorId(selectedProveedorId);
       setLoadingEditData(true);
       setError(null);

       try {
            // Call the async API function to get proveedor data by ID
           const data = await electronAPI.getProveedorById(selectedProveedorId); // New API call
           console.log(`Proveedor ID ${selectedProveedorId} data loaded:`, data);
           // Populate editedProveedorData using new DB column names from fetched data
           setEditedProveedorData(data); // Data is the direct response
       } catch (err) {
           // Handle errors
           console.error(`Error fetching proveedor by ID ${selectedProveedorId}:`, err);
           setError(err.message || `Error al cargar los datos del proveedor.`);
           setEditingProveedorId(null);
           setSelectedProveedorId(null); // Deseleccionar en caso de error
           setEditedProveedorData({
               id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
           });
       } finally {
           setLoadingEditData(false);
       }
       // Removed IPC listener setup and cleanup for fetching data for edit
  };


  const handleEditFormChange = (e) => { // Keep this
       const { name, value } = e.target;
       setEditedProveedorData({ ...editedProveedorData, [name]: value });
  };

  const handleSaveEdit = async (e) => { // Make the function async
       e.preventDefault();
       setSavingData(true);
       setError(null);

       if (!editedProveedorData.Empresa || !editedProveedorData.Cuit) {
            setError('Empresa y Cuit son campos obligatorios.');
            setSavingData(false);
            return;
       }

       try {
           // Call the async API function for updating
            // The backend expects the ID in the URL and data in the body
           const response = await electronAPI.updateProveedor(editedProveedorData.id, editedProveedorData); // New API call
           console.log('Proveedor updated successfully:', response.success);
            // Handle success response (e.g., { success: { id: ..., changes: ... } })

           setEditingProveedorId(null);
           setEditedProveedorData({
               id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
           });
           // Mantener seleccionado el proveedor para que se siga viendo el historial de compras
           // setSelectedProveedorId(null); // No deseleccionar aquí
           fetchProveedores(); // Recargar la lista
            // NOTA: fetchProveedores ya maneja la lógica de mantener la selección si el proveedor existe
       } catch (err) {
           // Handle errors (e.g., duplicate Cuit, foreign key)
            console.error('Error updating proveedor:', err);
            setError(err.message || `Error al actualizar el proveedor.`);
       } finally {
           setSavingData(false);
       }
       // Removed IPC listener setup and cleanup for updating
  };

  const handleCancelEdit = () => { // Keep this
       setEditingProveedorId(null);
       setEditedProveedorData({
           id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
       });
       setError(null); // Limpiar errores de edición
  };


  // --- Funcionalidad de Eliminación ---
  const handleDeleteClick = async () => { // Make the function async
       if (selectedProveedorId === null) return;

       if (window.confirm(`¿Está seguro de eliminar el proveedor con ID ${selectedProveedorId}? Si el proveedor tiene compras asociadas, no se podrá eliminar.`)) {
           setDeletingProveedorId(selectedProveedorId);
           setError(null);

           try {
               // Call the async API function for deleting
               const response = await electronAPI.deleteProveedor(selectedProveedorId); // New API call
               console.log(`Proveedor with ID ${selectedProveedorId} deleted successfully.`, response.success);
                // Handle success response

               setSelectedProveedorId(null); // Deseleccionar después de eliminar
               fetchProveedores(); // Recargar la lista

           } catch (err) {
               // Handle errors (e.g., foreign key constraint violation)
               console.error(`Error deleting proveedor with ID ${selectedProveedorId}:`, err);
               setError(err.message || `Error al eliminar el proveedor.`);
           } finally {
               setDeletingProveedorId(null);
           }
       }
       // Removed IPC listener setup and cleanup for deleting
   };


  // Mostrar formulario de agregar (Keep this)
  const handleNewProveedorClick = () => {
      setShowAddForm(true);
      setError(null);
      setNewProveedor({ Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '' });
      setSelectedProveedorId(null); // Deseleccionar cualquier proveedor al agregar
      setEditingProveedorId(null); // Cerrar edición si estaba abierta
  };

  // Cancelar formulario de agregar (Keep this)
  const handleCancelAdd = () => {
      setShowAddForm(false);
      setError(null);
  };


  return (
    // Usar flexbox para el layout de dos paneles
    <div className="container" style={{ display: 'flex', gap: '20px', height: '100%' }}> {/* Added height: '100%' */}
      {/* Panel Izquierdo: Lista de Proveedores y Formulario */}
       <div style={{
           // Ajustar tamaño similar a ListaClientes
           flex: selectedProveedorId === null ? '1 1 100%' : '1 1 50%',
           minWidth: selectedProveedorId === null ? 'auto' : '350px',
           paddingRight: selectedProveedorId === null ? '0' : '10px',
           borderRight: selectedProveedorId === null ? 'none' : '1px solid #424242',
           transition: 'flex-basis 0.3s ease-in-out',
           boxSizing: 'border-box',
       }}>
        <h2>Gestión de Proveedores</h2>

         {/* Botón para mostrar el formulario de agregar */}
        {!showAddForm && (
             <button onClick={handleNewProveedorClick} disabled={loading || loadingEditData || savingData || deletingProveedorId !== null}>
                 Nuevo Proveedor
             </button>
        )}

        {/* Formulario para Agregar Nuevo Proveedor (Condicional) */}
         {showAddForm && (
             <div style={{ flex: '1 1 100%' }}>
                 <h3>Agregar Nuevo Proveedor</h3>
                 <form onSubmit={handleSubmit}>
                   <div>
                     <label htmlFor="new-empresa">Empresa:</label>
                     <input type="text" id="new-empresa" name="Empresa" value={newProveedor.Empresa} onChange={handleInputChange} required disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div>
                     <label htmlFor="new-cuit">Cuit:</label>
                     <input type="text" id="new-cuit" name="Cuit" value={newProveedor.Cuit} onChange={handleInputChange} required disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div>
                     <label htmlFor="new-contacto">Contacto:</label>
                     <input type="text" id="new-contacto" name="Contacto" value={newProveedor.Contacto} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div>
                     <label htmlFor="new-telefono">Teléfono:</label>
                     <input type="text" id="new-telefono" name="Telefono" value={newProveedor.Telefono} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div>
                     <label htmlFor="new-mail">Mail:</label>
                     <input type="email" id="new-mail" name="Mail" value={newProveedor.Mail} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div>
                     <label htmlFor="new-direccion">Dirección:</label>
                     <input type="text" id="new-direccion" name="Direccion" value={newProveedor.Direccion} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingProveedorId !== null} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                      <button type="submit" disabled={savingData || loadingEditData || deletingProveedorId !== null}>Agregar Proveedor</button>
                      <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingProveedorId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white' }}>
                          Cancelar
                      </button>
                   </div>
                 </form>
             </div>
         )}


        {/* Mostrar errores generales */}
        {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

        {/* Mostrar Lista de Proveedores (Condicional) */}
         {!showAddForm && (
             <>
                 <h3>Proveedores Existentes</h3>

                 {/* Botones de Edición y Eliminación */}
                 <div style={{ margin: '20px 0' }}>
                     <button
                         onClick={handleEditClick}
                         disabled={selectedProveedorId === null || editingProveedorId !== null || loadingEditData || savingData || deletingProveedorId !== null}
                     >
                         Editar Proveedor Seleccionado
                     </button>
                     <button
                         onClick={handleDeleteClick}
                         disabled={selectedProveedorId === null || editingProveedorId !== null || loadingEditData || savingData || deletingProveedorId !== null}
                         style={{ marginLeft: '10px', backgroundColor: '#ef9a9a', color: '#212121' }}
                     >
                         Eliminar Proveedor Seleccionado
                     </button>
                 </div>

                 {loading && <p>Cargando proveedores...</p>}
                 {loadingEditData && <p>Cargando datos de proveedor para editar...</p>}
                 {savingData && <p>Guardando datos...</p>}
                 {deletingProveedorId && <p>Eliminando proveedor...</p>}


                 {!loading && proveedores.length > 0 && (
                   <table>
                     <thead>
                       <tr>
                         {/* Condicionalmente renderizar ID */}
                         {selectedProveedorId === null && <th>ID</th>}
                         <th>Empresa</th>
                         <th>Cuit</th>
                         {/* Ocultar columnas basado en ancho de ventana */}
                         {windowWidth > 900 && <th>Contacto</th>}
                         {windowWidth > 950 && <th>Teléfono</th>}
                         {windowWidth > 1100 && <th>Mail</th>}
                         {windowWidth > 1200 && <th>Dirección</th>}
                       </tr>
                     </thead>
                     <tbody>
                       {proveedores.map((proveedor) => (
                         <React.Fragment key={proveedor.id}>
                           <tr
                               onClick={() => handleRowClick(proveedor.id)}
                               style={{ cursor: 'pointer', backgroundColor: selectedProveedorId === proveedor.id ? '#424242' : 'transparent' }}
                           >
                             {/* Condicionalmente renderizar ID */}
                             {selectedProveedorId === null && <td>{proveedor.id}</td>}
                             <td>{proveedor.Empresa}</td>
                             <td>{proveedor.Cuit}</td>
                             {windowWidth > 900 && <td>{proveedor.Contacto}</td>}
                             {windowWidth > 950 && <td>{proveedor.Telefono}</td>}
                             {windowWidth > 1100 && <td>{proveedor.Mail}</td>}
                             {windowWidth > 1200 && <td>{proveedor.Direccion}</td>}
                           </tr>
                            {/* Fila de formulario de edición inline */}
                           {editingProveedorId === proveedor.id && !showAddForm && (
                               <tr>
                                    {/* Ajustar colspan dinámicamente */}
                                   <td colSpan={
                                        (selectedProveedorId === null ? 1 : 0) +
                                        1 + // Empresa
                                        1 + // Cuit
                                        (windowWidth > 900 ? 1 : 0) + // Contacto
                                        (windowWidth > 950 ? 1 : 0) + // Telefono
                                        (windowWidth > 1100 ? 1 : 0) + // Mail
                                        (windowWidth > 1200 ? 1 : 0)   // Direccion
                                    }>
                                       <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                           <h4>Editar Proveedor (ID: {proveedor.id})</h4>
                                           <form onSubmit={handleSaveEdit}>
                                                <div>
                                                   <label htmlFor={`edit-empresa-${proveedor.id}`}>Empresa:</label>
                                                   <input type="text" id={`edit-empresa-${proveedor.id}`} name="Empresa" value={editedProveedorData.Empresa || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                               </div>
                                               <div>
                                                   <label htmlFor={`edit-cuit-${proveedor.id}`}>Cuit:</label>
                                                   <input type="text" id={`edit-cuit-${proveedor.id}`} name="Cuit" value={editedProveedorData.Cuit || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                               </div>
                                               <div>
                                                   <label htmlFor={`edit-contacto-${proveedor.id}`}>Contacto:</label>
                                                   <input type="text" id={`edit-contacto-${proveedor.id}`} name="Contacto" value={editedProveedorData.Contacto || ''} onChange={handleEditFormChange} disabled={savingData} />
                                               </div>
                                                <div>
                                                   <label htmlFor={`edit-telefono-${proveedor.id}`}>Teléfono:</label>
                                                   <input type="text" id={`edit-telefono-${proveedor.id}`} name="Telefono" value={editedProveedorData.Telefono || ''} onChange={handleEditFormChange} disabled={savingData} />
                                               </div>
                                                <div>
                                                   <label htmlFor={`edit-mail-${proveedor.id}`}>Mail:</label>
                                                   <input type="email" id={`edit-mail-${proveedor.id}`} name="Mail" value={editedProveedorData.Mail || ''} onChange={handleEditFormChange} disabled={savingData} />
                                               </div>
                                                <div>
                                                   <label htmlFor={`edit-direccion-${proveedor.id}`}>Dirección:</label>
                                                   <input type="text" id={`edit-direccion-${proveedor.id}`} name="Direccion" value={editedProveedorData.Direccion || ''} onChange={handleEditFormChange} disabled={savingData} />
                                               </div>
                                               <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                    <button type="submit" disabled={savingData}>Guardar Cambios</button>
                                                    <button type="button" onClick={handleCancelEdit} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white' }}>Cancelar Edición</button>
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
                 {!loading && proveedores.length === 0 && !error && <p>No hay proveedores registrados.</p>}
             </>
         )}
       </div> {/* Fin Panel Izquierdo */}


       {/* Panel Derecho: Detalles de Compras del Proveedor */}
       {/* Renderizar solo si un proveedor está seleccionado y no se está agregando uno nuevo */}
       {/* NOTA: El componente SupplierPurchasesDetails también necesitará ser adaptado a la API HTTP */}
       {selectedProveedorId !== null && !showAddForm && (
           <div style={{
               // Ajustar tamaño similar a ListaClientes
               flex: '1 1 50%',
               minWidth: '350px',
               overflowY: 'auto',
               maxHeight: 'calc(100vh - 120px)',
               paddingLeft: '10px',
               boxSizing: 'border-box',
           }}>
                {/* Renderizar el nuevo componente SupplierPurchasesDetails */}
               <SupplierPurchasesDetails
                   proveedorId={selectedProveedorId}
                    // Buscar el nombre del proveedor seleccionado para pasarlo como prop
                   proveedorName={proveedores.find(p => p.id === selectedProveedorId)?.Empresa}
               />
           </div>
       )}

        {/* Mensaje cuando no hay proveedor seleccionado */}
        {selectedProveedorId === null && !showAddForm && !loading && proveedores.length > 0 && (
             <div style={{
                 flex: '1 1 50%',
                 minWidth: '350px',
                 paddingLeft: '10px',
                 boxSizing: 'border-box',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 textAlign: 'center',
                 borderLeft: '1px solid #424242',
             }}>
                <p>Seleccione un proveedor de la lista para ver sus compras.</p>
             </div>
        )}


    </div>
  );
}

export default ListaProveedores;