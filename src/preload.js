// software-gestion/src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

const API_BASE_URL = 'http://100.115.111.50:3001/api';

const apiRequest = async (method, endpoint, data = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = localStorage.getItem('authToken');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  if (data !== null && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
      const customError = new Error(errorMessage);
      customError.status = response.status;
      console.error(`API Error Response (${method} ${url}): Status ${response.status}, Body:`, errorData);
      throw customError;
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error in API request (${method} ${url}):`, error);
    throw error;
  }
};

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    apiRequest: apiRequest,
    savePresupuestoPdf: (htmlContent, suggestedFileName) => ipcRenderer.invoke('save-presupuesto-pdf', htmlContent, suggestedFileName),
    exportProductosCsv: () => ipcRenderer.invoke('exportProductosCsv'),
    
    getLogoFilePath: () => ipcRenderer.invoke('get-logo-file-path'), // Asegúrate que esto esté aquí

    getClients: async () => apiRequest('GET', '/clientes'),
    addClient: async (clientData) => apiRequest('POST', '/clientes', clientData),
    getClientById: async (id) => apiRequest('GET', `/clientes/${id}`),
    updateClient: async (id, clientData) => apiRequest('PUT', `/clientes/${id}`, clientData),
    deleteClient: async (id) => apiRequest('DELETE', `/clientes/${id}`),
    addVenta: async (ventaData) => apiRequest('POST', '/ventas', ventaData),
    getVentas: async () => apiRequest('GET', '/ventas'),
    getVentaById: async (id) => apiRequest('GET', `/ventas/${id}`),
    updateVenta: async (id, ventaData) => apiRequest('PUT', `/ventas/${id}`, ventaData),
    deleteVenta: async (id) => apiRequest('DELETE', `/ventas/${id}`),
    getProductos: async () => apiRequest('GET', '/productos'),
    addProducto: async (productoData) => apiRequest('POST', '/productos', productoData),
    getProductoById: async (id) => apiRequest('GET', `/productos/${id}`),
    updateProducto: async (id, productoData) => apiRequest('PUT', `/productos/${id}`, productoData),
    deleteProducto: async (id) => apiRequest('DELETE', `/productos/${id}`),
    getProveedores: async () => apiRequest('GET', '/proveedores'),
    addProveedor: async (proveedorData) => apiRequest('POST', '/proveedores', proveedorData),
    getProveedorById: async (id) => apiRequest('GET', `/proveedores/${id}`),
    updateProveedor: async (id, proveedorData) => apiRequest('PUT', `/proveedores/${id}`, proveedorData),
    deleteProveedor: async (id) => apiRequest('DELETE', `/proveedores/${id}`),
    addCompra: async (compraData) => apiRequest('POST', '/compras', compraData),
    getCompras: async () => apiRequest('GET', '/compras'),
    getCompraById: async (id) => apiRequest('GET', `/compras/${id}`),
    updateCompra: async (id, compraData) => apiRequest('PUT', `/compras/${id}`, compraData),
    deleteCompra: async (id) => apiRequest('DELETE', `/compras/${id}`),
    getStock: async () => apiRequest('GET', '/stock'),
    addOrUpdateStock: async (stockData) => apiRequest('POST', '/stock', stockData),
    getStockById: async (id) => apiRequest('GET', `/stock/${id}`),
    updateStockQuantity: async (id, quantityData) => apiRequest('PUT', `/stock/${id}`, quantityData),
    deleteStock: async (id) => apiRequest('DELETE', `/stock/${id}`),
    getPresupuestos: async () => apiRequest('GET', '/presupuestos'),
    getPresupuestoById: async (id) => apiRequest('GET', `/presupuestos/${id}`),
    addPresupuesto: async (presupuestoData) => apiRequest('POST', '/presupuestos', presupuestoData),
    updatePresupuesto: async (id, presupuestoData) => apiRequest('PUT', `/presupuestos/${id}`, presupuestoData),
    deletePresupuesto: async (id) => apiRequest('DELETE', `/presupuestos/${id}`),
    addVentaX: async (ventaXData) => apiRequest('POST', '/ventasx', ventaXData),
    getVentasX: async () => apiRequest('GET', '/ventasx'),
    getVentaXById: async (id) => apiRequest('GET', `/ventasx/${id}`),
    updateVentaX: async (id, ventaXData) => apiRequest('PUT', `/ventasx/${id}`, ventaXData),
    deleteVentaX: async (id) => apiRequest('DELETE', `/ventasx/${id}`),
    getPendingVentas: async () => apiRequest('GET', '/ventas/pending'),
    getPendingVentasX: async () => apiRequest('GET', '/ventasx/pending'),
    getPendingCompras: async () => apiRequest('GET', '/compras/pending'),
    updatePendingVenta: async (id, updateData) => apiRequest('PUT', `/ventas/pending/${id}`, updateData),
    updatePendingVentaX: async (id, updateData) => apiRequest('PUT', `/ventasx/pending/${id}`, updateData),
    updatePendingCompra: async (id, updateData) => apiRequest('PUT', `/compras/pending/${id}`, updateData),
    getVentasByClientId: async (clientId, startDate, endDate) => {
      let url = `/ventas/by-client/${clientId}`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getVentasXByClientId: async (clientId, startDate, endDate) => {
      let url = `/ventasx/by-client/${clientId}`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getComprasByProveedorId: async (proveedorId, startDate, endDate) => {
      let url = `/compras/by-proveedor/${proveedorId}`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getAllVentasFiltered: async (startDate, endDate) => {
      let url = `/ventas/filtered`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getAllVentasXFiltered: async (startDate, endDate) => {
      let url = `/ventasx/filtered`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getAllComprasFiltered: async (startDate, endDate) => {
      let url = `/compras/filtered`;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    getCashFlowMovements: async (filters) => {
      let url = `/cashflow/movements`;
      const queryParams = new URLSearchParams(filters);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      return apiRequest('GET', url);
    },
    addManualCashflowMovement: async (movementData) => apiRequest('POST', '/cashflow/manual-movements', movementData),
    getCashFlowMovementById: async (id) => apiRequest('GET', `/cashflow/movements/${id}`),
    updateManualCashflowMovement: async (id, movementData) => apiRequest('PUT', `/cashflow/manual-movements/${id}`, movementData),
    deleteCashflowMovement: async (id) => apiRequest('DELETE', `/cashflow/movements/${id}`),
    getInactiveClients: async (months) => {
      let url = `/estadisticas/inactive-clients`;
      if (months !== undefined && months !== null) url += `?months=${months}`;
      return apiRequest('GET', url);
    },
    getTopClients: async (limit) => {
      let url = `/estadisticas/top-clients`;
      if (limit !== undefined && limit !== null) url += `?limit=${limit}`;
      return apiRequest('GET', url);
    },
    getTopProducts: async (limit) => {
      let url = `/estadisticas/top-products`;
      if (limit !== undefined && limit !== null) url += `?limit=${limit}`;
      return apiRequest('GET', url);
    },
    getLeastSoldProducts: async (limit) => {
      let url = `/estadisticas/least-sold-products`;
      if (limit !== undefined && limit !== null) url += `?limit=${limit}`;
      return apiRequest('GET', url);
    },
    getTopMonths: async (limit) => {
      let url = `/estadisticas/top-months`;
      if (limit !== undefined && limit !== null) url += `?limit=${limit}`;
      return apiRequest('GET', url);
    },
    getSalesComparison: async (period) => {
      let url = `/estadisticas/sales-comparison`;
      if (period) url += `?period=${period}`;
      return apiRequest('GET', url);
    },
    getStockRotation: async (months) => {
      let url = `/estadisticas/stock-rotation`;
      if (months !== undefined && months !== null) url += `?months=${months}`;
      return apiRequest('GET', url);
    },
    getKeyBalanceMetrics: async () => apiRequest('GET', '/balance/key-metrics'),
  }
);

console.log('[Preload Process] API bridge exposed. Backend URL:', API_BASE_URL);