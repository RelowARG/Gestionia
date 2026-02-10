// src/components/ListaGastos.js (Modified for Backend API Communication)
import React, { useState, useEffect } from 'react';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaGastos() {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGastoId, setSelectedGastoId] = useState(null);
    const [editingGastoId, setEditingGastoId] = useState(null);

    const [newGastoData, setNewGastoData] = useState({
        Fecha: '',
        Motivo: '',
        Tipo: '', // Valor por defecto vacío para el select de Tipo
        Forma_Pago: '', // Campo Forma_Pago
        Cotizacion_Dolar: '',
        Monto_Pesos: '',
        Monto_Dolares: '', // Se calculará automáticamente
    });

    const [editedGastoData, setEditedGastoData] = useState({
         id: null,
         Fecha: '',
         Motivo: '',
         Tipo: '',
         Forma_Pago: '', // Campo Forma_Pago
         Cotizacion_Dolar: '',
         Monto_Pesos: '',
         Monto_Dolares: '', // Se recalculará al cargar y al editar
    });

    const [loadingEditData, setLoadingEditData] = useState(false);
    const [savingData, setSavingData] = useState(false);
    const [deletingGastoId, setDeletingGastoId] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);

    // Tipos de gastos para el dropdown (Keep this)
    const tiposGasto = [
        'operativo',
        'stock/pedido',
        'servicio limpieza',
        'prestamos',
        'varios',
    ];

     // Formas de pago para el dropdown (Keep this)
    const formasPago = [
        'Efectivo',
        'MP',
        'UALA',
        'ICBC',
        'Transferencia Bancaria', // Added as seen in CashFlow
        'Cheque', // Added as seen in CashFlow
        'Otro', // Added as seen in CashFlow
    ];


    // Función para obtener los gastos usando la nueva API
    const fetchGastos = async () => { // Make the function async
        setLoading(true);
        setError(null);
        setSelectedGastoId(null);
        setEditingGastoId(null);
         // Reset edit form data, incluyendo Forma_Pago
        setEditedGastoData({
             id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: ''
        });

        try {
            // Call the async API function and await its result
            const data = await electronAPI.getGastos(); // New API call (GET /gastos)
            console.log('Gastos cargados:', data);
            setGastos(data); // Data is the direct response from the backend API

        } catch (err) {
            // Handle errors from the API call
            console.error('Error fetching gastos:', err);
            setError(err.message || 'Error al cargar los gastos.');
            setGastos([]); // Clear the list on error
             setSelectedGastoId(null); // Clear selection on error
        } finally {
            setLoading(false); // Always set loading to false
        }
        // Removed all IPC listener setup and cleanup for fetching
    };

    // Efecto para cargar los gastos iniciales
    useEffect(() => {
        // The fetchGastos function is now async and called directly
        fetchGastos();

        // Removed IPC listener setup and cleanup from here
        // return () => { electronAPI.removeAllGetGastosListeners(); }; // REMOVED
    }, []); // Empty dependency array means this effect runs once on mount

    // Manejar clic en una fila de la tabla (Keep this)
    const handleRowClick = (gastoId) => {
        if (selectedGastoId === gastoId) {
            setSelectedGastoId(null);
            setEditingGastoId(null);
            setEditedGastoData({
                id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: ''
            });
        } else {
            setSelectedGastoId(gastoId);
            if (editingGastoId !== null && editingGastoId !== gastoId) {
                setEditingGastoId(null);
                 setEditedGastoData({
                     id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: ''
                 });
            }
        }
        setError(null);
    };

    // Manejar cambio en los inputs del formulario Nuevo Gasto (Keep calculation logic)
    const handleNewGastoInputChange = (e) => {
        const { name, value } = e.target;
        let updatedNewGastoData = { ...newGastoData, [name]: value };

        // Calcular Monto_Dolares si cambian Monto_Pesos o Cotizacion_Dolar
        if (name === 'Monto_Pesos' || name === 'Cotizacion_Dolar') {
            const montoPesos = parseFloat(updatedNewGastoData.Monto_Pesos);
            const cotizacion = parseFloat(updatedNewGastoData.Cotizacion_Dolar);
            if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) {
                updatedNewGastoData.Monto_Dolares = (montoPesos / cotizacion).toFixed(2);
            } else {
                updatedNewGastoData.Monto_Dolares = '';
            }
             // Monto ARS is just Monto Pesos for Gastos
             if (!isNaN(montoPesos)) {
                  updatedNewGastoData.Monto_ARS = montoPesos.toFixed(2);
             } else {
                  updatedNewGastoData.Monto_ARS = '';
             }
        }

        setNewGastoData(updatedNewGastoData);
    };

    // Manejar envío del formulario Nuevo Gasto
    const handleAddGastoSubmit = async (e) => { // Make the function async
        e.preventDefault();
        setSavingData(true);
        setError(null);

        // Validación básica, incluir Forma_Pago
        if (!newGastoData.Fecha || !newGastoData.Motivo || !newGastoData.Tipo || !newGastoData.Forma_Pago || newGastoData.Monto_Pesos === '' || isNaN(parseFloat(newGastoData.Monto_Pesos)) || parseFloat(newGastoData.Monto_Pesos) < 0 || newGastoData.Cotizacion_Dolar === '' || isNaN(parseFloat(newGastoData.Cotizacion_Dolar)) || parseFloat(newGastoData.Cotizacion_Dolar) <= 0) {
            setError('Fecha, Motivo, Tipo, Forma de Pago, Monto Pesos (>=0) y Cotización Dólar (>0) son campos obligatorios.');
            setSavingData(false);
            return;
        }

        // Los valores numéricos se parsean en el backend antes de insertar, pero asegurarse aquí también es válido
         if (newGastoData.Monto_Dolares !== '' && isNaN(parseFloat(newGastoData.Monto_Dolares))) {
             setError('Error interno: Monto Dólares calculado no es un número válido.');
             setSavingData(false);
             return;
         }
        // Validate Monto ARS
         if (newGastoData.Monto_ARS !== '' && isNaN(parseFloat(newGastoData.Monto_ARS)) || parseFloat(newGastoData.Monto_ARS) < 0) {
              setError('Error interno: Monto ARS calculado no es un número válido (>=0).');
              setSavingData(false);
              return;
         }


        // Enviar datos al backend (numerical fields will be parsed in backend)
        try {
            // Call the async API function for adding
           const response = await electronAPI.addGasto(newGastoData); // New API call (POST /gastos)
           console.log('Gasto added successfully:', response.success);
           // Handle success response (e.g., { success: { id: newId } })

            // Limpiar formulario, incluyendo Forma_Pago
            setNewGastoData({
                Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: '', Monto_ARS: '' // Included Monto_ARS in reset
            });
            setShowAddForm(false); // Opcional: cerrar formulario después de agregar
            fetchGastos(); // Actualizar la lista

        } catch (err) {
             console.error('Error adding gasto:', err);
            setError(err.message || `Error al agregar el gasto.`);
        } finally {
            setSavingData(false);
        }
        // Removed IPC listener setup and cleanup for adding
    };

    // Manejar clic en Editar Gasto
    const handleEditClick = async () => { // Make the function async
        if (selectedGastoId === null) return;

        setEditingGastoId(selectedGastoId);
        setLoadingEditData(true);
        setError(null);

        try {
            // Call the async API function to get gasto data by ID
            const data = await electronAPI.getGastoById(selectedGastoId); // New API call (GET /gastos/:id)
            console.log(`Gasto ID ${selectedGastoId} data loaded:`, data);
             // Populate editedGastoData, ensuring numerical fields are converted to string for inputs
             // Incluir Forma_Pago en la carga
            const gastoData = data; // Data is the direct response
            setEditedGastoData({
                id: gastoData.id,
                Fecha: gastoData.Fecha || '',
                Motivo: gastoData.Motivo || '',
                Tipo: gastoData.Tipo || '',
                Forma_Pago: gastoData.Forma_Pago || '', // Cargar Forma_Pago
                Cotizacion_Dolar: gastoData.Cotizacion_Dolar !== null ? String(gastoData.Cotizacion_Dolar) : '',
                Monto_Pesos: gastoData.Monto_Pesos !== null ? String(gastoData.Monto_Pesos) : '',
                 Monto_Dolares: gastoData.Monto_Dolares !== null ? String(gastoData.Monto_Dolares) : '', // Load calculated value
                 Monto_ARS: gastoData.Monto_ARS !== null ? String(gastoData.Monto_ARS) : '', // Load Monto_ARS
            });
        } catch (err) {
             console.error(`Error fetching gasto by ID ${selectedGastoId}:`, err);
             setError(err.message || `Error al cargar los datos del gasto.`);
             setEditingGastoId(null);
             setSelectedGastoId(null);
              setEditedGastoData({
                  id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: '', Monto_ARS: ''
              });
        } finally {
            setLoadingEditData(false);
        }
        // Removed IPC listener setup and cleanup for fetching data for edit
    };

    // Manejar cambio en los inputs del formulario Editar Gasto (Keep calculation logic)
    const handleEditFormChange = (e) => {
         const { name, value } = e.target;
         let updatedEditedGastoData = { ...editedGastoData, [name]: value };

         // Recalcular Monto_Dolares si cambian Monto_Pesos o Cotizacion_Dolar
         if (name === 'Monto_Pesos' || name === 'Cotizacion_Dolar') {
             const montoPesos = parseFloat(updatedEditedGastoData.Monto_Pesos);
             const cotizacion = parseFloat(updatedEditedGastoData.Cotizacion_Dolar);
             if (!isNaN(montoPesos) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedEditedGastoData.Monto_Dolares = (montoPesos / cotizacion).toFixed(2);
             } else {
                 updatedEditedGastoData.Monto_Dolares = '';
             }
              // Monto ARS is just Monto Pesos for Gastos
             if (!isNaN(montoPesos)) {
                 updatedEditedGastoData.Monto_ARS = montoPesos.toFixed(2);
             } else {
                 updatedEditedGastoData.Monto_ARS = '';
             }
         }

         setEditedGastoData(updatedEditedGastoData);
    };

    // Manejar guardar cambios del formulario Editar Gasto
    const handleSaveEdit = async (e) => { // Make the function async
        e.preventDefault();
        setSavingData(true);
        setError(null);

         // Validación básica, incluir Forma_Pago
        if (!editedGastoData.Fecha || !editedGastoData.Motivo || !editedGastoData.Tipo || !editedGastoData.Forma_Pago || editedGastoData.Monto_Pesos === '' || isNaN(parseFloat(editedGastoData.Monto_Pesos)) || parseFloat(editedGastoData.Monto_Pesos) < 0 || editedGastoData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedGastoData.Cotizacion_Dolar)) || parseFloat(editedGastoData.Cotizacion_Dolar) <= 0) {
             setError('Fecha, Motivo, Tipo, Forma de Pago, Monto Pesos (>=0) y Cotización Dólar (>0) son campos obligatorios.');
             setSavingData(false);
             return;
        }
         if (editedGastoData.Monto_Dolares !== '' && isNaN(parseFloat(editedGastoData.Monto_Dolares))) {
              setError('Error interno: Monto Dólares calculado no es un número válido.');
              setSavingData(false);
              return;
          }
         // Validate Monto ARS
         if (editedGastoData.Monto_ARS !== '' && isNaN(parseFloat(editedGastoData.Monto_ARS)) || parseFloat(editedGastoData.Monto_ARS) < 0) {
             setError('Error interno: Monto ARS calculado no es un número válido (>=0).');
             setSavingData(false);
             return;
         }


        // Prepare data to send to backend (numerical fields will be parsed in backend)
         const dataToSend = {
             ...editedGastoData,
             // Ensure numerical fields are parsed as floats before sending
             Monto_Pesos: parseFloat(editedGastoData.Monto_Pesos),
             Cotizacion_Dolar: parseFloat(editedGastoData.Cotizacion_Dolar),
              // Monto_Dolares and Monto_ARS should be calculated in the backend as well for consistency
             Monto_Dolares: parseFloat(editedGastoData.Monto_Dolares) || 0, // Send calculated or 0 if invalid
             Monto_ARS: parseFloat(editedGastoData.Monto_ARS) || 0, // Send calculated or 0 if invalid
         };

        try {
            // Call the async API function for updating
            // The backend expects the ID in the URL and data in the body
            const response = await electronAPI.updateGasto(dataToSend.id, dataToSend); // New API call (PUT /gastos/:id)
            console.log('Gasto updated successfully:', response.success);
            // Handle success response

            setEditingGastoId(null); // Cerrar formulario de edición
             setEditedGastoData({
                 id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: '', Monto_ARS: ''
             });
            setSelectedGastoId(null); // Deseleccionar
            fetchGastos(); // Actualizar la lista

        } catch (err) {
             console.error('Error updating gasto:', err);
             setError(err.message || `Error al actualizar el gasto.`);
        } finally {
            setSavingData(false);
        }
        // Removed IPC listener setup and cleanup for updating
    };

    // Manejar cancelar edición (Keep this)
    const handleCancelEdit = () => {
        setEditingGastoId(null);
         setEditedGastoData({
             id: null, Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: '', Monto_ARS: ''
         });
        setError(null);
    };

    // Manejar clic en Eliminar Gasto
    const handleDeleteClick = async () => { // Make the function async
        if (selectedGastoId === null) return;

        if (window.confirm(`¿Está seguro de eliminar el gasto con ID ${selectedGastoId}?`)) {
            setDeletingGastoId(selectedGastoId);
            setError(null);

            try {
                // Call the async API function for deleting
                const response = await electronAPI.deleteGasto(selectedGastoId); // New API call (DELETE /gastos/:id)
                console.log(`Gasto with ID ${selectedGastoId} deleted successfully.`, response.success);
                // Handle success response

                setSelectedGastoId(null); // Deseleccionar
                fetchGastos(); // Actualizar la lista

            } catch (err) {
                 console.error(`Error deleting gasto with ID ${selectedGastoId}:`, err);
                 setError(err.message || `Error al eliminar el gasto.`);
            } finally {
                setDeletingGastoId(null);
            }
        }
        // Removed IPC listener setup and cleanup for deleting
    };

    // Manejar clic en "Nuevo Gasto" (Keep this)
    const handleNewGastoClick = () => {
        setShowAddForm(true);
        setError(null);
        // Reset new form data, incluyendo Forma_Pago y Monto_ARS
         setNewGastoData({
             Fecha: '', Motivo: '', Tipo: '', Forma_Pago: '', Cotizacion_Dolar: '', Monto_Pesos: '', Monto_Dolares: '', Monto_ARS: ''
         });
        setSelectedGastoId(null); // Deseleccionar cualquier elemento
        setEditingGastoId(null); // Cerrar edición si estaba abierta
    };

    // Manejar clic en "Cancelar" en el formulario de agregar (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
    };


    return (
        <div className="container">
            <h2>Gestión de Gastos</h2>

            {/* Botón para mostrar el formulario de agregar */}
            {!showAddForm && (
                <button onClick={handleNewGastoClick} disabled={loading || loadingEditData || savingData || deletingGastoId !== null}>
                    Nuevo Gasto
                </button>
            )}

            {/* Formulario para Agregar Nuevo Gasto (Renderizado Condicional) */}
            {showAddForm && (
                <>
                    <h3>Agregar Nuevo Gasto</h3>
                    <form onSubmit={handleAddGastoSubmit}>
                        <div>
                            <label htmlFor="new-fecha">Fecha:</label>
                            <input type="date" id="new-fecha" name="Fecha" value={newGastoData.Fecha} onChange={handleNewGastoInputChange} required disabled={savingData} />
                        </div>
                        <div>
                            <label htmlFor="new-motivo">Motivo:</label>
                            <input type="text" id="new-motivo" name="Motivo" value={newGastoData.Motivo} onChange={handleNewGastoInputChange} required disabled={savingData} />
                        </div>
                        <div>
                            <label htmlFor="new-tipo">Tipo:</label>
                            <select id="new-tipo" name="Tipo" value={newGastoData.Tipo} onChange={handleNewGastoInputChange} required disabled={savingData}>
                                <option value="">Seleccione Tipo</option>
                                {tiposGasto.map(tipo => (
                                    <option key={tipo} value={tipo}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                         {/* Campo: Forma de Pago */}
                         <div>
                             <label htmlFor="new-forma-pago">Forma de Pago:</label>
                             <select id="new-forma-pago" name="Forma_Pago" value={newGastoData.Forma_Pago} onChange={handleNewGastoInputChange} required disabled={savingData}>
                                 <option value="">Seleccione Forma de Pago</option>
                                 {formasPago.map(forma => (
                                     <option key={forma} value={forma}>{forma}</option>
                                 ))}
                             </select>
                         </div>
                        <div>
                            <label htmlFor="new-monto-pesos">Monto Pesos:</label>
                            <input type="number" id="new-monto-pesos" name="Monto_Pesos" value={newGastoData.Monto_Pesos} onChange={handleNewGastoInputChange} required disabled={savingData} min="0" step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="new-cotizacion-dolar">Cotización Dólar:</label>
                            <input type="number" id="new-cotizacion-dolar" name="Cotizacion_Dolar" value={newGastoData.Cotizacion_Dolar} onChange={handleNewGastoInputChange} required disabled={savingData} min="0.01" step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="new-monto-dolares">Monto Dólares:</label>
                            {/* Este campo es de solo lectura, se calcula automáticamente */}
                            <input type="text" id="new-monto-dolares" name="Monto_Dolares" value={newGastoData.Monto_Dolares} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                        </div>
                        {/* Asegurarse de mostrar Monto ARS también en el formulario de agregar */}
                         <div>
                             <label htmlFor="new-monto-ars">Monto ARS:</label>
                             <input
                                 type="text"
                                 id="new-monto-ars"
                                 name="Monto_ARS"
                                 value={newGastoData.Monto_ARS}
                                 readOnly
                                 disabled={true}
                                 style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                             />
                         </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                            <button type="submit" disabled={savingData}>Agregar Gasto</button>
                            <button type="button" onClick={handleCancelAdd} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </>
            )}

            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

            {/* Lista de Gastos Existentes */}
            {!showAddForm && (
                <>
                    <h3>Gastos Existentes</h3>

                    {/* Botones de Editar y Eliminar */}
                    <div style={{ margin: '20px 0' }}>
                        <button
                            onClick={handleEditClick}
                            disabled={selectedGastoId === null || loadingEditData || savingData || deletingGastoId !== null}
                        >
                            Editar Gasto Seleccionado
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            disabled={selectedGastoId === null || loadingEditData || savingData || deletingGastoId !== null}
                            style={{ marginLeft: '10px' }}
                        >
                            Eliminar Gasto Seleccionado
                        </button>
                    </div>

                    {loading && <p>Cargando gastos...</p>}
                    {loadingEditData && <p>Cargando datos del gasto para editar...</p>}
                    {savingData && <p>Guardando cambios del gasto...</p>}
                    {deletingGastoId && <p>Eliminando gasto...</p>}


                    {/* Renderizado condicional de la tabla o el mensaje */}
                    {!loading && ( // Si no está cargando...
                        gastos.length > 0 ? ( // ...y hay gastos, muestra la tabla
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                        <th>Tipo</th>
                                         <th>Forma de Pago</th> {/* Columna Forma de Pago */}
                                        <th>Monto Pesos</th>
                                        <th>Cotización Dólar</th>
                                        <th>Monto Dólares</th>
                                         <th>Monto ARS</th> {/* Columna Monto ARS */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {gastos.map((gasto) => (
                                         <React.Fragment key={gasto.id}>
                                            <tr
                                                onClick={() => handleRowClick(gasto.id)}
                                                style={{ cursor: 'pointer', backgroundColor: selectedGastoId === gasto.id ? '#424242' : 'transparent' }}
                                            >
                                                <td>{gasto.Fecha}</td>
                                                <td>{gasto.Motivo}</td>
                                                <td>{gasto.Tipo}</td>
                                                <td>{gasto.Forma_Pago || 'N/A'}</td> {/* Mostrar Forma de Pago */}
                                                <td>{gasto.Monto_Pesos !== null ? gasto.Monto_Pesos.toFixed(2) : 'N/A'}</td>
                                                <td>{gasto.Cotizacion_Dolar !== null ? gasto.Cotizacion_Dolar.toFixed(2) : 'N/A'}</td>
                                                <td>{gasto.Monto_Dolares !== null ? gasto.Monto_Dolares.toFixed(2) : 'N/A'}</td>
                                                 <td>{gasto.Monto_ARS !== null ? gasto.Monto_ARS.toFixed(2) : 'N/A'}</td> {/* Mostrar Monto ARS */}
                                            </tr>
                                            {/* Formulario de edición inline */}
                                            {editingGastoId === gasto.id && !showAddForm && (
                                                 <tr>
                                                    <td colSpan="8"> {/* Ajustar el colSpan al número de columnas (8) */}
                                                         <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                                            <h4>Editar Gasto (ID: {gasto.id})</h4>
                                                            <form>
                                                                <div>
                                                                    <label htmlFor={`edit-fecha-${gasto.id}`}>Fecha:</label>
                                                                    <input type="date" id={`edit-fecha-${gasto.id}`} name="Fecha" value={editedGastoData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`edit-motivo-${gasto.id}`}>Motivo:</label>
                                                                    <input type="text" id={`edit-motivo-${gasto.id}`} name="Motivo" value={editedGastoData.Motivo || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`edit-tipo-${gasto.id}`}>Tipo:</label>
                                                                    <select id={`edit-tipo-${gasto.id}`} name="Tipo" value={editedGastoData.Tipo || ''} onChange={handleEditFormChange} required disabled={savingData}>
                                                                        <option value="">Seleccione Tipo</option>
                                                                        {tiposGasto.map(tipo => (
                                                                            <option key={tipo} value={tipo}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                 {/* Campo de Edición: Forma de Pago */}
                                                                 <div>
                                                                     <label htmlFor={`edit-forma-pago-${gasto.id}`}>Forma de Pago:</label>
                                                                     <select id={`edit-forma-pago-${gasto.id}`} name="Forma_Pago" value={editedGastoData.Forma_Pago || ''} onChange={handleEditFormChange} required disabled={savingData}>
                                                                         <option value="">Seleccione Forma de Pago</option>
                                                                         {formasPago.map(forma => (
                                                                             <option key={forma} value={forma}>{forma}</option>
                                                                         ))}
                                                                     </select>
                                                                 </div>
                                                                 <div>
                                                                    <label htmlFor={`edit-monto-pesos-${gasto.id}`}>Monto Pesos:</label>
                                                                    <input type="number" id={`edit-monto-pesos-${gasto.id}`} name="Monto_Pesos" value={editedGastoData.Monto_Pesos || ''} onChange={handleEditFormChange} required disabled={savingData} min="0" step="0.01" />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`edit-cotizacion-dolar-${gasto.id}`}>Cotización Dólar:</label>
                                                                    <input type="number" id={`edit-cotizacion-dolar-${gasto.id}`} name="Cotizacion_Dolar" value={editedGastoData.Cotizacion_Dolar || ''} onChange={handleEditFormChange} required disabled={savingData} min="0.01" step="0.01" />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`edit-monto-dolares-${gasto.id}`}>Monto Dólares:</label>
                                                                    {/* Campo de solo lectura */}
                                                                     <input type="text" id={`edit-monto-dolares-${gasto.id}`} name="Monto_Dolares" value={editedGastoData.Monto_Dolares || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                                                </div>
                                                                 {/* Campo de solo lectura: Monto ARS */}
                                                                 <div>
                                                                    <label htmlFor={`edit-monto-ars-${gasto.id}`}>Monto ARS:</label>
                                                                    <input
                                                                        type="text"
                                                                        id={`edit-monto-ars-${gasto.id}`}
                                                                        name="Monto_ARS"
                                                                        value={editedGastoData.Monto_ARS || ''}
                                                                        readOnly
                                                                        disabled={true}
                                                                         style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                                    />
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
                        ) : ( // ...si no hay gastos y no está cargando, muestra el mensaje (y no hay error)
                            !loading && !error && <p>No hay gastos registrados.</p>
                        )
                    )}
                </>
            )}
        </div>
    );
}

export default ListaGastos;