import React, { useState, useEffect } from 'react';
import './App.css';
import { Container } from 'react-bootstrap';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Components
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import EggInventory from './components/EggInventory';
import MaterialInventory from './components/MaterialInventory';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ExpenseTracker from './components/ExpenseTracker';
import SaleBook from './components/SaleBook'; // <--- NEW IMPORT
import Login from './components/Login';
import Loader from './components/Loader';
import LandingPage from './components/LandingPage';
import LogoutPage from './components/LogoutPage';
import Footer from './components/Footer';
import { ConfirmationModal, ToastNotification } from './components/CustomAlerts';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'Happinest BioCore',
    managerName: 'Admin',
    logoUrl: 'https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg',
    adminPhotoUrl: ''
  });

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if(currentUser) {
          setShowLogin(false);
          setIsLoggingOut(false);
          showToast("Welcome back, Manager!", "success");
      }
    });

    const profileRef = doc(db, "settings_config", "general_profile");
    const checkAndCreateProfile = async () => {
        const snap = await getDoc(profileRef);
        if (!snap.exists()) { await setDoc(profileRef, companyProfile); }
    };
    checkAndCreateProfile();

    const profileUnsub = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) { setCompanyProfile(prev => ({...prev, ...docSnap.data()})); }
    });

    return () => { authUnsub(); profileUnsub(); };
  }, []);

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };
  const handleLogoutClick = () => { setShowLogoutModal(true); setIsMobileMenuOpen(false); };
  const confirmLogout = () => {
      setShowLogoutModal(false);
      setIsLoggingOut(true);
      setTimeout(async () => {
          await signOut(auth);
          setActiveTab('dashboard');
          setIsLoggingOut(false);
          setShowLogin(false);
      }, 2500);
  };

  if (authLoading) return <Loader fullScreen={true} text="Initializing BioCore..." />;
  if (isLoggingOut) return <LogoutPage />;
  if (!user) return <div className="d-flex flex-column min-vh-100">{showLogin ? <Login /> : <LandingPage onLoginClick={() => setShowLogin(true)} />}<Footer sidebarActive={false} /></div>;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'eggs': return <EggInventory />;
      case 'material': return <MaterialInventory />;
      case 'salebook': return <SaleBook />; // <--- NEW ROUTE
      case 'cashbook': return <ExpenseTracker />;
      case 'settings': return <Settings />;
      default: return <h2>Select an option</h2>;
    }
  };

  return (
    <div className="app-container">
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={confirmLogout} title="Ready to Leave?" message="Your session will be closed." type="danger" confirmText="Secure Logout" />
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={handleLogoutClick} 
        userEmail={user.email}
        companyProfile={companyProfile}
      />

      <main className="main-content">
        <MobileHeader 
            onToggle={() => setIsMobileMenuOpen(true)} 
            userEmail={user.email} 
            title={activeTab}
            companyProfile={companyProfile}
        />
        <Container fluid className="p-0">
            <div className="d-md-none mb-3 px-3 pt-3">
                <h4 className="fw-bold text-dark m-0">
                    {activeTab === 'dashboard' && 'Dashboard'}
                    {activeTab === 'eggs' && 'Egg Stock'}
                    {activeTab === 'material' && 'Materials'}
                    {activeTab === 'salebook' && 'Sale Book'} {/* <--- NEW TITLE */}
                    {activeTab === 'cashbook' && 'Cash Book'}
                    {activeTab === 'settings' && 'Settings'}
                </h4>
            </div>
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