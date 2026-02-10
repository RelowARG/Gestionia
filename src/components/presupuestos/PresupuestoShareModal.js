// src/components/presupuestos/PresupuestoShareModal.js
import React, { useEffect, useState, useRef } from 'react';
import { pdfPrintStyles } from './printStyles';
import { modalScreenStyles } from './modalScreenStyles'; // Asegúrate que esto se esté inyectando en el DOM

// Función para formatear la fecha como dd/mm/yy
const formatDateDDMMYY = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Verificar si la fecha es válida después de parsear
        if (isNaN(date.getTime())) {
            // Si new Date() no pudo parsear, intentar parsear como YYYY-MM-DD
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) -1; // Meses en JS son 0-indexados
                const day = parseInt(parts[2], 10);
                const manualDate = new Date(year, month, day);
                if (!isNaN(manualDate.getTime())) {
                    const dayFormatted = manualDate.getDate().toString().padStart(2, '0');
                    const monthFormatted = (manualDate.getMonth() + 1).toString().padStart(2, '0'); // Sumar 1 porque getMonth es 0-indexado
                    const yearFormatted = manualDate.getFullYear().toString().slice(-2);
                    return `${dayFormatted}/${monthFormatted}/${yearFormatted}`;
                }
            }
            console.warn(`PresupuestoShareModal: No se pudo parsear la fecha '${dateString}' como válida.`);
            return dateString; // Devolver el original si no se puede parsear
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Sumar 1 porque getMonth es 0-indexado
        const year = date.getFullYear().toString().slice(-2); // Tomar los últimos dos dígitos del año
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("PresupuestoShareModal: Error formateando la fecha:", dateString, error);
        return dateString; // Devolver el original en caso de error
    }
};


function PresupuestoShareModal({ presupuestoData, onClose, loading, error }) {
    const [formattedTextContent, setFormattedTextContent] = useState('');
    const contentRef = useRef(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const [savePdfError, setSavePdfError] = useState(null);
    const [logoFileUrl, setLogoFileUrl] = useState(null);
    const [formattedDate, setFormattedDate] = useState('N/A');

    useEffect(() => {
        if (presupuestoData) {
            let text = `PRESUPUESTO N°: ${presupuestoData.Numero || ''}\n`;
            const displayDate = formatDateDDMMYY(presupuestoData.Fecha);
            setFormattedDate(displayDate); // Guardar fecha formateada para el JSX
            text += `Fecha: ${displayDate}\n`;
            text += `Validez: ${presupuestoData.ValidezOferta || 'N/A'} días\n\n`;
            text += `Cliente: ${presupuestoData.Nombre_Cliente || 'N/A'}\n`;
            text += `CUIT: ${presupuestoData.Cuit_Cliente || 'N/A'}\n\n`;
            setFormattedTextContent(text);
        } else {
            setFormattedDate('N/A');
        }
    }, [presupuestoData]);

    useEffect(() => {
        const fetchAndSetLogoPath = async () => {
            if (window.electronAPI && typeof window.electronAPI.getLogoFilePath === 'function') {
                try {
                    const filePath = await window.electronAPI.getLogoFilePath();
                    if (filePath) {
                        const url = new URL(filePath.replace(/\\/g, '/'), 'file:///').href;
                        setLogoFileUrl(url);
                        console.log('PresupuestoShareModal: Logo file URL para PDF y pantalla:', url);
                    } else {
                        console.warn("PresupuestoShareModal: No se recibió la ruta del archivo del logo desde el proceso principal.");
                        setSavePdfError("No se pudo encontrar el archivo del logo. Verifique la configuración en main.js y la existencia del archivo.");
                    }
                } catch (err) {
                    console.error("PresupuestoShareModal: Error al obtener la ruta del logo:", err);
                    setSavePdfError("Error al cargar la ruta del logo. Verifique la consola.");
                }
            } else {
                console.error("PresupuestoShareModal: window.electronAPI.getLogoFilePath no está disponible.");
                setSavePdfError("La API para obtener la ruta del logo no está disponible.");
            }
        };
        fetchAndSetLogoPath();
    }, []);

    const handleSaveTextContent = () => {
       if (!formattedTextContent || !presupuestoData) return;
        const numeroPresupuesto = presupuestoData.Numero || 'SinNumero';
        const nombreCliente = presupuestoData.Nombre_Cliente || 'SinCliente';
        const cleanNombreCliente = nombreCliente.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        const fileName = `${numeroPresupuesto}-${cleanNombreCliente}.txt`;
        const blob = new Blob([formattedTextContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleSavePdfContent = async () => {
        if (!presupuestoData || !contentRef.current) {
             setSavePdfError('No hay contenido para guardar como PDF.');
             return;
        }
        if (!logoFileUrl && !savePdfError) {
            setSavePdfError('La ruta del logo no está disponible o no se pudo cargar. El PDF se generará sin logo si continúa.');
        }
        setSavingPdf(true);
        if (savePdfError !== "No se pudo encontrar el archivo del logo. Verifique la configuración en main.js y la existencia del archivo." &&
            savePdfError !== "Error al cargar la ruta del logo. Verifique la consola." &&
            savePdfError !== "La API para obtener la ruta del logo no está disponible.") {
            setSavePdfError(null);
        }

        const contentToPrint = contentRef.current.cloneNode(true);
        const logoInClone = contentToPrint.querySelector('.pdf-logo');
        if (logoInClone) {
            logoInClone.style.maxWidth = '';
            logoInClone.style.maxHeight = '';
            logoInClone.style.border = '';
        }

        if (contentToPrint.style) {
             contentToPrint.style.maxHeight = 'none';
             contentToPrint.style.overflowY = 'visible';
             contentToPrint.style.boxShadow = 'none';
             contentToPrint.style.padding = '0';
             contentToPrint.style.backgroundColor = '';
             contentToPrint.style.color = '';
             contentToPrint.style.width = 'auto';
             contentToPrint.style.minWidth = 'auto';
             contentToPrint.style.maxWidth = 'none';
        }
         const elementsWithScroll = contentToPrint.querySelectorAll('[style*="overflow"], [style*="max-height"]');
         elementsWithScroll.forEach(el => {
             el.style.overflow = 'visible';
             el.style.maxHeight = 'none';
         });

        const pdfPrintStyleTag = document.createElement('style');
        pdfPrintStyleTag.textContent = pdfPrintStyles;
        contentToPrint.insertBefore(pdfPrintStyleTag, contentToPrint.firstChild);

        const numeroPresupuesto = presupuestoData.Numero || 'SinNumero';
        const nombreCliente = presupuestoData.Nombre_Cliente || 'SinCliente';
        const cleanNombreCliente = nombreCliente.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        const suggestedFileName = `${numeroPresupuesto}-${cleanNombreCliente}.pdf`;
        try {
            console.log("PresupuestoShareModal: Enviando HTML al main process para PDF. Logo URL en HTML (si existe):", logoFileUrl);
            const response = await window.electronAPI.savePresupuestoPdf(contentToPrint.outerHTML, suggestedFileName);
            if (response.success) {
                console.log('PresupuestoShareModal: PDF guardado exitosamente:', response.filePath);
            } else {
                console.error('PresupuestoShareModal: Error al guardar PDF desde main process:', response.message || response.error);
                if (response.message !== 'canceled' && response.error !== 'canceled') {
                     setSavePdfError(`Error al guardar el PDF: ${response.message || response.error}`);
                } else {
                     console.log('PresupuestoShareModal: Guardado de PDF cancelado por el usuario.');
                }
            }
        } catch (err) {
            console.error('PresupuestoShareModal: Error IPC al intentar guardar PDF:', err);
            setSavePdfError(`Error interno (IPC) al intentar guardar el PDF: ${err.message}`);
        } finally {
            setSavingPdf(false);
        }
    };

    const renderItemsTable = (items) => {
        if (!items || items.length === 0) {
            return <p>No hay elementos en este presupuesto.</p>;
        }
        return (
            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Eti x rollo</th>
                        <th>Precio (USD)</th>
                        <th>Descuento (%)</th>
                        <th>Total (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={item.id || index}>
                            <td>
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? `${item.codigo || ''} - ${item.Producto_Descripcion || item.Descripcion || ''}`
                                    : item.Descripcion_Personalizada || ''
                                }
                            </td>
                            <td>
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Cantidad !== null && item.Cantidad !== undefined ? item.Cantidad : 'N/A')
                                    : (item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? item.Cantidad_Personalizada : 'N/A')
                                }
                            </td>
                            <td>
                                {item.Producto_id !== null && item.Producto_id !== undefined ? item.eti_x_rollo || 'N/A' : 'N/A'}
                            </td>
                            <td>
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario).toFixed(2) : 'N/A')
                                    : (item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A')
                                }
                            </td>
                            <td>
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== undefined ? parseFloat(item.Descuento_Porcentaje).toFixed(2) : '0.00')
                                    : 'N/A'
                                }
                            </td>
                            <td>
                                {item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item).toFixed(2) : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

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

    return (
        <div className="modal-overlay" style={modalOverlayStyle}>
            <style>{modalScreenStyles}</style>
            <div className="modal-content" style={modalContentStyle} ref={contentRef}>
                {loading && <p style={{textAlign: 'center', color: '#bbb'}}>Cargando datos del presupuesto para compartir...</p>}
                {error && <p style={{ color: '#f08080', textAlign: 'center' }}>Error al cargar el presupuesto: {error}</p>}
                
                {!loading && !error && presupuestoData && (
                    <>
                        <div className="pdf-header">
                            <div className="header-left">
                                {logoFileUrl ? (
                                    <img src={logoFileUrl} alt="Logo" className="pdf-logo" />
                                ) : (
                                    <div className="pdf-logo-placeholder" style={{width: '150px', height: '50px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa'}}>
                                        Logo no configurado o no encontrado
                                    </div>
                                )}
                            </div>
                            <div className="header-right">
                                <h3 className="pdf-main-title">PRESUPUESTO</h3>
                                <div className="header-details">
                                    <div><strong>N°:</strong> {presupuestoData.Numero || ''}</div>
                                    {/* Usar la fecha formateada */}
                                    <div><strong>Fecha:</strong> {formattedDate}</div>
                                    <div><strong>Validez:</strong> {presupuestoData.ValidezOferta || 'N/A'} días</div>
                                </div>
                            </div>
                        </div>

                        <div className="pdf-section client-section">
                            <div className="section-title">Cliente</div>
                            <div className="detail-row">
                                <span className="detail-label">Empresa:</span>
                                <span>{presupuestoData.Nombre_Cliente || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">CUIT:</span>
                                <span>{presupuestoData.Cuit_Cliente || 'N/A'}</span>
                            </div>
                             {presupuestoData.Contacto_Cliente && (
                                <div className="detail-row">
                                    <span className="detail-label">Contacto:</span>
                                    <span>{presupuestoData.Contacto_Cliente}</span>
                                </div>
                             )}
                             {presupuestoData.Mail_Cliente && (
                                <div className="detail-row">
                                    <span className="detail-label">Email:</span>
                                    <span>{presupuestoData.Mail_Cliente}</span>
                                </div>
                             )}
                        </div>

                        <div className="pdf-section">
                            <div className="section-title">Elementos</div>
                            {renderItemsTable(presupuestoData.items)}
                        </div>

                        <div className="pdf-section totals-section">
                            <div className="section-title">Totales</div>
                            <div className="totals-section"> 
                                <div className="total-row">
                                    <span className="total-label">Subtotal (USD):</span>
                                    <span>{presupuestoData.Subtotal !== null && presupuestoData.Subtotal !== undefined ? parseFloat(presupuestoData.Subtotal).toFixed(2) : 'N/A'}</span>
                                </div>
                                <div className="total-row">
                                    <span className="total-label">IVA ({presupuestoData.IVA_Porcentaje !== null && presupuestoData.IVA_Porcentaje !== undefined ? parseFloat(presupuestoData.IVA_Porcentaje) : 0}%):</span>
                                    <span>{presupuestoData.IVA_Monto !== null && presupuestoData.IVA_Monto !== undefined ? parseFloat(presupuestoData.IVA_Monto).toFixed(2) : 'N/A'} USD</span>
                                </div>
                                 <div className="total-row">
                                     <span className="total-label">Otro (USD):</span>
                                     <span>{presupuestoData.Otro_Monto !== null && presupuestoData.Otro_Monto !== undefined ? parseFloat(presupuestoData.Otro_Monto).toFixed(2) : 'N/A'}</span>
                                 </div>
                                <div className="total-row total-emphasis">
                                    <span className="total-label">Total (USD):</span>
                                    <span>{presupuestoData.Total_USD !== null && presupuestoData.Total_USD !== undefined ? parseFloat(presupuestoData.Total_USD).toFixed(2) : 'N/A'}</span>
                                </div>
                                 <div className="total-row">
                                     <span className="total-label">Cotización Dólar:</span>
                                     <span>{presupuestoData.Cotizacion_Dolar !== null && presupuestoData.Cotizacion_Dolar !== undefined ? parseFloat(presupuestoData.Cotizacion_Dolar).toFixed(2) : 'N/A'}</span>
                                 </div>
                                <div className="total-row total-emphasis">
                                    <span className="total-label">Total (ARS):</span>
                                    <span>{presupuestoData.Total_ARS !== null && presupuestoData.Total_ARS !== undefined ? parseFloat(presupuestoData.Total_ARS).toFixed(2) : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pdf-section comments-section print-hidden-section">
                            <div className="section-title">Comentarios</div>
                            <div className="preformatted-text">{presupuestoData.Comentarios || 'N/A'}</div>
                        </div>

                        <div className="pdf-section conditions-section print-hidden-section">
                            <div className="section-title">Condiciones de Pago</div>
                            <div className="preformatted-text">{presupuestoData.CondicionesPago || 'N/A'}</div>
                        </div>

                        <div className="pdf-section payment-section print-hidden-section">
                            <div className="section-title">Datos de Pago</div>
                            <div className="preformatted-text">{presupuestoData.DatosPago || 'N/A'}</div>
                        </div>
                    </>
                )}
            </div>

            <div className="button-area" style={{
                 position: 'absolute',
                 bottom: '30px',
                 right: '40px',
                 textAlign: 'right',
                 zIndex: 1001,
                 width: 'auto',
                 display: 'flex',
                 gap: '10px',
                 flexWrap: 'wrap',
                 justifyContent: 'flex-end',
            }}>
                 {savePdfError && <p style={{ color: '#f08080', marginBottom: '15px', textAlign: 'right', width: '100%' }}>{savePdfError}</p>}
                 {!loading && !error && presupuestoData && (
                     <button
                         className="primary"
                         onClick={handleSavePdfContent}
                         disabled={savingPdf}
                     >
                         {savingPdf ? 'Generando PDF...' : 'Guardar como PDF'}
                     </button>
                 )}
                 <button
                     className="secondary"
                     onClick={onClose}
                 >
                     Cerrar
                 </button>
            </div>
        </div>
    );
}

export default PresupuestoShareModal;