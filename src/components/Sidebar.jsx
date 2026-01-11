import React, { useState, useEffect } from 'react';
import { 
  FiGrid, FiLayers, FiPackage, FiDollarSign, FiSettings, FiLogOut, FiX, 
  FiTruck, FiActivity, FiBell, FiMessageSquare, 
  FiUser, FiUsers, FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight 
} from "react-icons/fi";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Badge, Collapse } from 'react-bootstrap';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose, 
  handleLogout, 
  userEmail, 
  companyProfile, 
  userRole, 
  userData, 
  currentUser, 
  isCollapsed, 
  toggleCollapse 
}) => {
  
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State for Hover Tooltips
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // --- Real-time Badges ---
  useEffect(() => {
    if (!currentUser) return;
    const chatQuery = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
    const unsubChats = onSnapshot(chatQuery, (snapshot) => {
        let hasActivity = false;
        snapshot.docs.forEach(doc => {
            if (doc.data().lastMessage?.senderId !== currentUser.uid && !doc.data().lastMessage?.read) {
                hasActivity = true;
            }
        });
        setUnreadMsgCount(hasActivity ? 1 : 0);
    });
    const notifQuery = query(collection(db, "notifications"), where("read", "==", false), where("targetUserId", "==", currentUser.uid));
    const unsubNotifs = onSnapshot(notifQuery, (snap) => setUnreadNotifCount(snap.size));
    return () => { unsubChats(); unsubNotifs(); };
  }, [currentUser]);

  // Auto-Expand Settings logic
  useEffect(() => {
    if (activeTab.startsWith('settings_') && !isCollapsed) {
      setIsSettingsOpen(true);
    }
  }, [activeTab, isCollapsed]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { id: 'messages', label: 'Team Chat', icon: <FiMessageSquare />, badge: unreadMsgCount },
    { id: 'eggs', label: 'Egg Stock', icon: <FiLayers /> },
    { id: 'salebook', label: 'Sale Book', icon: <FiTruck /> },
    { id: 'damage', label: 'Damage / Dispose', icon: <FiActivity /> },
    { id: 'material', label: 'Raw Materials', icon: <FiPackage /> },
    { id: 'cashbook', label: 'Cash Book', icon: <FiDollarSign /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell />, badge: unreadNotifCount },
  ];

  const settingsSubItems = [
    { id: 'settings_profile', label: 'Profile', icon: <FiUser /> },
    { id: 'settings_users', label: 'User Mgmt', icon: <FiUsers /> },
    { id: 'settings_notifications', label: 'Notification', icon: <FiBell /> },
    { id: 'settings_inventory', label: 'Inventory', icon: <FiLayers /> },
    { id: 'settings_dispatch', label: 'Dispatch', icon: <FiTruck /> },
    { id: 'settings_damage', label: 'Damage', icon: <FiActivity /> },
    { id: 'settings_finance', label: 'Finance', icon: <FiDollarSign /> },
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 992) onClose();
  };

  // Handle Mouse Enter to calculate Tooltip Position
  const handleMouseEnter = (e, id) => {
      setHoveredItemId(id);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipTop(rect.top + (rect.height / 2)); 
  };

  const getInitials = () => {
      if (userData?.name) return userData.name.charAt(0).toUpperCase();
      return userEmail ? userEmail.charAt(0).toUpperCase() : 'U';
  };

  return (
    <>
      <div className={`sidebar-overlay d-lg-none ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      
      <div className={`sidebar-container ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        
        {/* Pro Toggle Bar */}
        <div 
            className="d-none d-lg-flex pro-toggle-bar" 
            onClick={toggleCollapse} 
            title={isCollapsed ? "Expand" : "Collapse"}
        >
           <div className="toggle-handle"></div>
        </div>

        {/* Header */}
        <div className="sidebar-header moving-header">
           <img 
             src={companyProfile?.logoUrl || "https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg"} 
             alt="Logo" className="sidebar-logo live-logo"
           />
           <div className="sidebar-marquee-container">
              <div className="sidebar-marquee-content">
                  <span className="brand-name">{companyProfile?.companyName || "Happinest"}</span>
                  <span className="brand-divider">•</span>
                  <span className="brand-sub">BioCore Enterprise</span>
              </div>
           </div>
           <button className="d-lg-none ms-auto text-white bg-transparent border-0 close-btn" onClick={onClose}>
             <FiX size={24} className="hover-white"/>
           </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav custom-scrollbar"> 
           {!isCollapsed && <p className="nav-label">Main Menu</p>}
           
           {menuItems.map((item) => (
             <div 
               key={item.id} 
               className={`nav-item ${activeTab === item.id ? 'active' : ''}`} 
               onClick={() => handleItemClick(item.id)}
               onMouseEnter={(e) => handleMouseEnter(e, item.id)} 
               onMouseLeave={() => setHoveredItemId(null)}
             >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
                
                {/* Badge */}
                {item.badge > 0 && (
                  <Badge 
                    pill 
                    bg="danger" 
                    className={`notification-badge-style ${isCollapsed ? 'collapsed-badge' : 'ms-auto'}`} 
                  >
                    {isCollapsed ? '' : (item.badge > 99 ? '99+' : item.badge)}
                  </Badge>
                )}

                {/* Pro Tooltip */}
                {isCollapsed && hoveredItemId === item.id && (
                    <div className="pro-tooltip" style={{ top: `${tooltipTop}px` }}>
                        {item.label}
                        {item.badge > 0 && <span className="tooltip-badge">{item.badge}</span>}
                    </div>
                )}
             </div>
           ))}

           {/* Admin Zone */}
           {userRole === 'Admin' && (
             <>
               {!isCollapsed && <div className="nav-label mt-3">Admin Zone</div>}
               <div 
                 className={`nav-item ${activeTab.startsWith('settings') ? 'active' : ''}`} 
                 onClick={() => {
                   if (isCollapsed) toggleCollapse();
                   setIsSettingsOpen(!isSettingsOpen);
                 }}
                 onMouseEnter={(e) => handleMouseEnter(e, 'settings')}
                 onMouseLeave={() => setHoveredItemId(null)}
                 style={{ cursor: 'pointer', justifyContent: isCollapsed ? 'center' : 'space-between' }}
               >
                  <div className="d-flex align-items-center">
                    <span className="nav-icon"><FiSettings /></span>
                    <span className="nav-text">System Settings</span>
                  </div>
                  {!isCollapsed && (isSettingsOpen ? <FiChevronUp className="chevron-icon"/> : <FiChevronDown className="chevron-icon"/>)}

                  {/* Tooltip for Settings */}
                  {isCollapsed && hoveredItemId === 'settings' && (
                      <div className="pro-tooltip" style={{ top: `${tooltipTop}px` }}>System Settings</div>
                  )}
               </div>

               <Collapse in={!isCollapsed && isSettingsOpen}>
                 <div className="mt-1 mb-2"> 
                    {settingsSubItems.map((sub) => (
                      <div 
                        key={sub.id}
                        className={`nav-item ${activeTab === sub.id ? 'active' : ''}`}
                        onClick={() => handleItemClick(sub.id)}
                        style={{ paddingLeft: '34px', width: '92%', marginLeft: 'auto', fontSize: '0.9rem' }}
                      >
                         <span className="nav-icon" style={{ fontSize: '1rem', marginRight: '10px' }}>{sub.icon}</span>
                         <span className="nav-text">{sub.label}</span>
                      </div>
                    ))}
                 </div>
               </Collapse>
             </>
           )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
           {/* ✅ FIX: Added onClick to redirect to 'profile' page */}
           <div 
             className="user-info" 
             onClick={() => handleItemClick('profile')} 
             style={{ cursor: 'pointer' }}
             title="Go to Profile"
           >
              <div className="user-avatar">
                 {userData?.photoURL ? (
                   <img src={userData.photoURL} alt="User" style={{width:'100%', height:'100%', borderRadius:'10px', objectFit:'cover'}} />
                 ) : (
                   <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:'bold', color:'#fff'}}>
                     {getInitials()}
                   </div>
                 )}
              </div>
              <div className="overflow-hidden user-details-box ps-2">
                 <span className="user-role text-white d-block fw-bold" style={{fontSize: '0.85rem'}}>{userData?.name || "Manager"}</span>
                 <span className="user-email text-white-50 d-block text-truncate" style={{fontSize: '0.7rem', maxWidth: '120px'}}>{userEmail}</span>
              </div>
           </div>
           
           <button className="logout-btn ms-auto" onClick={handleLogout} title="Sign Out">
             <FiLogOut size={18} />
           </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;