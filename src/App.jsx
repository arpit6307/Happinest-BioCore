import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Container, Modal, Button, Form, Badge } from 'react-bootstrap'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'; 
import { auth, db } from './firebase';
import { FiBell, FiMapPin, FiChevronDown, FiCheck } from "react-icons/fi"; 

// Components
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import EggInventory from './components/EggInventory';
import MaterialInventory from './components/MaterialInventory';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ExpenseTracker from './components/ExpenseTracker';
import SaleBook from './components/SaleBook';
import DamageBook from './components/DamageBook';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import Login from './components/Login';
import Loader from './components/Loader';
import LandingPage from './components/LandingPage';
import LogoutPage from './components/LogoutPage';
import Footer from './components/Footer';
import ChatPage from './components/ChatPage';
import { ConfirmationModal, ToastNotification } from './components/CustomAlerts';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // ✅ NEW: Sidebar Collapse State for Desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  
  // --- Global Counts State ---
  const [totalUnread, setTotalUnread] = useState(0); 
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // --- Multi-User & Branch State ---
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [availableBranches] = useState(['Delhi', 'Lucknow']);
  
  // --- CUSTOM DROPDOWN STATE ---
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // --- Notification State ---
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'Happinest BioCore',
    managerName: 'Admin',
    logoUrl: 'https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg',
    adminPhotoUrl: ''
  });

  // --- 1. AUTH & REAL-TIME LISTENERS ---
  useEffect(() => {
    let userUnsub; 
    let msgUnsub; 
    let notifUnsub;
    let unreadUnsubscibers = [];

    const authUnsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          setUser(currentUser);
          
          // A. Fetch User Profile
          const userDocRef = doc(db, "users", currentUser.uid);
          userUnsub = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setUserRole(data.role || 'Manager');
                setUserBranch(data.branch || 'Delhi');
                
                if (data.role === 'Admin') {
                    setSelectedBranch(prev => prev === 'All' || availableBranches.includes(prev) ? prev : 'All');
                } else {
                    setSelectedBranch(data.branch);
                }
                setCompanyProfile(prev => ({ ...prev, managerName: data.name }));
            }
          });

          // B. Global Unread Chat Count
          const qChats = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
          msgUnsub = onSnapshot(qChats, (snapshot) => {
             // Clear old sub-listeners
             unreadUnsubscibers.forEach(unsub => unsub());
             unreadUnsubscibers = [];
             
             let countsMap = {};

             snapshot.docs.forEach((chatDoc) => {
                const chatId = chatDoc.id;
                // Count unread messages where sender is NOT me
                const qUnread = query(
                  collection(db, "chats", chatId, "messages"),
                  where("read", "==", false),
                  where("senderId", "!=", currentUser.uid)
                );

                const unsubUnread = onSnapshot(qUnread, (unreadSnap) => {
                   countsMap[chatId] = unreadSnap.size;
                   const total = Object.values(countsMap).reduce((a, b) => a + b, 0);
                   setTotalUnread(total);
                });
                unreadUnsubscibers.push(unsubUnread);
             });
          });

          // C. Global Notifications Count (✅ FIXED: Only count MY notifications)
          const qNotifs = query(
            collection(db, "notifications"), 
            where("seen", "==", false),
            where("targetUserId", "==", currentUser.uid) // 👈 This ensures point-to-point count
          );
          
          notifUnsub = onSnapshot(qNotifs, (notifSnap) => {
             setUnreadNotifCount(notifSnap.size);
          }, (error) => {
             console.error("Notification Count Error (Check Indexes):", error);
          });

          setShowLogin(false);
          setIsLoggingOut(false);
          checkNotificationPermission();
      } else {
          setUser(null);
          setUserData(null);
          setTotalUnread(0);
          setUnreadNotifCount(0);
          if (userUnsub) userUnsub();
          if (msgUnsub) msgUnsub();
          if (notifUnsub) notifUnsub();
          unreadUnsubscibers.forEach(unsub => unsub());
      }
      setAuthLoading(false);
    });

    return () => { 
        authUnsub();
        if (userUnsub) userUnsub();
        if (msgUnsub) msgUnsub();
        if (notifUnsub) notifUnsub();
        unreadUnsubscibers.forEach(unsub => unsub());
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isBranchDropdownOpen && !event.target.closest('.custom-branch-dropdown')) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  // --- Notification Logic ---
  useEffect(() => {
    if (activeTab === 'notifications') {
      setUnreadNotifCount(0);
    }
  }, [activeTab]);

  const checkNotificationPermission = () => {
    const hasAsked = localStorage.getItem('notif_asked');
    if (!hasAsked && "Notification" in window) {
      setTimeout(() => setShowNotifModal(true), 2000);
    } else if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      runBackgroundStockCheck();
    }
  };

  const handleAllowNotifications = async () => {
    const permission = await Notification.requestPermission();
    localStorage.setItem('notif_asked', 'true');
    setShowNotifModal(false);
    if (permission === "granted") {
      setPermissionGranted(true);
      showToast("Notifications Enabled!", "success");
      runBackgroundStockCheck();
    }
  };

  const handleDenyNotifications = () => {
    localStorage.setItem('notif_asked', 'true');
    setShowNotifModal(false);
  };

  const runBackgroundStockCheck = async () => {
    try {
      const [stockSnap, saleSnap, damageSnap] = await Promise.all([
        getDocs(collection(db, "egg_inventory")),
        getDocs(collection(db, "sale_book")),
        getDocs(collection(db, "egg_damage"))
      ]);
      let totalProd = 0, totalSold = 0, totalDamaged = 0;
      stockSnap.forEach(d => totalProd += Number(d.data().totalEggs || 0));
      saleSnap.forEach(d => totalSold += Number(d.data().grandTotalOrder || 0));
      damageSnap.forEach(d => totalDamaged += Number(d.data().totalEggs || 0));
      const currentStock = totalProd - (totalSold + totalDamaged);
      const currentTrays = Math.floor(currentStock / 30);

      if (currentStock <= 30000 && Notification.permission === "granted") {
         new Notification("⚠️ CRITICAL STOCK ALERT", {
           body: `ATTENTION: Only ${currentTrays} Trays left!`,
           icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png", tag: "low-stock"
         });
      }
    } catch (err) { console.error("Bg Check Error", err); }
  };

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };
  const handleLogoutClick = () => { setShowLogoutModal(true); setIsMobileMenuOpen(false); };
  const confirmLogout = () => {
      setShowLogoutModal(false);
      setIsLoggingOut(true);
      setTimeout(async () => {
          await signOut(auth);
          setActiveTab('dashboard');
          setIsLoggingOut(false);
      }, 2500);
  };

  if (authLoading) return <Loader fullScreen={true} text="Initializing BioCore..." />;
  if (isLoggingOut) return <LogoutPage />;
  if (!user) return <div className="d-flex flex-column min-vh-100">{showLogin ? <Login /> : <LandingPage onLoginClick={() => setShowLogin(true)} />}<Footer sidebarActive={false} /></div>;

  const renderContent = () => {
    if (activeTab.startsWith('settings')) {
        const subSection = activeTab.split('_')[1] || 'profile';
        return <Settings userRole={userRole} activeSection={subSection} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard selectedBranch={selectedBranch} userRole={userRole} />;
      case 'messages': return <ChatPage currentUser={user} userRole={userRole} userData={userData} />;
      case 'eggs': return <EggInventory selectedBranch={selectedBranch} userRole={userRole} setActiveTab={setActiveTab} />;
      case 'material': return <MaterialInventory selectedBranch={selectedBranch} userRole={userRole} setActiveTab={setActiveTab} />;
      case 'salebook': return <SaleBook selectedBranch={selectedBranch} userRole={userRole} setActiveTab={setActiveTab} />;
      case 'damage': return <DamageBook selectedBranch={selectedBranch} userRole={userRole} setActiveTab={setActiveTab} />;
      case 'cashbook': return <ExpenseTracker selectedBranch={selectedBranch} userRole={userRole} setActiveTab={setActiveTab} />;
      case 'profile': return <Profile userProfile={{name: companyProfile.managerName, role: userRole, branch: userBranch}} />;
      case 'notifications': return <Notifications setActiveTab={setActiveTab} selectedBranch={selectedBranch} />;
      default: return <h2>Select an option</h2>;
    }
  };

  const dropdownStyles = {
    container: { position: 'relative', zIndex: 1050, fontFamily: "'Inter', sans-serif" },
    button: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        color: 'white', border: 'none', padding: '10px 20px', borderRadius: '50px', 
        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)', transition: 'all 0.3s ease',
        minWidth: '180px', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px'
    },
    menu: {
        position: 'absolute', top: '120%', right: 0, backgroundColor: 'white',
        borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: '8px',
        minWidth: '220px', display: isBranchDropdownOpen ? 'block' : 'none',
        animation: 'fadeIn 0.2s ease-in-out', border: '1px solid #e2e8f0', overflow: 'hidden'
    },
    menuItem: (isActive) => ({
        padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: isActive ? '#0f172a' : '#64748b', backgroundColor: isActive ? '#f1f5f9' : 'transparent',
        fontWeight: isActive ? '700' : '500', transition: 'all 0.2s', fontSize: '0.9rem', marginBottom: '2px'
    }),
    iconBox: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }
  };

  return (
    <div className="app-container">
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={confirmLogout} title="Ready to Leave?" message="Your session will be closed." type="danger" confirmText="Secure Logout" />
      
      <Modal show={showNotifModal} onHide={handleDenyNotifications} centered backdrop="static">
        <Modal.Body className="text-center p-4">
           <div style={{width:'60px', height:'60px', background:'#e0f2fe', color:'#0284c7', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px auto'}}>
              <FiBell size={28} />
           </div>
           <h4 className="fw-bold mb-2">Enable Smart Alerts?</h4>
           <p className="text-muted small mb-4">Get instant updates on your mobile when Stock is Low or critical incidents happen.</p>
           <div className="d-flex gap-2 justify-content-center">
              <Button variant="light" className="w-50 fw-bold text-muted border" onClick={handleDenyNotifications}>Not Now</Button>
              <Button variant="primary" className="w-50 fw-bold" onClick={handleAllowNotifications}>Yes, Notify Me</Button>
           </div>
        </Modal.Body>
      </Modal>

      {/* ✅ UPDATE: Passing Collapsed Props to Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={handleLogoutClick} 
        userEmail={user.email}
        companyProfile={companyProfile}
        userRole={userRole} 
        userData={userData}
        currentUser={user}
        // 👇 New Props
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* ✅ UPDATE: Dynamic Main Content Class */}
      <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <MobileHeader 
            onToggle={() => setIsMobileMenuOpen(true)} 
            userEmail={user.email} 
            title={activeTab.startsWith('settings') ? 'System Settings' : activeTab}
            companyProfile={companyProfile}
            onNotificationClick={() => setActiveTab('notifications')}
            userData={userData}
            totalUnread={totalUnread}
            unreadNotifCount={unreadNotifCount}
            userRole={userRole}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
            availableBranches={availableBranches}
        />
        <Container fluid className="p-0">
            {activeTab === 'dashboard' && (
                <div className="d-none d-lg-flex justify-content-between align-items-center mb-3 px-3 px-md-4 pt-3">
                    <div>
                       <h4 className="fw-bold text-dark m-0 text-capitalize">Dashboard</h4>
                    </div>
                    
                    <div className="d-flex align-items-center">
                        {userRole === 'Admin' ? (
                            <div className="custom-branch-dropdown" style={dropdownStyles.container}>
                                <button 
                                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                                    style={dropdownStyles.button}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                                >
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={dropdownStyles.iconBox}><FiMapPin /></div>
                                        <span>{selectedBranch === 'All' ? 'All Branches' : `${selectedBranch} Branch`}</span>
                                    </div>
                                    <FiChevronDown style={{ transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}/>
                                </button>

                                <div style={dropdownStyles.menu}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '0 10px 8px 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Select Location
                                    </div>
                                    
                                    <div 
                                        style={dropdownStyles.menuItem(selectedBranch === 'All')}
                                        onClick={() => { setSelectedBranch('All'); setIsBranchDropdownOpen(false); }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedBranch === 'All' ? '#f1f5f9' : 'transparent'}
                                    >
                                        <span>All Branches</span>
                                        {selectedBranch === 'All' && <FiCheck className="text-primary"/>}
                                    </div>

                                    {availableBranches.map(branch => (
                                        <div 
                                            key={branch}
                                            style={dropdownStyles.menuItem(selectedBranch === branch)}
                                            onClick={() => { setSelectedBranch(branch); setIsBranchDropdownOpen(false); }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedBranch === branch ? '#f1f5f9' : 'transparent'}
                                        >
                                            <span>{branch}</span>
                                            {selectedBranch === branch && <FiCheck className="text-primary"/>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Badge bg="info" text="dark" className="px-3 py-2 rounded-pill fw-bold border shadow-sm">
                                <FiMapPin className="me-1"/> {userBranch} Branch
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            <div className="content-wrapper px-3 px-md-4 pb-4">
              {renderContent()}
            </div>
        </Container>
        <Footer sidebarActive={true} />
      </main>
    </div>
  );
}

export default App;