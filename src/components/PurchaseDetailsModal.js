// src/components/PurchaseDetailsModal.js

import React from 'react';

// Estilos básicos para el modal (puedes ajustarlos según tu diseño)
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Fondo oscuro semitransparente
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000 // Asegura que esté por encima de otros elementos
};

const modalContentStyle = {
    backgroundColor: '#212121', // Fondo oscuro para el modal
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '600px', // Ancho máximo del modal
    width: '90%', // Ancho en pantallas más pequeñas
    maxHeight: '80vh', // Altura máxima para permitir scroll si el contenido es largo
    overflowY: 'auto', // Habilitar scroll vertical si el contenido excede la altura máxima
    color: '#e0e0e0', // Color de texto claro
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)', // Sombra para destacar el modal
    position: 'relative' // Necesario para posicionar el botón de cerrar
};

const closeButtonStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#f44336', // Color rojo para el botón de cerrar
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
};

const modalTitleStyle = {
    marginTop: 0,
    color: '#bdbdbd', // Color de título ligeramente más claro
    borderBottom: '1px solid #424242', // Línea separadora
    paddingBottom: '10px',
    marginBottom: '20px'
};

const detailItemStyle = {
    marginBottom: '10px',
    lineHeight: 1.5
};

const detailLabelStyle = {
    fontWeight: 'bold',
    color: '#9e9e9e' // Color para las etiquetas
};

const itemsTableStyle = {
    width: '100%',
    borderCollapse: 'collapse', // Bordes de tabla colapsados
    marginTop: '15px'
};

const tableHeaderStyle = {
    borderBottom: '1px solid #424242',
    padding: '10px 0',
    textAlign: 'left',
    color: '#bdbdbd'
};

const tableCellStyle = {
    padding: '10px 0',
    borderBottom: '1px solid #424242'
};

// Añadido estilo para el botón secundario (Cerrar)
const secondaryButtonStyle = {
    backgroundColor: '#616161',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
};


function PurchaseDetailsModal({ compraData, onClose, loading, error }) {
    // compraData: Los datos completos de la compra a mostrar
    // onClose: Función para cerrar el modal
    // loading: Estado de carga de los datos
    // error: Estado de error al cargar los datos

     // Helper function to get the display text for Estado (can reuse)
     const getEstadoDisplayText = (estado) => {
         switch (estado) {
             case 'pendiente': return 'Pendiente';
             case 'recibido': return 'Recibido';
             case 'cancelado': return 'Cancelado';
             case 'entregado': return 'Entregado'; // Added based on ListaCompras
             case 'pedido': return 'Pedido';       // Added based on ListaCompras
             default: return estado;
         }
     };

     // Helper function to get the display text for Pago (NEW)
     const getPagoDisplayText = (pago) => {
         switch (pago) {
             case 'abonado': return 'Abonado';
             case 'deuda': return 'Deuda';
             default: return pago;
         }
     };


    // Función para renderizar la tabla de ítems (Keep as is)
    const renderItemsTable = (items) => {
        // ... existing logic
         if (!items || items.length === 0) {
             return <p>No hay ítems registrados para esta compra.</p>;
         }

         // For items (Compra_Items), we expect Producto_id, Cantidad, Precio_Unitario, Total_Item
         return (
             <table style={itemsTableStyle}> {/* Aplicar estilo a la tabla */}
                 <thead>
                     <tr>
                         <th style={tableHeaderStyle}>Código</th> {/* Aplicar estilo a los encabezados */}
                         <th style={tableHeaderStyle}>Descripción</th>
                         <th style={tableHeaderStyle}>Cantidad</th>
                         <th style={tableHeaderStyle}>Precio Unitario (USD)</th>
                         <th style={tableHeaderStyle}>Total Ítem (USD)</th>
                     </tr>
                 </thead>
                 <tbody>
                     {items.map((item, index) => (
                         // Use item.id as key if available, otherwise index
                         <tr key={item.id || index}>
                             <td style={tableCellStyle}>{item.codigo || 'N/A'}</td> {/* Aplicar estilo a las celdas */}
                             <td style={tableCellStyle}>{item.Descripcion || 'N/A'}</td>
                             <td style={tableCellStyle}>{item.Cantidad}</td>
                             <td style={tableCellStyle}>{item.Precio_Unitario !== null ? parseFloat(item.Precio_Unitario).toFixed(2) : 'N/A'}</td> {/* Asegurar parsing y toFixed */}
                             <td style={tableCellStyle}>{item.Total_Item !== null ? parseFloat(item.Total_Item).toFixed(2) : 'N/A'}</td> {/* Asegurar parsing y toFixed */}
                         </tr>
                     ))}
                 </tbody>
             </table>
         );
    };
    // --- End renderItemsTable Function ---


    // Renderiza null si el modal no debe estar visible (controlado por el padre)
    if (!compraData && !loading && !error) {
        return null;
    }

    return (
        <div style={modalOverlayStyle} onClick={onClose}> {/* Cierra el modal al hacer clic en el overlay */}
            {/* Evita que el clic en el contenido del modal cierre el modal */}
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <button style={closeButtonStyle} onClick={onClose}>×</button> {/* Botón de cerrar */}

                {loading && <p style={{textAlign: 'center', color: '#bbb'}}>Cargando detalles de la compra...</p>}
                {error && <p style={{ color: '#f08080', textAlign: 'center' }}>{error}</p>}
                {!loading && !error && compraData && (
                    <>
                         <div style={{
                             display: 'flex',
                             justifyContent: 'space-between',
                             alignItems: 'center',
                             marginBottom: '30px',
                             borderBottom: '2px solid #555',
                             paddingBottom: '15px',
                         }}>
                             <h3 style={{
                                 color: '#ffffff',
                                 fontSize: '22px',
                                 margin: 0, padding: 0,
                                 textAlign: 'left',
                                 flexGrow: 1,
                                 fontWeight: 'bold',
                             }}>
                                 Detalle de Compra
                             </h3>
                             <div style={{
                                 fontSize: '14px',
                                 textAlign: 'right',
                                 color: '#bbb',
                             }}>
                                  <div><strong>N° Factura:</strong> {compraData.Fact_Nro || 'N/A'}</div>
                                  <div><strong>Fecha:</strong> {compraData.Fecha || 'N/A'}</div>
                                  <div><strong>Cotización Dólar:</strong> {compraData.Cotizacion_Dolar !== null ? parseFloat(compraData.Cotizacion_Dolar).toFixed(2) : 'N/A'}</div> {/* Asegurar parsing y toFixed */}
                             </div>
                         </div>

                        {/* Proveedor Section (Keep as is) */}
                        <div style={{
                            marginBottom: '15px',
                            paddingTop: '10px',
                            borderTop: '1px dashed #444',
                        }}>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                marginTop: 0, marginBottom: '10px',
                                borderBottom: '1px solid #555',
                                paddingBottom: '5px',
                            }}>Proveedor</div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>Empresa:</span>
                                <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{compraData.Nombre_Proveedor || 'N/A'}</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>CUIT:</span>
                                <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{compraData.Cuit_Proveedor || 'N/A'}</span>
                            </div>
                        </div>


                        {/* Items Section (Keep as is) */}
                         <div style={{
                             marginBottom: '15px',
                             paddingTop: '10px',
                             borderTop: '1px dashed #444',
                         }}>
                             <div style={{
                                 fontSize: '16px',
                                 fontWeight: 'bold',
                                 color: '#ffffff',
                                 marginTop: 0, marginBottom: '10px',
                                 borderBottom: '1px solid #555',
                                 paddingBottom: '5px',
                             }}>Ítems</div>
                             {renderItemsTable(compraData.items)}
                         </div>


                        {/* Totals Section (Keep as is) */}
                         <div style={{
                             marginTop: '10px',
                             borderTop: '1px solid #555',
                             paddingTop: '8px',
                             backgroundColor: '#3a3a3a',
                             padding: '8px',
                             borderRadius: '3px',
                         }}>
                             <div style={{
                                 fontSize: '16px',
                                 fontWeight: 'bold',
                                 color: '#ffffff',
                                 marginTop: 0, marginBottom: '10px',
                                 borderBottom: '1px solid #555',
                                 paddingBottom: '5px',
                             }}>Totales</div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#ffffff' }}>
                                 <span>Monto Total (USD):</span>
                                 <span>{compraData.MontoTotal !== null ? parseFloat(compraData.MontoTotal).toFixed(2) : 'N/A'}</span> {/* Asegurar parsing y toFixed */}
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#ffffff' }}>
                                  <span>Total (ARS):</span>
                                  <span>{compraData.Total_ARS !== null ? parseFloat(compraData.Total_ARS).toFixed(2) : 'N/A'}</span> {/* Asegurar parsing y toFixed */}
                             </div>
                         </div>

                         {/* Estado y Pago Section (MODIFICADO para incluir Pago) */}
                         <div style={{
                             marginTop: '15px',
                             paddingTop: '10px',
                             borderTop: '1px dashed #444',
                         }}>
                              <div style={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  color: '#ffffff',
                                  marginTop: 0, marginBottom: '10px',
                                  borderBottom: '1px solid #555',
                                  paddingBottom: '5px',
                              }}>Estado y Pago</div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                 <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>Estado:</span>
                                 <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{getEstadoDisplayText(compraData.Estado) || 'N/A'}</span>
                             </div>
                              {/* NUEVA FILA: Pago */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                  <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>Pago:</span>
                                  <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{getPagoDisplayText(compraData.Pago) || 'N/A'}</span>
                             </div>
                         </div>

                    </>
                )}

                {/* Button Area (Keep as is) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                    <button style={secondaryButtonStyle} onClick={onClose}>Cerrar</button>
                </div>

            </div>
        </div>
    );
}

export default PurchaseDetailsModal;
