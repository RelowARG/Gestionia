// src/components/PendingItemEditModal.js

import React, { useState, useEffect } from 'react';

function PendingItemEditModal({ item, onClose, onSave, ventaStates, ventaPagos, compraStates }) {
    // item: Data of the pending item to edit ({ id, type: 'venta'|'ventax'|'compra', currentStatus, currentPayment, factNro, clienteProveedor })
    // onClose: Function to close the modal
    // onSave: Callback function to send updated data to Home.js for saving via IPC
    // ventaStates, ventaPagos, compraStates: Lists of options for status/payment selects

    const [selectedStatus, setSelectedStatus] = useState(item.currentStatus);
    // Initialize selectedPayment for all types, but it will only be displayed/editable for sales/ventasX/purchases
    const [selectedPayment, setSelectedPayment] = useState(item.currentPayment || '');


    // Determine status options and if payment field is shown/editable
    const isVentaOrVentaX = item.type === 'venta' || item.type === 'ventax';
     // AÑADIDO: Determinar si es una compra para mostrar el campo de pago de compra
    const isCompra = item.type === 'compra';
    const statusOptions = isVentaOrVentaX ? ventaStates : compraStates;
    const paymentOptions = isVentaOrVentaX ? ventaPagos : (isCompra ? ['abonado', 'deuda'] : []); // <<< Opciones de pago para compras


    // Handle changes for selects
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value);
    };

    const handlePaymentChange = (e) => {
        setSelectedPayment(e.target.value);
    };

    // Handle Save button click
    const handleSaveClick = () => {
        // Validate that status is selected (and payment if applicable for sales/ventasX/purchases)
        if (!selectedStatus || (isVentaOrVentaX && !selectedPayment) || (isCompra && !selectedPayment)) { // <<< Incluida validación para pago en compras
             alert("Por favor, seleccione un estado y pago válidos.");
             return;
        }

        // Build the object with updated data to pass to onSave
        const updatedData = {
            id: item.id,
            type: item.type,
            Estado: selectedStatus,
            // Include Pago if it's a sale, ventaX, or purchase and selectedPayment is not empty
            Pago: (isVentaOrVentaX || isCompra) && selectedPayment !== '' ? selectedPayment : undefined, // <<< Incluido isCompra
        };

        // Call the onSave function passed from the parent component (Home.js)
        onSave(updatedData);
        // The modal will be closed in the parent's onSave callback (handleSaveEditedItem)
    };

     // Optional: Close the modal if clicking outside
     const handleOverlayClick = (e) => {
         if (e.target.classList.contains('modal-overlay')) {
             onClose();
         }
     };


    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                {/* Modal Title */}
                {/* Updated title to be more general */}
                <h3>Editar Pendiente ({item.type === 'venta' ? 'Venta' : item.type === 'ventax' ? 'VentaX' : 'Compra'})</h3>


                {/* Display item information */}
                 <p><strong>ID:</strong> {item.id}</p>
                 <p><strong>Fact/Nro:</strong> {item.factNro}</p>
                 <p><strong>Cliente/Proveedor:</strong> {item.clienteProveedor}</p>
                 <hr style={{ borderColor: '#424242', margin: '15px 0' }}/>

                {/* Status edit form */}
                <div>
                    <label htmlFor="edit-status">Estado:</label>
                    <select id="edit-status" value={selectedStatus} onChange={handleStatusChange} required>
                        <option value="">Seleccionar Estado</option>
                        {statusOptions.map(option => (
                             // Capitalize first letter for display
                             <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                        ))}
                    </select>
                </div>

                {/* Payment edit form (only for Sales, VentasX, and Purchases) */}
                {(isVentaOrVentaX || isCompra) && ( // <<< Show for Ventas, VentasX, AND Compras
                     <div>
                        <label htmlFor="edit-payment">Pago:</label>
                        <select id="edit-payment" value={selectedPayment} onChange={handlePaymentChange} required>
                             <option value="">Seleccionar Pago</option>
                             {paymentOptions.map(option => (
                                 // Capitalize first letter for display if it's a standard option
                                 <option key={option} value={option}>
                                     {option.charAt(0).toUpperCase() + option.slice(1)}
                                 </option>
                             ))}
                         </select>
                     </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button onClick={handleSaveClick} className="primary">
                        Guardar Cambios
                    </button>
                    <button onClick={onClose} className="secondary">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PendingItemEditModal;