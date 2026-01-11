import React, { useEffect, useState } from 'react';
import { ProgressBar } from 'react-bootstrap';
import { FiShield, FiCheckCircle, FiLock } from "react-icons/fi";

const LogoutPage = () => {
  const [progress, setProgress] = useState(0);

  // Fake Progress Animation for 2.5 seconds (matching App.jsx timeout)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) return 100;
        return old + 2; // Speed of progress
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // --- STYLES ---
  const s = {
    wrapper: {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    },
    card: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      padding: '40px',
      borderRadius: '24px',
      boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.8)',
      textAlign: 'center',
      maxWidth: '400px', width: '90%',
      position: 'relative',
      overflow: 'hidden'
    },
    logoContainer: {
      width: '90px', height: '90px', borderRadius: '50%',
      background: 'white', padding: '5px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      margin: '0 auto 20px auto',
      position: 'relative',
      animation: 'float 3s ease-in-out infinite'
    },
    logo: {
      width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'
    },
    statusBadge: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: 'rgba(16, 185, 129, 0.1)', color: '#059669',
      padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
      marginBottom: '20px', border: '1px solid rgba(16, 185, 129, 0.2)'
    }
  };

  return (
    <div className="fade-in" style={s.wrapper}>
      <div style={s.card}>
        
        {/* Decorative Background Blur Blob */}
        <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, rgba(255,255,255,0) 70%)',
            zIndex: 0, pointerEvents: 'none'
        }}></div>

        {/* LOGO */}
        <div style={{...s.logoContainer, zIndex: 1}}>
           <img src="https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg" alt="Logo" style={s.logo} />
           
           {/* Lock Badge on Logo */}
           <div style={{
               position: 'absolute', bottom: '0', right: '0',
               background: '#3b82f6', color: 'white',
               width: '28px', height: '28px', borderRadius: '50%',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               border: '2px solid white', boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
           }}>
              <FiLock size={14} />
           </div>
        </div>

        {/* CONTENT */}
        <div style={{position: 'relative', zIndex: 1}}>
            <h3 className="fw-bold text-dark mb-1">Securely Signing Off</h3>
            <p className="text-muted mb-4 small">Thank you for using BioCore ERP.</p>

            {/* STATUS BADGE */}
            <div style={s.statusBadge}>
               <FiShield size={14}/> Session Encrypted
            </div>

            {/* PROGRESS BAR */}
            <div className="text-start mb-2">
                <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted fw-bold" style={{fontSize: '0.75rem'}}>Clearing Cache...</small>
                    <small className="text-primary fw-bold" style={{fontSize: '0.75rem'}}>{Math.round(progress)}%</small>
                </div>
                <ProgressBar now={progress} variant="primary" style={{height: '6px', borderRadius: '10px'}} animated />
            </div>
            
            <div className="mt-4 pt-3 border-top border-light">
               <small className="text-muted opacity-75" style={{fontSize: '0.7rem'}}>
                 <FiCheckCircle className="me-1 text-success"/> System Secured by Happinest
               </small>
            </div>
        </div>

      </div>

      {/* ANIMATION KEYFRAMES */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
    </div>
  );
};

export default LogoutPage;