import React from 'react';
import { Modal, Toast, Button } from 'react-bootstrap';
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX, FiShield, FiAlertCircle } from "react-icons/fi";

// --- 1. PREMIUM TOAST NOTIFICATION ---
export const ToastNotification = ({ show, message, type = 'success', onClose }) => {
  // Config based on type
  const config = {
    success: {
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Green Gradient
      icon: <FiCheckCircle size={22} className="text-white" />,
      shadow: '0 10px 30px -5px rgba(16, 185, 129, 0.4)'
    },
    error: {
      bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // Red Gradient
      icon: <FiAlertCircle size={22} className="text-white" />,
      shadow: '0 10px 30px -5px rgba(239, 68, 68, 0.4)'
    },
    warning: {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Orange Gradient
      icon: <FiAlertTriangle size={22} className="text-white" />,
      shadow: '0 10px 30px -5px rgba(245, 158, 11, 0.4)'
    }
  };

  const style = config[type] || config.success;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        animation: show ? 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'fadeOut 0.3s'
      }}
    >
      <Toast 
        show={show} 
        onClose={onClose} 
        delay={3000} 
        autohide 
        style={{
          background: style.bg,
          color: 'white',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: style.shadow,
          minWidth: '320px',
          overflow: 'hidden'
        }}
      >
        <div className="d-flex align-items-center p-3">
          <div style={{
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '12px', 
            padding: '10px', 
            display:'flex', 
            marginRight:'15px'
          }}>
            {style.icon}
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-0 fw-bold" style={{ fontSize: '0.95rem' }}>
              {type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Attention'}
            </h6>
            <small style={{ fontSize: '0.85rem', opacity: 0.9 }}>{message}</small>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-link text-white p-0 ms-2" 
            style={{ opacity: 0.7 }}
          >
            <FiX size={20}/>
          </button>
        </div>
      </Toast>
      
      {/* Animation Styles */}
      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

// --- 2. PREMIUM CONFIRMATION MODAL ---
export const ConfirmationModal = ({ show, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Confirm' }) => {
  
  const isDanger = type === 'danger';
  const themeColor = isDanger ? '#ef4444' : '#3b82f6';
  
  return (
    <Modal 
      show={show} 
      onHide={onClose} 
      centered 
      backdrop="static" // Prevent click outside
      style={{ zIndex: 1060 }}
      contentClassName="border-0 bg-transparent" // Important for custom look
    >
      {/* Blurred Backdrop Effect is handled by Bootstrap Modal, but we add custom card style */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        padding: '0'
      }}>
        
        {/* Header Graphic */}
        <div style={{
          height: '6px',
          width: '100%',
          background: isDanger 
            ? 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)' 
            : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
        }}></div>

        <div className="p-4 text-center">
          {/* Animated Icon Ring */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: themeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            animation: 'pulseRing 2s infinite'
          }}>
            {isDanger ? <FiShield size={36} /> : <FiInfo size={36} />}
          </div>

          <h4 className="fw-bold text-dark mb-2">{title}</h4>
          <p className="text-muted mb-4 px-3" style={{fontSize: '0.95rem'}}>{message}</p>

          {/* Action Buttons */}
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              variant="light" 
              onClick={onClose}
              className="px-4 py-2 fw-bold text-muted border"
              style={{ borderRadius: '12px', minWidth: '120px' }}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={onConfirm}
              className="px-4 py-2 fw-bold text-white border-0"
              style={{ 
                borderRadius: '12px', 
                minWidth: '120px',
                background: isDanger 
                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: isDanger 
                  ? '0 4px 15px rgba(239, 68, 68, 0.3)' 
                  : '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulseRing {
            0% { box-shadow: 0 0 0 0 ${isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; }
            70% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
          }
        `}
      </style>
    </Modal>
  );
};