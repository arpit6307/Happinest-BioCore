import React from 'react';
import { FiMenu, FiGrid, FiLayers, FiPackage, FiDollarSign, FiSettings, FiBell, FiCpu, FiTruck } from "react-icons/fi"; // Added FiTruck

const MobileHeader = ({ onToggle, userEmail, title, companyProfile }) => {
  
  const getPageDetails = () => {
    switch(title) {
        case 'dashboard': return { icon: <FiGrid/>, label: 'Overview', color: 'text-primary' };
        case 'eggs': return { icon: <FiLayers/>, label: 'Egg Stock', color: 'text-warning' };
        case 'salebook': return { icon: <FiTruck/>, label: 'Sale Book', color: 'text-primary' }; // <--- NEW CASE
        case 'material': return { icon: <FiPackage/>, label: 'Inventory', color: 'text-info' };
        case 'cashbook': return { icon: <FiDollarSign/>, label: 'Finance', color: 'text-success' };
        case 'settings': return { icon: <FiSettings/>, label: 'Config', color: 'text-secondary' };
        default: return { icon: <FiCpu/>, label: 'BioCore', color: 'text-dark' };
    }
  };

  const { icon, label, color } = getPageDetails();

  return (
    <div className="mobile-glass-header d-md-none">
      <div className="d-flex align-items-center justify-content-between w-100">
        <button className="mobile-menu-btn" onClick={onToggle}><FiMenu size={24} /></button>
        <div className="mobile-page-identity">
           <span className={`page-icon ${color}`}>{icon}</span>
           <span className="page-label ms-2">{label}</span>
        </div>
        <div className="d-flex align-items-center gap-3">
           <button className="mobile-action-btn"><FiBell size={22} /><span className="notification-pulse"></span></button>
           <div className="mobile-avatar-container">
              <div className="mobile-user-avatar">
                {companyProfile?.adminPhotoUrl ? <img src={companyProfile.adminPhotoUrl} alt="Admin" style={{width: '100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : (userEmail ? userEmail.charAt(0).toUpperCase() : 'A')}
              </div>
              <div className="online-badge"></div>
           </div>
        </div>
      </div>
    </div>
  );
};
export default MobileHeader;