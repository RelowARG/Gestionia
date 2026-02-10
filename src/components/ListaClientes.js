// src/components/ListaClientes.js (Frontend Filtering Implemented)
import React, { useState, useEffect } from 'react';
import ClientSalesDetails from './ClientSalesDetails'; // Import the new component

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaClientes() {
  // --- MODIFIED STATE: Store all clients and displayed clients ---
  const [allClientes, setAllClientes] = useState([]); // Stores the full list fetched initially
  const [displayedClientes, setDisplayedClientes] = useState([]); // Stores the currently displayed (filtered) list
  // --- END MODIFIED STATE ---

  // --- NEW STATE FOR SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  // --- END NEW STATE ---

  // Removed the original 'clientes' state as we now use allClientes and displayedClientes

  const [newClient, setNewClient] = useState({
    Empresa: '',
    Cuit: '',
    Contacto: '',
    Telefono: '',
    Mail: '',
    Direccion: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [editingClientId, setEditingClientId] = useState(null);
  // editedClientData state uses the new DB column names
  const [editedClientData, setEditedClientData] = useState({
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
  const [deletingClientId, setDeletingClientId] = useState(null);

  // New state to control visibility of the add form
  const [showAddForm, setShowAddForm] = useState(false);

  // State to track window width for responsive table columns
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);


  // Effect to update window width on resize (Keep this)
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  // --- Function to fetch ALL clients initially and after changes ---
  const fetchClients = async () => { // Make the function async
    setLoading(true);
    setError(null);
    // No deseleccionamos el cliente seleccionado aquí si el modo de edición o adición no está activo,
    // para que los detalles de ventas se mantengan visibles al refrescar la lista (si el cliente sigue ahí).
    // Si estamos añadiendo o editando, sí deseleccionamos para evitar inconsistencias.
    if (!showAddForm && editingClientId === null) {
       // Don't change selectedClientId
    } else {
        setSelectedClientId(null);
        setEditingClientId(null);
    }

    // Reset edited data structure with new DB column names
    setEditedClientData({
        id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
    });

    try {
        // Call the async API function to get ALL clients
        const data = await electronAPI.getClients(); // Fetch all clients (backend doesn't filter)
        console.log('All clients loaded:', data);
        setAllClientes([...data]); // Store the full list
        // The filtering useEffect will automatically update displayedClientes
        // No need to setDisplayedClientes here

        // If there was a selected client before refreshing and it's still in the list, maintain the selection
        if (selectedClientId && data.find(c => c.id === selectedClientId)) {
             // selectedClientId state is already set, no need to do anything
             console.log(`[ListaClientes] Kept selected client ID: ${selectedClientId}`);
        } else if (selectedClientId !== null) {
             // If the selected client no longer exists in the list or there was no prior selection,
             // and selectedClientId was not null before, clear the selection.
            setSelectedClientId(null);
             console.log('[ListaClientes] Cleared selected client because it was not found after refresh.');
        }
         // If selectedClientId was already null, do nothing.

    } catch (err) {
        // Handle errors from the API call
        console.error('Error fetching clients:', err);
        // Check if the error has a message property, use a default message otherwise
        setError(err.message || 'Error al cargar los clientes.');
        setAllClientes([]); // Clear the full list on error
        setDisplayedClientes([]); // Clear displayed list on error
        setSelectedClientId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false when the fetch is complete (success or error)
    }
  };

  // Effect to fetch ALL clients when the component mounts
  useEffect(() => {
    console.log('Initial fetchClients useEffect triggered.');
    fetchClients();
  }, []); // Empty dependency array: runs only once on mount


   // --- NEW useEffect for Frontend Filtering ---
   // This effect runs whenever the search term or the full client list changes
   useEffect(() => {
       console.log('Filtering clients useEffect triggered. Search term:', searchTerm);
       if (searchTerm === '') {
           setDisplayedClientes(allClientes); // If search term is empty, show all clients
       } else {
           const lowerCaseSearchTerm = searchTerm.toLowerCase();
           // Filter based on Empresa, Cuit, Contacto, Telefono, Mail, Direccion
           const filtered = allClientes.filter(client =>
               (client.Empresa && String(client.Empresa).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (client.Cuit && String(client.Cuit).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (client.Contacto && String(client.Contacto).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (client.Telefono && String(client.Telefono).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (client.Mail && String(client.Mail).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (client.Direccion && String(client.Direccion).toLowerCase().includes(lowerCaseSearchTerm))
           );
           setDisplayedClientes(filtered); // Update displayed list with filtered results
       }
   }, [searchTerm, allClientes]); // Re-run effect when searchTerm or allClientes changes
   // --- END NEW useEffect ---


  // Handle form input changes (for adding new client) (Keep this)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient({ ...newClient, [name]: value }); // Updates newClient state with new column names
  };

  // Handle form submission (for adding new client)
  const handleSubmit = async (e) => { // Make the function async
    e.preventDefault();
    setError(null);

    // MODIFIED VALIDATION: Cuit is no longer required
    if (!newClient.Empresa) { // Use new column names for validation
      setError('La Empresa es obligatoria.');
      return;
    }

    setSavingData(true); // Set saving state

    try {
        // Prepare data for submission - send null if Cuit is an empty string
        const dataToSend = {
            ...newClient,
            Cuit: newClient.Cuit === '' ? null : newClient.Cuit // Send null if empty string
        };

        // Call the async API function for adding
        const response = await electronAPI.addClient(dataToSend); // Use dataToSend
        console.log('Client added successfully:', response.success);

        // Clear form using new column names
        setNewClient({ Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '' });
        setShowAddForm(false); // Hide the add form after successful submission
        fetchClients(); // Refresh the FULL list after adding

    } catch (err) {
        // Handle errors from the API call (e.g., duplicate Cuit)
        console.error('Error adding client:', err);
         // The backend returns { error: "message" } on failure, access err.message
        setError(err.message || 'Error al agregar el cliente.');
    } finally {
        setSavingData(false); // Reset saving state when the operation is complete
    }
  };

  // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (clientId) => {
       if (editingClientId !== null && editingClientId === clientId) {
           // If the clicked row is currently being edited, cancel editing
           handleCancelEdit();
       } else if (selectedClientId === clientId) {
           // If the already selected row is clicked again, deselect it
           setSelectedClientId(null);
       } else {
           // Select the clicked row
           setSelectedClientId(clientId);
           // Reset edited data structure for the newly selected client (will be populated on edit click)
           setEditedClientData({
               id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
           });
       }
        setError(null); // Clear errors on row selection change
   };


  // --- Edit Functionality ---

  // Handle click on Edit button (now uses selectedClientId)
  const handleEditClick = async () => { // Make the function async
      if (selectedClientId === null) return; // Should be disabled, but good practice

      setEditingClientId(selectedClientId);
      setLoadingEditData(true);
      setError(null);

      try {
           // Call the async API function to get client data by ID
          const data = await electronAPI.getClientById(selectedClientId); // New API call
           console.log(`Client ID ${selectedClientId} data loaded:`, data);
           // Populate editedClientData using new DB column names from fetched data
          setEditedClientData(data); // Data is the direct response
      } catch (err) {
          // Handle errors
          console.error(`Error fetching client by ID ${selectedClientId}:`, err);
          setError(err.message || `Error al cargar los datos del cliente.`);
          setEditingClientId(null);
          setSelectedClientId(null); // Deselect on error
           // Reset edited data structure
          setEditedClientData({
              id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
          });
      } finally {
          setLoadingEditData(false); // Always set loading to false
      }
   };


  // Handle changes in the edit form (uses editedClientData state with new DB column names) (Keep this)
  const handleEditFormChange = (e) => {
      const { name, value } = e.target;
      setEditedClientData({ ...editedClientData, [name]: value }); // Updates state with new column names
  };

  // Handle saving the edited client (uses editedClientData state with new DB column names)
  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault(); // Prevent default form submission
      setSavingData(true);
      setError(null);

      // MODIFIED VALIDATION: Cuit is no longer required
      if (!editedClientData.Empresa) {
           setError('Empresa es obligatoria.');
           setSavingData(false);
           return;
      }

      try {
          // Prepare data for submission - send null if Cuit is an empty string
          const dataToSend = {
              ...editedClientData,
              Cuit: editedClientData.Cuit === '' ? null : editedClientData.Cuit // Send null if empty string
          };

          // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
          const response = await electronAPI.updateClient(dataToSend.id, dataToSend); // Use dataToSend
           console.log('Client updated successfully:', response.success);

          setEditingClientId(null);
           // Reset edited data structure
          setEditedClientData({
              id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
          });
          // Keep selectedClientId as is, so the sales details remain visible (or could deselect)
          // setSelectedClientId(null); // Uncomment to deselect after saving
          fetchClients(); // Refresh the FULL list after saving

      } catch (err) {
          // Handle errors (e.g., duplicate Cuit)
           console.error('Error updating client:', err);
          setError(err.message || `Error al actualizar el cliente.`);
      } finally {
          setSavingData(false); // Reset saving state
      }
  };

  // Handle cancelling edit mode (Keep this)
  const handleCancelEdit = () => {
      setEditingClientId(null);
      // Reset edited data structure
      setEditedClientData({
          id: null, Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '',
      });
      setError(null); // Clear any edit-related errors
  };


  // --- Delete Functionality ---

  // Handle click on Delete button (now uses selectedClientId)
  const handleDeleteClick = async () => { // Make the function async
       if (selectedClientId === null) return; // Should be disabled, but good practice

      if (window.confirm(`¿Está seguro de eliminar el cliente con ID ${selectedClientId}? Si el cliente tiene ventas asociadas, no se podrá eliminar.`)) {
          setDeletingClientId(selectedClientId);
          setError(null);

          try {
              // Call the async API function for deleting
              const response = await electronAPI.deleteClient(selectedClientId); // New API call
               console.log(`Client with ID ${selectedClientId} deleted successfully.`, response.success);

              setSelectedClientId(null); // Deselect after deleting
              fetchClients(); // Refresh the FULL list after deleting

          } catch (err) {
              // Handle errors (e.g., foreign key constraint violation)
               console.error(`Error deleting client with ID ${selectedClientId}:`, err);
               setError(err.message || `Error al eliminar el cliente.`);
          } finally {
              setDeletingClientId(null); // Reset deleting state
          }
      }
  };

  // Handle click on "Nuevo Cliente" button (Keep this)
  const handleNewClientClick = () => {
      setShowAddForm(true);
      setError(null); // Clear any previous errors
      // Ensure newClient state is reset when opening the form
      setNewClient({ Empresa: '', Cuit: '', Contacto: '', Telefono: '', Mail: '', Direccion: '' });
      setSelectedClientId(null); // Deselect any client when adding
      setEditingClientId(null); // Close any open edit form when adding
  };

  // Handle click on "Cancelar" button in the add form (Keep this)
  const handleCancelAdd = () => {
      setShowAddForm(false);
      setError(null); // Clear any errors
  };


  return (
    // Apply flexbox styling to the main container
    // height: '100%' helps ensure the flex items fill the available height if the parent allows it.
    <div className="container" style={{ display: 'flex', gap: '20px', height: '100%' }}> {/* Added height: '100%' */}
      {/* Left Pane: Client List and Add Form */}
      {/* Use conditional flex-basis or width */}
      <div style={{
          // Adjusted flex properties for equal size when split
          flex: selectedClientId === null ? '1 1 100%' : '1 1 50%', // 100% if no client, 50% if client selected
          minWidth: selectedClientId === null ? 'auto' : '350px', // Allow reasonable min-width when split
          paddingRight: selectedClientId === null ? '0' : '10px', // Add some padding if content might be near the edge, remove when full width
          borderRight: selectedClientId === null ? 'none' : '1px solid #424242', // Optional: Add a separator line
          transition: 'flex-basis 0.3s ease-in-out', // Smooth transition
          boxSizing: 'border-box', // Include padding and border in the element's total width and height
      }}>
         <h2>Gestión de Clientes</h2>

        {/* Button to show the add form */}
        {!showAddForm && (
            <button onClick={handleNewClientClick} disabled={loading || loadingEditData || savingData || deletingClientId !== null}>
                Nuevo Cliente
            </button>
        )}

        {/* Form to Add New Client (Conditional Rendering) */}
        {/* Ensure the form takes appropriate width when shown */}
        {showAddForm && (
            <div style={{ flex: '1 1 100%' }}> {/* Make form take full width of its container */}
                <h3>Agregar Nuevo Cliente</h3>
                <form onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="empresa">Empresa:</label>
                    <input type="text" id="empresa" name="Empresa" value={newClient.Empresa} onChange={handleInputChange} required disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                  <div>
                    <label htmlFor="cuit">Cuit:</label>
                    {/* REMOVED required attribute */}
                    <input type="text" id="cuit" name="Cuit" value={newClient.Cuit} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                  <div>
                    <label htmlFor="contacto">Contacto:</label>
                    <input type="text" id="contacto" name="Contacto" value={newClient.Contacto} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                  <div>
                    <label htmlFor="telefono">Teléfono:</label>
                    <input type="text" id="telefono" name="Telefono" value={newClient.Telefono} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                  <div>
                    <label htmlFor="mail">Mail:</label>
                    <input type="email" id="mail" name="Mail" value={newClient.Mail} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                  <div>
                    <label htmlFor="direccion">Dirección:</label>
                    <input type="text" id="direccion" name="Direccion" value={newClient.Direccion} onChange={handleInputChange} disabled={savingData || loadingEditData || deletingClientId !== null} />
                  </div>
                   {/* Button container for form actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                     <button type="submit" disabled={savingData || loadingEditData || deletingClientId !== null}>Agregar Cliente</button>
                     {/* Cancel button for the add form */}
                     <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingClientId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                         Cancelar
                     </button>
                  </div>
                </form>
            </div>
        )}


         {/* Display errors if any */}
        {error && <p style={{ color: '#ef9a9a' }}>{error}</p>} {/* Use dark theme error color */}

        {/* Display Client List (Conditional Rendering) */}
        {/* The list and its buttons are now inside the left pane */}
        {/* Hide the list entirely if the add form is showing */}
        {!showAddForm && (
            <>
                <h3>Clientes Existentes</h3>

                {/* --- NEW SEARCH INPUT --- */}
                <div style={{ marginBottom: '20px' }}>
                   <label htmlFor="search-term">Buscar:</label>
                   <input
                     type="text"
                     id="search-term"
                     value={searchTerm}
                     onChange={(e) => {
                         console.log('Client search term changed:', e.target.value);
                         setSearchTerm(e.target.value); // Update only the search term state
                         // Filtering happens in the useEffect
                     }}
                     placeholder="Buscar por empresa, cuit, contacto, etc."
                     disabled={loading || loadingEditData || savingData || deletingClientId !== null}
                    />
                </div>
                {/* --- END NEW SEARCH INPUT --- */}

                 {/* Edit and Delete Buttons */}
                 <div style={{ margin: '20px 0' }}>
                     <button
                         onClick={handleEditClick}
                         disabled={selectedClientId === null || editingClientId !== null || loadingEditData || savingData || deletingClientId !== null}
                     >
                         Editar Cliente Seleccionado
                     </button>
                     <button
                         onClick={handleDeleteClick}
                         disabled={selectedClientId === null || editingClientId !== null || loadingEditData || savingData || deletingClientId !== null}
                         style={{ marginLeft: '10px' }} // This inline style is targeted by CSS for danger color
                     >
                         Eliminar Cliente Seleccionado
                     </button>
                 </div>


                {loading && <p>Cargando clientes...</p>}
                {loadingEditData && <p>Cargando datos de cliente para editar...</p>}
                {savingData && <p>Guardando datos...</p>}
                {deletingClientId && <p>Eliminando cliente...</p>}


                {/* Client List Table (Now using displayedClientes) */}
                {/* Removed the container div with overflowX: 'auto' */}
                {!loading && displayedClientes.length > 0 && ( // Use displayedClientes here
                  <table key={searchTerm}> {/* Optional: Add key prop here if needed for rendering issues */}
                    <thead>
                      <tr>
                        {/* Conditionally render the ID column header */}
                        {selectedClientId === null && <th>ID</th>}
                        <th>Empresa</th>
                        <th>Cuit</th>
                        {/* Conditionally hide columns based on windowWidth and selectedClientId */}
                        {windowWidth > 900 && <th>Contacto</th>}
                        {windowWidth > 950 && <th>Teléfono</th>}
                        {/* <<< Modified conditions for Mail and Direccion headers */}
                        {windowWidth > 1100 && selectedClientId === null && <th>Mail</th>}
                        {windowWidth > 1200 && selectedClientId === null && <th>Dirección</th>}
                        {/* >>> End modified conditions */}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Map over displayedClientes */}
                      {displayedClientes.map((cliente) => (
                        <React.Fragment key={cliente.id}>
                          <tr
                              onClick={() => handleRowClick(cliente.id)}
                              style={{ cursor: 'pointer', backgroundColor: selectedClientId === cliente.id ? '#424242' : 'transparent' }} // Use dark theme selected color
                          >
                            {/* Conditionally render the ID cell */}
                            {selectedClientId === null && <td>{cliente.id}</td>}
                            {/* Display using new DB column names from the fetched data */}
                            <td>{cliente.Empresa}</td>
                            <td>{cliente.Cuit}</td>
                            {/* Conditionally hide cells based on windowWidth and selectedClientId, matching the headers */}
                            {windowWidth > 900 && <td>{cliente.Contacto}</td>}
                            {windowWidth > 950 && <td>{cliente.Telefono}</td>}
                            {/* <<< Modified conditions for Mail and Direccion cells */}
                            {windowWidth > 1100 && selectedClientId === null && <td>{cliente.Mail}</td>}
                            {windowWidth > 1200 && selectedClientId === null && <td>{cliente.Direccion}</td>}
                            {/* >>> End modified conditions */}
                          </tr>
                          {/* Inline Edit Form Row - Only show if THIS client is being edited and not adding */}
                          {editingClientId === cliente.id && !showAddForm && (
                              <tr>
                                   {/* Adjust colspan dynamically based on which columns are visible */}
                                   {/* Calculate visible columns: optional ID + Empresa + Cuit + conditional columns */}
                                   <td colSpan={
                                       (selectedClientId === null ? 1 : 0) + // ID column
                                       1 + // Empresa (always visible)
                                       1 + // Cuit (always visible)
                                       (windowWidth > 900 ? 1 : 0) + // Contacto
                                       (windowWidth > 950 ? 1 : 0) + // Teléfono
                                       // <<< Modified colSpan calculation for Mail and Direccion
                                       (windowWidth > 1100 && selectedClientId === null ? 1 : 0) + // Mail
                                       (windowWidth > 1200 && selectedClientId === null ? 1 : 0)   // Dirección
                                       // >>> End modified colSpan calculation
                                   }>
                                      <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}> {/* Dark theme styles */}
                                          <h4>Editar Cliente (ID: {cliente.id})</h4>
                                          {/* Edit form uses new DB column names as keys */}
                                          <form onSubmit={handleSaveEdit}> {/* Added onSubmit for form */}
                                               <div>
                                                  <label htmlFor={`edit-empresa-${cliente.id}`}>Empresa:</label>
                                                  <input type="text" id={`edit-empresa-${cliente.id}`} name="Empresa" value={editedClientData.Empresa || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                              </div>
                                              <div>
                                                  <label htmlFor={`edit-cuit-${cliente.id}`}>Cuit:</label>
                                                  {/* REMOVED required attribute */}
                                                  <input type="text" id={`edit-cuit-${cliente.id}`} name="Cuit" value={editedClientData.Cuit || ''} onChange={handleEditFormChange} disabled={savingData} />
                                              </div>
                                              <div>
                                                  <label htmlFor={`edit-contacto-${cliente.id}`}>Contacto:</label>
                                                  <input type="text" id={`edit-contacto-${cliente.id}`} name="Contacto" value={editedClientData.Contacto || ''} onChange={handleEditFormChange} disabled={savingData} />
                                              </div>
                                               <div>
                                                  <label htmlFor={`edit-telefono-${cliente.id}`}>Teléfono:</label>
                                                  <input type="text" id={`edit-telefono-${cliente.id}`} name="Telefono" value={editedClientData.Telefono || ''} onChange={handleEditFormChange} disabled={savingData} />
                                              </div>
                                               <div>
                                                  <label htmlFor={`edit-mail-${cliente.id}`}>Mail:</label>
                                                  <input type="email" id={`edit-mail-${cliente.id}`} name="Mail" value={editedClientData.Mail || ''} onChange={handleEditFormChange} disabled={savingData} />
                                              </div>
                                               <div>
                                                  <label htmlFor={`edit-direccion-${cliente.id}`}>Dirección:</label>
                                                  <input type="text" id={`edit-direccion-${cliente.id}`} name="Direccion" value={editedClientData.Direccion || ''} onChange={handleEditFormChange} disabled={savingData} />
                                              </div>

                                              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}> {/* Added flex for buttons */}
                                                   <button type="submit" disabled={savingData}>Guardar Cambios</button> {/* Changed to type="submit" */}
                                                   {/* Cancel edit button */}
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
                {!loading && displayedClientes.length === 0 && !error && searchTerm === '' && <p>No hay clientes registrados.</p>}
                 {/* Show message if no clients found for the current search term */}
                 {!loading && displayedClientes.length === 0 && searchTerm !== '' && <p>No se encontraron clientes para el término "{searchTerm}".</p>}
            </>
        )}
      </div> {/* End of Left Pane */}


      {/* Right Pane: Client Sales Details */}
      {/* Render this pane only when a client is selected and not adding a new client */}
      {selectedClientId !== null && !showAddForm && (
          <div style={{
              // Adjusted flex properties for equal size
              flex: '1 1 50%', // Takes 50% of available space
              minWidth: '350px', // Match min-width of left pane
              overflowY: 'auto', // Keep vertical scroll for sales lists if they get long
              maxHeight: 'calc(100vh - 120px)', // Keep height constraint for independent scrolling
              paddingLeft: '10px', // Add some padding for spacing
              boxSizing: 'border-box', // Include padding in the element's total width and height
          }}>
               {/* ClientSalesDetails component now handles showing sales/ventasX and the detail modal internally */}
               <ClientSalesDetails
                   clientId={selectedClientId}
                   // Find the selected client from the *full* list to get their name
                   clientName={allClientes.find(c => c.id === selectedClientId)?.Empresa} // Pass client name for display
               />
          </div>
      )}

        {/* Message when no client is selected and not adding */}
        {selectedClientId === null && !showAddForm && !loading && displayedClientes.length > 0 && ( // Check displayedClientes length
             // This div will take up the space where the right pane *would* be if a client was selected
             <div style={{
                 // Use the same flex basis as the right pane when active
                 flex: '1 1 50%',
                 minWidth: '350px', // Match min-width of the right pane when active
                 paddingLeft: '10px',
                 boxSizing: 'border-box',
                 display: 'flex', // Use flex to center the message
                 alignItems: 'center',
                 justifyContent: 'center',
                 textAlign: 'center',
                 borderLeft: '1px solid #424242',
                 // Added styles to match ListaProveedores message div (removed overflowX as columns will hide)
                 overflowY: 'auto',
                 maxHeight: 'calc(100vh - 120px)',
             }}>
                <p>Seleccione un cliente de la lista para ver sus ventas.</p> {/* Legend remains for Clients */}
             </div>
        )}

         {/* Message when no clients are loaded at all (initial state or error) */}
         {/* This handles the case where displayedClientes.length is 0 because allClientes is empty */}
         {!loading && displayedClientes.length === 0 && searchTerm === '' && !error && selectedClientId === null && !showAddForm && (
              <div style={{
                  // This div takes full width since there's no list or right pane
                   flex: '1 1 100%',
                   minWidth: 'auto',
                   paddingRight: '0',
                   borderRight: 'none',
                   boxSizing: 'border-box',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   textAlign: 'center',
              }}>
                  <p>No hay clientes registrados.</p>
              </div>
         )}


    </div>
  );
}

export default ListaClientes;