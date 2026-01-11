import React, { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiMapPin, FiCheck, FiClock, FiCalendar } from "react-icons/fi";
import { Badge, Modal } from 'react-bootstrap';

const MobileHeader = ({ 
  onToggle, 
  title, 
  onNotificationClick, 
  totalUnread, 
  unreadNotifCount,
  userRole,
  selectedBranch,
  setSelectedBranch,
  availableBranches
}) => {
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Clock Logic (Updates every second) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Date & Time for India
  const dateStr = currentTime.toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' 
  });
  const timeStr = currentTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' 
  });

  // --- Styles ---
  const headerStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 1040,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
  };

  const branchItemStyle = (isActive) => ({
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '10px',
    backgroundColor: isActive ? '#eff6ff' : '#f8fafc',
    border: isActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
    color: isActive ? '#1d4ed8' : '#334155',
    fontWeight: isActive ? '700' : '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <>
      <div className="d-lg-none" style={headerStyle}>
        
        {/* Left: Menu Toggle */}
        <button 
          className="btn btn-link text-dark p-0 me-3" 
          onClick={onToggle}
          style={{ fontSize: '1.2rem', textDecoration: 'none' }}
        >
          <FiMenu size={24} />
          {totalUnread > 0 && (
            <span 
              className="position-absolute translate-middle p-1 bg-danger border border-light rounded-circle" 
              style={{ width:'10px', height:'10px', top:'15px', left:'35px' }}
            ></span>
          )}
        </button>

        {/* Center: Title + Date/Time */}
        <div className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
           <h6 className="fw-bold mb-0 text-capitalize text-truncate" style={{ fontSize: '1.1rem', color: '#0f172a', maxWidth: '180px' }}>
             {title.replace('_', ' ')}
           </h6>
           
           {/* ✅ NEW: Date & Time Display (Mobile Only) */}
           <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>
              <span>{dateStr}</span>
              <span style={{ width:'3px', height:'3px', background:'#cbd5e1', borderRadius:'50%' }}></span>
              <span>{timeStr}</span>
           </div>
        </div>

        {/* Right: Actions */}
        <div className="d-flex align-items-center gap-3">
           {userRole === 'Admin' && (
             <button 
               className="btn p-0 position-relative"
               onClick={() => setShowBranchModal(true)}
               style={{ color: '#64748b', border: 'none', background: 'transparent' }}
             >
               <FiMapPin size={22} />
             </button>
           )}

           <button 
             className="btn p-0 position-relative" 
             onClick={onNotificationClick}
             style={{ color: '#64748b', border: 'none', background: 'transparent' }}
           >
             <FiBell size={22} />
             {unreadNotifCount > 0 && (
               <Badge 
                 pill 
                 bg="danger" 
                 className="position-absolute start-100 translate-middle"
                 style={{ top: '0', fontSize: '0.6rem', padding: '0.25em 0.4em' }}
               >
                 {unreadNotifCount}
               </Badge>
             )}
           </button>
        </div>
      </div>

      {/* --- Branch Modal --- */}
      <Modal 
        show={showBranchModal} 
        onHide={() => setShowBranchModal(false)} 
        centered
        size="sm"
        className="mobile-branch-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 text-dark">Select Location</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="text-muted small mb-4">Choose a branch to filter data.</p>
          
          <div 
            style={branchItemStyle(selectedBranch === 'All')}
            onClick={() => { setSelectedBranch('All'); setShowBranchModal(false); }}
          >
            <div className="d-flex align-items-center gap-2">
                <FiMapPin size={16} className={selectedBranch === 'All' ? 'text-primary' : 'text-muted'} />
                <span>All Branches</span>
            </div>
            {selectedBranch === 'All' && <FiCheck size={20} className="text-primary" />}
          </div>

          {availableBranches && availableBranches.map(branch => (
            <div 
              key={branch}
              style={branchItemStyle(selectedBranch === branch)}
              onClick={() => { setSelectedBranch(branch); setShowBranchModal(false); }}
            >
              <div className="d-flex align-items-center gap-2">
                  <FiMapPin size={16} className={selectedBranch === branch ? 'text-primary' : 'text-muted'} />
                  <span>{branch}</span>
              </div>
              {selectedBranch === branch && <FiCheck size={20} className="text-primary" />}
            </div>
          ))}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default MobileHeader;