import React from 'react';
import { FiGrid, FiLayers, FiPackage, FiDollarSign, FiSettings, FiLogOut, FiX, FiTruck } from "react-icons/fi"; // Added FiTruck

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, handleLogout, userEmail, companyProfile }) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { id: 'eggs', label: 'Egg Stock', icon: <FiLayers /> },
    { id: 'salebook', label: 'Sale Book', icon: <FiTruck /> }, // <--- NEW ITEM
    { id: 'material', label: 'Raw Materials', icon: <FiPackage /> },
    { id: 'cashbook', label: 'Cash Book', icon: <FiDollarSign /> },
    { id: 'settings', label: 'System Settings', icon: <FiSettings /> },
  ];

  return (
    <>
      <div className={`sidebar-overlay d-lg-none ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      <div className={`sidebar-container ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
           <img src={companyProfile?.logoUrl || "https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg"} alt="Logo" className="sidebar-logo"/>
           <div className="sidebar-brand-text">
              <h4>{companyProfile?.companyName || "Happinest BioCore"}</h4>
              <span>Enterprise Edition</span>
           </div>
           <button className="d-lg-none ms-auto text-white bg-transparent border-0" onClick={onClose}><FiX size={24}/></button>
        </div>
        <div className="sidebar-nav">
           <p className="nav-label">MAIN MENU</p>
           {menuItems.map((item) => (
             <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); onClose(); }}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
             </div>
           ))}
        </div>
        <div className="sidebar-footer">
           <div className="user-info">
              <div className="user-avatar">
                 {companyProfile?.adminPhotoUrl ? <img src={companyProfile.adminPhotoUrl} alt="Admin" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} /> : (userEmail ? userEmail.charAt(0).toUpperCase() : 'A')}
              </div>
              <div className="overflow-hidden">
                 <span className="user-role">{companyProfile?.managerName || "Admin Manager"}</span>
                 <span className="user-email text-truncate" style={{maxWidth: '120px'}}>{userEmail}</span>
              </div>
           </div>
           <button className="logout-btn" onClick={handleLogout} title="Logout"><FiLogOut size={20} /></button>
        </div>
      </div>
    </>
  );
};
export default Sidebar;