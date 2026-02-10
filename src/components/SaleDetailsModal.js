// src/components/SaleDetailsModal.js
import React from 'react';
// Puedes reutilizar la estructura de estilos del PresupuestoShareModal
// o definir estilos específicos para este modal.
// Si ya tienes un archivo CSS global (styles.css), puedes usar clases allí.

function SaleDetailsModal({ saleData, saleType, onClose, loading, error }) { // Aceptar la nueva prop saleType
    // saleData: Objeto con los datos completos de la venta/ventaX a mostrar (incluye .items)
    // saleType: String que indica el tipo de venta ('venta' o 'ventaX')
    // onClose: Función para cerrar el modal
    // loading: Booleano que indica si se están cargando los datos
    // error: String con mensaje de error si ocurrió uno

    // Helper function to get the display text for Estado (can reuse)
    const getEstadoDisplayText = (estado) => {
        switch (estado) {
            case 'entregado': return 'Entregado';
            case 'en maquina': return 'En Máquina';
            case 'pedido': return 'Pedido';
            case 'cancelado': return 'Cancelado';
            case 'listo': return 'Listo';
            default: return estado;
        }
    };

    // Helper function to get the display text for Pago (can reuse)
    const getPagoDisplayText = (pago) => {
        switch (pago) {
            case 'abonado': return 'Abonado';
            case 'seña': return 'Seña';
            case 'debe': return 'Debe';
            default: return pago;
        }
    };

    // Función para renderizar la tabla de ítems de la venta/ventaX
    const renderItemsTable = (items) => {
        if (!items || items.length === 0) {
            // Usar la prop saleType que ahora está disponible
            const currentSaleType = saleType === 'venta' ? 'venta' : 'Venta X';
            return <p>No hay ítems registrados para esta {currentSaleType}.</p>;
        }

        // Las columnas se adaptan según si es item de producto o personalizado
        return (
            <table>
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Código/Descripción</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario (USD)</th>
                        <th>Total Ítem (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        // Usar item.id como key si está disponible, sino index
                        <tr key={item.id || index}>
                            <td>{item.type === 'product' ? 'Producto' : 'Personalizado'}</td>
                            <td>
                                {/* **** CORRECCIÓN AQUÍ **** */}
                                {/* Usar item.Producto_Descripcion para la descripción del producto */}
                                {item.type === 'product'
                                    ? `${item.codigo || 'N/A'} - ${item.Producto_Descripcion || 'N/A'}` // <-- Cambio de Descripcion a Producto_Descripcion
                                    : item.Descripcion_Personalizada || 'N/A'
                                }
                                {/* **** FIN CORRECCIÓN **** */}
                            </td>
                            <td>
                                {item.type === 'product'
                                    ? item.Cantidad
                                    : item.Cantidad_Personalizada
                                }
                            </td>
                            <td>
                                {item.type === 'product'
                                    ? (item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined && !isNaN(parseFloat(item.Precio_Unitario_Venta)) ? parseFloat(item.Precio_Unitario_Venta).toFixed(2) : 'N/A') // Added check for Precio_Unitario_Venta
                                    : (item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A') // Added check for Precio_Unitario_Personalizada
                                }
                            </td>
                            {/* CORRECCIÓN: Añadir comprobación antes de llamar toFixed */}
                            <td>
                                {item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item))
                                    ? parseFloat(item.Total_Item).toFixed(2)
                                    : 'N/A' // Mostrar 'N/A' si no es un número válido
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };
    // --- Fin Función renderItemsTable ---


    // Estilos básicos para el modal (puedes ajustarlos o usar clases CSS)
    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: '#2c2c2c',
        padding: '40px',
        borderRadius: '10px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflowY: 'auto',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        color: '#e0e0e0',
        fontFamily: "'Arial', sans-serif",
        fontSize: '1.1rem',
        lineHeight: '1.7',
        position: 'relative',
        minWidth: '600px',
        display: 'flex',
        flexDirection: 'column',
    };

    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, opacity 0.3s ease',
        marginLeft: '10px',
        color: '#ffffff',
    };

    // const primaryButtonStyle = { // No se usa un botón primario en este modal
    //      ...buttonStyle,
    //      backgroundColor: '#5cb85c', // Verde
    // };

     const secondaryButtonStyle = {
         ...buttonStyle,
         backgroundColor: '#616161', // Gris
     };


    return (
        <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="modal-content" style={modalContentStyle}>
                {/* --- Renderizar contenido condicionalmente --- */}
                {loading && <p style={{textAlign: 'center', color: '#bbb'}}>Cargando detalles de la venta...</p>}
                {error && <p style={{ color: '#f08080', textAlign: 'center' }}>{error}</p>}
                {!loading && !error && saleData && (
                    <>
                        {/* Usar la prop saleType para el título */}
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
                                 Detalle de {saleType === 'venta' ? 'Venta (Factura A)' : 'Venta X'}
                             </h3>
                             <div style={{
                                 fontSize: '14px',
                                 textAlign: 'right',
                                 color: '#bbb',
                             }}>
                                  <div><strong>N°</strong> {saleType === 'venta' ? saleData.Fact_Nro : saleData.Nro_VentaX || 'N/A'}</div>
                                  <div><strong>Fecha:</strong> {saleData.Fecha || 'N/A'}</div>
                                  <div><strong>Cotización Dólar:</strong> {saleData.Cotizacion_Dolar !== null ? saleData.Cotizacion_Dolar : 'N/A'}</div>
                             </div>
                         </div>

                        {/* Sección Cliente */}
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
                            }}>Cliente</div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>Empresa:</span>
                                <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{saleData.Nombre_Cliente || 'N/A'}</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>CUIT:</span>
                                <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{saleData.Cuit_Cliente || 'N/A'}</span>
                            </div>
                            {/* Puedes añadir más detalles del cliente si están disponibles en saleData (ej: Contacto, Mail) */}
                        </div>


                        {/* Sección Items */}
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
                             {renderItemsTable(saleData.items)} {/* Usar la función para renderizar la tabla */}
                         </div>


                        {/* Sección Totales */}
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
                                 <span>Subtotal (USD):</span>
                                 <span>{saleData.Subtotal !== null ? parseFloat(saleData.Subtotal).toFixed(2) : 'N/A'}</span> {/* Added parseFloat */}
                             </div>
                              {/* Mostrar IVA solo para Ventas (Factura A), usando la prop saleType */}
                              {saleType === 'venta' && saleData.IVA !== null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#ffffff' }}>
                                      <span>IVA (USD):</span>
                                      <span>{saleData.IVA !== null ? parseFloat(saleData.IVA).toFixed(2) : 'N/A'}</span> {/* Added check and parseFloat */}
                                  </div>
                              )}
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#ffffff' }}>
                                 <span>Total (USD):</span>
                                 <span>{saleData.Total !== null ? parseFloat(saleData.Total).toFixed(2) : 'N/A'}</span> {/* Added parseFloat */}
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#ffffff' }}>
                                  <span>Total (ARS):</span>
                                  <span>{saleData.Total_ARS !== null ? parseFloat(saleData.Total_ARS).toFixed(2) : 'N/A'}</span> {/* Added parseFloat */}
                             </div>
                         </div>

                         {/* Sección Estado y Pago */}
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
                                 <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{getEstadoDisplayText(saleData.Estado) || 'N/A'}</span>
                             </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px'}}>
                                  <span style={{fontWeight: 'bold', color: '#e0e0e0', minWidth: '120px', marginRight: '8px', flexShrink: 0, textAlign: 'left'}}>Pago:</span>
                                  <span style={{wordBreak: 'break-word', flexBasis: '50%', textAlign: 'right', color: '#bbb'}}>{getPagoDisplayText(saleData.Pago) || 'N/A'}</span>
                             </div>
                         </div>

                    </>
                )}

                {/* Área de botones */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                    <button style={secondaryButtonStyle} onClick={onClose}>Cerrar</button>
                </div>

            </div>
        </div>
    );
}

export default SaleDetailsModal;
