import React, { useEffect } from 'react';
import { Modal, Button, Toast, ToastContainer } from 'react-bootstrap';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiLogOut } from "react-icons/fi";

// --- 1. CUSTOM POPUP MODAL (For Logout/Delete) ---
export const ConfirmationModal = ({ show, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Yes, Proceed' }) => {
  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" className="custom-modal-backdrop">
      <div className="custom-modal-content">
        <div className={`modal-icon-header ${type === 'danger' ? 'bg-danger' : 'bg-primary'}`}>
           {type === 'danger' ? <FiLogOut size={30} className="text-white"/> : <FiInfo size={30} className="text-white"/>}
        </div>
        
        <Modal.Body className="text-center pt-5 pb-4 px-4">
          <h4 className="fw-bold text-dark mb-2">{title}</h4>
          <p className="text-muted mb-0">{message}</p>
        </Modal.Body>
        
        <div className="modal-actions p-3 d-flex gap-3 justify-content-center bg-light rounded-bottom">
           <Button variant="light" onClick={onClose} className="flex-fill fw-bold border text-muted">
             Cancel
           </Button>
           <Button variant={type} onClick={onConfirm} className="flex-fill fw-bold shadow-sm">
             {confirmText}
           </Button>
        </div>
      </div>
    </Modal>
  );
};

// --- 2. CUSTOM TOAST NOTIFICATION (For Success/Error) ---
export const ToastNotification = ({ show, onClose, message, type = 'success' }) => {
  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
      <Toast onClose={onClose} show={show} delay={3000} autohide className={`custom-toast border-0 shadow-lg`}>
        <div className={`d-flex align-items-center p-3 rounded ${type === 'success' ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
           <div className={`toast-icon-box me-3 ${type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
              {type === 'success' ? <FiCheckCircle size={18}/> : <FiAlertTriangle size={18}/>}
           </div>
           <div className="flex-grow-1">
              <strong className={`d-block ${type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {type === 'success' ? 'Success' : 'Attention'}
              </strong>
              <small className="text-muted">{message}</small>
           </div>
           <button onClick={onClose} className="btn-close ms-2 fs-6"></button>
        </div>
      </Toast>
    </ToastContainer>
  );
};