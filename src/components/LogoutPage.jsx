import React from 'react';
import { Spinner, Container } from 'react-bootstrap';
import { FiLock, FiCheckCircle } from "react-icons/fi";

const LogoutPage = () => {
  return (
    <div className="logout-screen-wrapper fade-in">
      <div className="logout-card">
        
        {/* Animated Icon Ring */}
        <div className="logout-icon-ring mb-4">
           <FiLock size={40} className="text-primary logout-lock-icon" />
        </div>

        <h3 className="fw-bold text-dark mb-2">Securely Signing Off</h3>
        <p className="text-muted mb-4">Saving your preferences and clearing session...</p>

        <div className="d-flex align-items-center justify-content-center gap-2 text-primary bg-primary bg-opacity-10 py-2 px-4 rounded-pill">
           <Spinner animation="border" size="sm" /> 
           <span className="small fw-bold">Redirecting to Home...</span>
        </div>

        <div className="mt-4 pt-3 border-top w-100 text-center">
           <small className="text-muted" style={{fontSize: '0.7rem'}}>
             Happinest BioCore &copy; {new Date().getFullYear()}
           </small>
        </div>

      </div>
    </div>
  );
};

export default LogoutPage;