import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge, Table, Card, Spinner, Alert } from 'react-bootstrap';
import { 
  FiUser, FiPackage, FiTruck, FiAlertTriangle, FiDollarSign, 
  FiSave, FiPlus, FiTrash2, FiUploadCloud, 
  FiImage, FiMapPin, FiInfo, FiCreditCard, FiBell, FiSmartphone, FiMail, 
  FiSliders, FiUsers, FiLock, FiChevronDown, FiCheck, FiSettings 
} from "react-icons/fi";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, firebaseConfig } from '../firebase';
import Loader from './Loader';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

const Settings = ({ userRole, activeSection = 'profile', setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // --- ALERT STATE ---
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' }); 
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [itemToDelete, setItemToDelete] = useState({ col: null, id: null, type: null }); 

  // --- DATA STATES ---
  const [profile, setProfile] = useState({ companyName: '', managerName: '', mobile: '', address: '', logoUrl: '' });
  const [notifConfig, setNotifConfig] = useState({ lowStockThreshold: '30000', emailAlerts: true, smsAlerts: false, dailyReport: true });
  
  // Inventory Data
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ name: '', category: 'Consumable', unit: 'Nos', variants: '' });
  
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  
  // Branch Data
  const [branches, setBranches] = useState([]); 
  const [newBranch, setNewBranch] = useState('');

  // Dispatch & Finance
  const [dispatchFrom, setDispatchFrom] = useState([]);
  const [dispatchTo, setDispatchTo] = useState([]);
  const [newDispFrom, setNewDispFrom] = useState('');
  const [newDispTo, setNewDispTo] = useState('');
  const [financeCats, setFinanceCats] = useState([]);
  const [newFinCat, setNewFinCat] = useState({ name: '', type: 'Expense' });
  
  // Damage Configs
  const [damageTypes, setDamageTypes] = useState([]);
  const [newDamageType, setNewDamageType] = useState('');
  const [damageLocs, setDamageLocs] = useState([]);
  const [newDamageLoc, setNewDamageLoc] = useState('');

  // USER MANAGEMENT STATE
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Manager', branch: '' });
  const [userLoading, setUserLoading] = useState(false);

  // --- Custom Dropdown States ---
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profileSnap = await getDoc(doc(db, "settings_config", "general_profile"));
        if (profileSnap.exists()) setProfile(profileSnap.data());

        const notifSnap = await getDoc(doc(db, "settings_config", "notifications"));
        if (notifSnap.exists()) setNotifConfig(notifSnap.data());

        const fetchCol = async (col, set) => {
          const snap = await getDocs(collection(db, col));
          set(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };

        await Promise.all([
          fetchCol("settings_items", setMaterials),
          fetchCol("settings_locations", setLocations),
          fetchCol("settings_branches", setBranches),
          fetchCol("settings_dispatch_from", setDispatchFrom),
          fetchCol("settings_dispatch_to", setDispatchTo),
          fetchCol("settings_finance_categories", setFinanceCats),
          fetchCol("settings_damage_types", setDamageTypes),
          fetchCol("settings_damage_locations", setDamageLocs),
          userRole === 'Admin' ? fetchCol("users", setUsersList) : Promise.resolve()
        ]);
        setLoading(false);
      } catch (err) { console.error(err); setLoading(false); }
    };
    fetchSettings();
  }, [userRole]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoleOpen(false);
        setIsBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if(userRole !== 'Admin') return showToast("Permission Denied: Admins only.", "warning");
    setSaveLoading(true);
    try {
        await setDoc(doc(db, "settings_config", "general_profile"), profile);
        setTimeout(() => { setSaveLoading(false); showToast("Organization Profile Updated!", "success"); }, 500);
    } catch (error) { setSaveLoading(false); showToast("Failed to save settings.", "error"); }
  };

  const handleNotifSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
        await setDoc(doc(db, "settings_config", "notifications"), notifConfig);
        showToast("Notification Preferences Saved!", "success");
    } catch (error) { showToast("Error saving preferences.", "error"); }
    setSaveLoading(false);
  };

  const addItem = async (col, data, set, resetSet, resetVal) => {
    const checkVal = typeof data === 'string' ? data : data.name;
    if(!checkVal || checkVal.trim() === '') {
        return showToast("Please enter a value.", "warning");
    }

    try {
        let payload = typeof data === 'string' ? { name: data } : { ...data };
        
        if (col === "settings_items" && payload.variants) {
            payload.variants = payload.variants.split(',').map(v => v.trim()).filter(v => v !== '');
        }

        const docRef = await addDoc(collection(db, col), payload);
        
        set(prev => Array.isArray(prev) ? [...prev, { id: docRef.id, ...payload }] : [{ id: docRef.id, ...payload }]);
        
        resetSet(resetVal);
        showToast("Item added successfully.", "success");
    } catch (error) { 
        console.error("Add Item Error:", error);
        showToast("Error adding item. Check console.", "error"); 
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if(!newUser.name || !newUser.email || !newUser.password) return showToast("All fields required", "warning");
    if(!newUser.branch && newUser.role !== 'Admin') return showToast("Please select a branch", "warning");

    setUserLoading(true);
    let secondaryApp = null;
    try {
        const existingApps = getApps();
        secondaryApp = existingApps.find(app => app.name === "Secondary");
        if (!secondaryApp) secondaryApp = initializeApp(firebaseConfig, "Secondary");
        
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
        
        const userData = {
            uid: userCredential.user.uid,
            name: newUser.name, email: newUser.email,
            role: newUser.role, 
            branch: newUser.role === 'Admin' ? 'All' : newUser.branch, 
            createdAt: serverTimestamp()
        };
        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        setUsersList(prev => [...prev, userData]);
        
        await signOut(secondaryAuth);
        setNewUser({ name: '', email: '', password: '', role: 'Manager', branch: '' });
        showToast(`User ${newUser.name} created!`, "success");
    } catch (error) {
        console.error(error);
        showToast(error.code === 'auth/email-already-in-use' ? "Email exists!" : "Creation failed.", "error");
    } finally {
        if (secondaryApp) await deleteApp(secondaryApp).catch(console.error);
        setUserLoading(false);
    }
  };

  const handleDeleteRequest = (col, id, type) => {
    if(userRole !== 'Admin') return showToast("Access Denied: Only Admins can delete items.", "warning");
    setItemToDelete({ col, id, type });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const { col, id } = itemToDelete;
    if (!id || !col) return;
    try {
        await deleteDoc(doc(db, col, id));
        const updateState = (setter) => setter(prev => prev.filter(i => (i.id || i.uid) !== id));
        if (col === "settings_items") updateState(setMaterials);
        else if (col === "settings_locations") updateState(setLocations);
        else if (col === "settings_branches") updateState(setBranches);
        else if (col === "settings_dispatch_from") updateState(setDispatchFrom);
        else if (col === "settings_dispatch_to") updateState(setDispatchTo);
        else if (col === "settings_finance_categories") updateState(setFinanceCats);
        else if (col === "settings_damage_types") updateState(setDamageTypes);
        else if (col === "settings_damage_locations") updateState(setDamageLocs);
        else if (col === "users") updateState(setUsersList);
        showToast("Item removed.", "success");
    } catch (error) { showToast("Failed to delete item.", "error"); }
    setShowDeleteModal(false);
  };

  // Image Upload Logic (Placeholder)
  const handleImageUpload = (e) => {
      // In a real app, upload to Firebase Storage and get URL
      // For now, we assume local or direct URL handling if needed,
      // but since 'profile.logoUrl' is just a string, this needs storage logic.
      // Keeping it simple as per original request.
      showToast("Image upload requires Firebase Storage configuration.", "info");
  };

  if (loading) return <Loader text="Configuring System..." />;

  // --- MODERN STYLES ---
  const s = {
    sectionHeader: { marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' },
    headerTitle: { fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px', letterSpacing: '-0.5px' },
    headerSub: { color: '#64748b', fontSize: '0.85rem' },
    
    card: { 
        border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: '#ffffff', 
        marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' 
    },
    
    label: { fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { borderRadius: '10px', padding: '12px 16px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#f8fafc', transition: 'all 0.2s' },
    
    badge: { 
        padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', 
        display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '4px',
        backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0'
    },
    
    btnPrimary: { backgroundColor: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', width: '100%' },
    btnAction: { borderRadius: '8px', padding: '10px 20px', fontWeight: '600' },

    customSelect: {
        width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1',
        backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '0.95rem', color: '#334155', fontWeight: '500'
    },
    dropdownMenu: {
        position: 'absolute', top: '105%', left: 0, width: '100%', backgroundColor: 'white',
        borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0',
        padding: '6px', zIndex: 100, maxHeight: '200px', overflowY: 'auto'
    },
    dropdownItem: (active) => ({
        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: active ? '#f1f5f9' : 'transparent', color: active ? '#0f172a' : '#64748b', fontWeight: active ? '600' : '500', fontSize: '0.9rem', marginBottom: '2px', transition: 'all 0.2s'
    })
  };

  const renderContent = () => {
    switch (activeSection) {
      
      // --- PROFILE SECTION ---
      case 'profile': return (
          <div className="fade-in">
            <div style={s.sectionHeader}>
                <h2 style={s.headerTitle}><FiSettings className="me-2"/> Organization Profile</h2>
                <p style={s.headerSub}>Manage your company branding and primary contact details.</p>
            </div>
            <Form onSubmit={handleProfileSave}>
              <Row className="g-4">
                <Col md={8}>
                  <div style={s.card}>
                    <Row className="g-3">
                      <Col md={12}><label style={s.label}>Company Name</label><Form.Control style={s.input} value={profile.companyName} onChange={(e)=>setProfile({...profile, companyName:e.target.value})} disabled={userRole!=='Admin'} /></Col>
                      <Col md={6}><label style={s.label}>Manager Name</label><Form.Control style={s.input} value={profile.managerName} onChange={(e)=>setProfile({...profile, managerName:e.target.value})} disabled={userRole!=='Admin'} /></Col>
                      <Col md={6}><label style={s.label}>Contact</label><Form.Control style={s.input} value={profile.mobile} onChange={(e)=>setProfile({...profile, mobile:e.target.value})} disabled={userRole!=='Admin'} /></Col>
                      <Col md={12}><label style={s.label}>Address</label><Form.Control as="textarea" rows={3} style={s.input} value={profile.address} onChange={(e)=>setProfile({...profile, address:e.target.value})} disabled={userRole!=='Admin'} /></Col>
                    </Row>
                  </div>
                </Col>
                <Col md={4}>
                  <div style={{...s.card, textAlign: 'center'}}>
                    <label style={s.label}>Company Logo</label>
                    <div style={{width:'120px', height:'120px', borderRadius:'20px', overflow:'hidden', margin:'20px auto', border:'2px dashed #cbd5e1', backgroundColor:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <FiImage size={32} className="text-muted"/>}
                    </div>
                    {userRole === 'Admin' && <><label htmlFor="logo-upload" className="btn btn-outline-primary btn-sm w-100 fw-bold"><FiUploadCloud className="me-2"/> Upload Image</label><input id="logo-upload" type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleImageUpload(e, 'logoUrl')} /></>}
                  </div>
                </Col>
              </Row>
              {userRole === 'Admin' && <div className="d-flex justify-content-end"><Button type="submit" style={s.btnPrimary} className="w-auto px-5" disabled={saveLoading}>{saveLoading ? <Spinner size="sm"/> : <><FiSave className="me-2"/> Save Changes</>}</Button></div>}
            </Form>
          </div>
        );

      // --- USER MANAGEMENT ---
      case 'users':
        if (userRole !== 'Admin') return <Alert variant="danger" className="text-center p-5"><FiLock size={40}/><h4 className="mt-3">Access Denied</h4><p>Only Admins can manage users.</p></Alert>;
        return (
          <div className="fade-in" ref={dropdownRef}>
             <div style={s.sectionHeader}>
                 <h2 style={s.headerTitle} className="text-primary"><FiUsers className="me-2"/> User Management</h2>
                 <p style={s.headerSub}>Create and manage accounts for Branch Managers.</p>
             </div>
             <Row className="g-4">
                 <Col lg={4}>
                     <div style={{...s.card, backgroundColor:'#f8fafc', border:'1px solid #e2e8f0'}}>
                         <h6 className="fw-bold mb-4 d-flex align-items-center"><div className="bg-primary text-white rounded-circle p-2 me-2 d-flex"><FiPlus/></div> Add New User</h6>
                         <Form onSubmit={handleCreateUser}>
                             <Form.Group className="mb-3"><label style={s.label}>Full Name</label><Form.Control style={s.input} value={newUser.name} onChange={(e)=>setNewUser({...newUser, name:e.target.value})} required/></Form.Group>
                             <Form.Group className="mb-3"><label style={s.label}>Email Address</label><Form.Control type="email" style={s.input} value={newUser.email} onChange={(e)=>setNewUser({...newUser, email:e.target.value})} required/></Form.Group>
                             <Form.Group className="mb-4"><label style={s.label}>Password</label><Form.Control type="password" style={s.input} value={newUser.password} onChange={(e)=>setNewUser({...newUser, password:e.target.value})} required/></Form.Group>
                             
                             <Row className="g-3 mb-4">
                                 <Col xs={6}>
                                     <label style={s.label}>Role</label>
                                     <div className="position-relative">
                                         <div style={s.customSelect} onClick={() => setIsRoleOpen(!isRoleOpen)}>
                                             <span>{newUser.role}</span><FiChevronDown className="text-muted"/>
                                         </div>
                                         {isRoleOpen && (
                                             <div style={s.dropdownMenu}>
                                                 {['Manager', 'Admin'].map(role => (
                                                     <div key={role} style={s.dropdownItem(newUser.role === role)} onClick={() => { setNewUser({...newUser, role}); setIsRoleOpen(false); }}>
                                                         {role} {newUser.role === role && <FiCheck size={14}/>}
                                                     </div>
                                                 ))}
                                             </div>
                                         )}
                                     </div>
                                 </Col>
                                 <Col xs={6}>
                                     <label style={s.label}>Branch</label>
                                     <div className="position-relative">
                                         <div style={s.customSelect} onClick={() => setIsBranchOpen(!isBranchOpen)}>
                                             <span>{newUser.branch || "Select"}</span><FiChevronDown className="text-muted"/>
                                         </div>
                                         {isBranchOpen && (
                                             <div style={s.dropdownMenu}>
                                                 {branches.length === 0 ? <div className="p-2 text-muted small text-center">No Branches.</div> : branches.map(b => (
                                                     <div key={b.id} style={s.dropdownItem(newUser.branch === b.name)} onClick={() => { setNewUser({...newUser, branch: b.name}); setIsBranchOpen(false); }}>
                                                         {b.name} {newUser.branch === b.name && <FiCheck size={14}/>}
                                                     </div>
                                                 ))}
                                                 <div className="border-top mt-1 pt-1 text-center"><small className="text-primary fw-bold cursor-pointer" style={{fontSize:'0.75rem'}} onClick={() => { setActiveTab('settings_inventory'); setIsBranchOpen(false); }}>+ Add Branch</small></div>
                                             </div>
                                         )}
                                     </div>
                                 </Col>
                             </Row>
                             <Button type="submit" style={s.btnPrimary} disabled={userLoading}>
                                 {userLoading ? <Spinner size="sm"/> : 'Create Account'}
                             </Button>
                         </Form>
                     </div>
                 </Col>
                 <Col lg={8}>
                     <div style={s.card}>
                         <h6 className="fw-bold mb-4">Active Users</h6>
                         <Table hover responsive className="align-middle mb-0">
                             <thead className="bg-light small text-uppercase text-muted"><tr><th className="border-0 p-3">User Details</th><th className="border-0 p-3">Role</th><th className="border-0 p-3">Branch</th><th className="border-0 p-3 text-end">Action</th></tr></thead>
                             <tbody>
                                 {usersList.map(u => (
                                     <tr key={u.uid}>
                                         <td className="p-3"><div className="fw-bold text-dark">{u.name}</div><div className="small text-muted">{u.email}</div></td>
                                         <td className="p-3"><Badge bg={u.role==='Admin'?'dark':'info'} className="px-3 py-2 fw-normal">{u.role}</Badge></td>
                                         <td className="p-3"><Badge bg="light" text="dark" className="border px-3 py-2 fw-normal">{u.branch}</Badge></td>
                                         <td className="p-3 text-end">{u.role!=='Admin' && <Button variant="link" className="text-danger p-0" onClick={()=>handleDeleteRequest("users", u.uid, 'User')}><FiTrash2/></Button>}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </Table>
                     </div>
                 </Col>
             </Row>
          </div>
        );

      // --- INVENTORY ---
      case 'inventory': return (
          <div className="fade-in">
            <div style={s.sectionHeader}><h2 style={s.headerTitle} className="text-success"><FiPackage className="me-2"/> Inventory Setup</h2><p style={s.headerSub}>Configure materials, products and storage locations.</p></div>
            
            <div style={s.card}>
               <h5 className="fw-bold mb-4 d-flex align-items-center"><FiMapPin className="me-2 text-warning"/> Branch Network</h5>
               <InputGroup className="mb-3" style={{maxWidth:'500px'}}>
                   <Form.Control placeholder="New Branch Name (e.g. Pune HQ)" style={s.input} value={newBranch} onChange={(e)=>setNewBranch(e.target.value)}/>
                   <Button variant="dark" style={s.btnAction} onClick={()=>addItem("settings_branches", newBranch, setBranches, setNewBranch, "")}>Add Branch</Button>
               </InputGroup>
               <div className="d-flex flex-wrap">
                   {branches.map(b => (
                       <div key={b.id} style={s.badge}>
                           {b.name} {userRole === 'Admin' && <FiTrash2 className="text-danger cursor-pointer" onClick={()=>handleDeleteRequest("settings_branches", b.id, 'Branch')}/>}
                       </div>
                   ))}
               </div>
            </div>

            <div style={s.card}>
               <h5 className="fw-bold mb-4 d-flex align-items-center"><FiPackage className="me-2 text-primary"/> Material Catalog</h5>
               <div className="p-3 bg-light rounded-3 mb-4 border">
                   <Row className="g-3 align-items-end">
                      <Col md={3}><label style={s.label}>Item Name</label><Form.Control placeholder="e.g. Layer Feed" style={s.input} value={newMaterial.name} onChange={(e)=>setNewMaterial({...newMaterial, name:e.target.value})} /></Col>
                      <Col md={2}><label style={s.label}>Category</label><Form.Select style={s.customSelect} value={newMaterial.category} onChange={(e)=>setNewMaterial({...newMaterial, category:e.target.value})}><option value="Consumable">Consumable</option><option value="Asset">Asset</option></Form.Select></Col>
                      <Col md={2}><label style={s.label}>Unit</label><Form.Select style={s.customSelect} value={newMaterial.unit} onChange={(e)=>setNewMaterial({...newMaterial, unit:e.target.value})}><option>Nos</option><option>Kg</option><option>Ltr</option><option>Box</option></Form.Select></Col>
                      <Col md={3}><label style={s.label}>Variants (Optional)</label><Form.Control placeholder="Type A, Type B" style={s.input} value={newMaterial.variants} onChange={(e)=>setNewMaterial({...newMaterial, variants:e.target.value})} /></Col>
                      <Col md={2}><Button variant="primary" style={{...s.btnAction, width:'100%'}} onClick={()=>addItem("settings_items", newMaterial, setMaterials, setNewMaterial, {name:'', category:'Consumable', unit:'Nos', variants:''})}>Add Item</Button></Col>
                   </Row>
               </div>
               <div className="d-flex flex-wrap gap-2">
                   {materials.map(m => (
                       <div key={m.id} className="border rounded-3 px-3 py-2 d-flex align-items-center bg-white shadow-sm">
                           <div>
                               <span className="fw-bold text-dark">{m.name}</span>
                               <span className="text-muted small ms-1">({m.unit})</span>
                               {m.variants && m.variants.length > 0 && <Badge bg="light" text="dark" className="ms-2 border">{m.variants.length} Types</Badge>}
                           </div>
                           {userRole === 'Admin' && <FiTrash2 className="text-danger ms-3 cursor-pointer opacity-50 hover-opacity-100" onClick={()=>handleDeleteRequest("settings_items", m.id, 'Item')}/>}
                       </div>
                   ))}
               </div>
            </div>
            
            <div style={s.card}>
               <h5 className="fw-bold mb-4 d-flex align-items-center text-info"><FiTruck className="me-2"/> Warehouses / Locations</h5>
               <InputGroup className="mb-3" style={{maxWidth:'500px'}}><Form.Control placeholder="Location Name" style={s.input} value={newLocation} onChange={(e)=>setNewLocation(e.target.value)}/><Button variant="info" className="text-white" style={s.btnAction} onClick={()=>addItem("settings_locations", newLocation, setLocations, setNewLocation, "")}>Add Location</Button></InputGroup>
               <div className="d-flex flex-wrap">{locations.map(i => (<div key={i.id} style={s.badge}>{i.name} {userRole === 'Admin' && <FiTrash2 className="text-danger cursor-pointer" onClick={()=>handleDeleteRequest("settings_locations", i.id, 'Location')}/>}</div>))}</div>
            </div>
          </div>
        );

      // --- NOTIFICATIONS ---
      case 'notifications': return (
          <div className="fade-in">
            <div style={s.sectionHeader}><h2 style={s.headerTitle} className="text-warning"><FiBell className="me-2"/> Alerts & Notifications</h2><p style={s.headerSub}>Configure system alerts and daily reports.</p></div>
            <Form onSubmit={handleNotifSave}>
                <Row className="g-4">
                    <Col md={7}>
                        <div style={s.card}>
                            <h6 className="fw-bold mb-4"><FiSliders className="me-2 text-primary"/> Threshold Configuration</h6>
                            <Form.Group className="mb-4"><label style={s.label}>Low Stock Alert Trigger</label><InputGroup><InputGroup.Text className="bg-light border-end-0">Below</InputGroup.Text><Form.Control type="number" style={s.input} value={notifConfig.lowStockThreshold} onChange={(e) => setNotifConfig({...notifConfig, lowStockThreshold: e.target.value})}/><InputGroup.Text className="bg-light border-start-0">Eggs</InputGroup.Text></InputGroup></Form.Group>
                            <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center"><span>Generate Daily Summary Report</span><Form.Check type="switch" checked={notifConfig.dailyReport} onChange={(e) => setNotifConfig({...notifConfig, dailyReport: e.target.checked})}/></div>
                        </div>
                    </Col>
                    <Col md={5}>
                        <div style={s.card}><h6 className="fw-bold mb-4"><FiMail className="me-2"/> Delivery Channels</h6><div className="py-2 border-bottom"><Form.Check type="switch" label="Email Notifications" checked={notifConfig.emailAlerts} onChange={(e) => setNotifConfig({...notifConfig, emailAlerts: e.target.checked})}/></div><div className="py-3"><Form.Check type="switch" label="SMS / WhatsApp Alerts" checked={notifConfig.smsAlerts} onChange={(e) => setNotifConfig({...notifConfig, smsAlerts: e.target.checked})}/></div></div>
                    </Col>
                </Row>
                <div className="d-flex justify-content-end"><Button type="submit" style={s.btnPrimary} className="w-auto px-5" disabled={saveLoading}><FiSave className="me-2"/> Save Preferences</Button></div>
            </Form>
          </div>
      );

      // --- DISPATCH ---
      case 'dispatch': return (
          <div className="fade-in">
            <div style={s.sectionHeader}><h2 style={s.headerTitle} className="text-info"><FiTruck className="me-2"/> Dispatch Logistics</h2><p style={s.headerSub}>Manage Source and Destination points for sales.</p></div>
            <Row className="g-4">
               <Col md={6}><div style={s.card}><h6 className="fw-bold text-dark mb-3 ps-2 border-start border-4 border-info">Source (From)</h6><InputGroup className="mb-3"><Form.Control style={s.input} placeholder="New Source" value={newDispFrom} onChange={(e)=>setNewDispFrom(e.target.value)}/><Button variant="info" className="text-white" onClick={()=>addItem("settings_dispatch_from", newDispFrom, setDispatchFrom, setNewDispFrom, "")}><FiPlus/></Button></InputGroup><div className="custom-scrollbar" style={{maxHeight:'300px', overflowY:'auto'}}>{dispatchFrom.map(i => <div key={i.id} className="d-flex justify-content-between p-3 border-bottom hover-bg-light rounded-2 mb-1">{i.name} {userRole === 'Admin' && <FiTrash2 className="text-danger cursor-pointer opacity-50 hover-opacity-100" onClick={()=>handleDeleteRequest("settings_dispatch_from", i.id, 'Source')}/>}</div>)}</div></div></Col>
               <Col md={6}><div style={s.card}><h6 className="fw-bold text-dark mb-3 ps-2 border-start border-4 border-success">Destination (To)</h6><InputGroup className="mb-3"><Form.Control style={s.input} placeholder="New Destination" value={newDispTo} onChange={(e)=>setNewDispTo(e.target.value)}/><Button variant="success" onClick={()=>addItem("settings_dispatch_to", newDispTo, setDispatchTo, setNewDispTo, "")}><FiPlus/></Button></InputGroup><div className="custom-scrollbar" style={{maxHeight:'300px', overflowY:'auto'}}>{dispatchTo.map(i => <div key={i.id} className="d-flex justify-content-between p-3 border-bottom hover-bg-light rounded-2 mb-1">{i.name} {userRole === 'Admin' && <FiTrash2 className="text-danger cursor-pointer opacity-50 hover-opacity-100" onClick={()=>handleDeleteRequest("settings_dispatch_to", i.id, 'Destination')}/>}</div>)}</div></div></Col>
            </Row>
          </div>
        );

      // --- DAMAGE ---
      case 'damage': return (
          <div className="fade-in">
            <div style={s.sectionHeader}><h2 style={s.headerTitle} className="text-danger"><FiAlertTriangle className="me-2"/> Damage Configuration</h2><p style={s.headerSub}>Define where and why damage occurs.</p></div>
            <Row className="g-4">
                <Col md={6}><div style={{...s.card, backgroundColor:'#fef2f2', borderColor:'#fecaca'}}><h6 className="fw-bold text-danger mb-4"><FiMapPin className="me-2"/> Damage Locations</h6><InputGroup className="mb-3"><Form.Control style={s.input} placeholder="e.g. Warehouse A" value={newDamageLoc} onChange={(e)=>setNewDamageLoc(e.target.value)}/><Button variant="danger" onClick={()=>addItem("settings_damage_locations", newDamageLoc, setDamageLocs, setNewDamageLoc, "")}>Add</Button></InputGroup><div className="d-flex flex-wrap gap-2">{damageLocs.map(i => (<Badge key={i.id} bg="white" text="danger" className="p-2 border border-danger shadow-sm d-flex align-items-center gap-2">{i.name} {userRole === 'Admin' && <FiTrash2 className="cursor-pointer" size={12} onClick={()=>handleDeleteRequest("settings_damage_locations", i.id, 'Damage Location')}/>}</Badge>))}</div></div></Col>
                <Col md={6}><div style={{...s.card, backgroundColor:'#fff7ed', borderColor:'#fed7aa'}}><h6 className="fw-bold text-warning mb-4"><FiInfo className="me-2"/> Damage Reasons</h6><InputGroup className="mb-3"><Form.Control style={s.input} placeholder="e.g. Handling" value={newDamageType} onChange={(e)=>setNewDamageType(e.target.value)}/><Button variant="warning" className="text-white" onClick={()=>addItem("settings_damage_types", newDamageType, setDamageTypes, setNewDamageType, "")}>Add</Button></InputGroup><div className="d-flex flex-wrap gap-2">{damageTypes.map(i => (<Badge key={i.id} bg="white" text="dark" className="p-2 border border-warning shadow-sm d-flex align-items-center gap-2">{i.name} {userRole === 'Admin' && <FiTrash2 className="text-danger cursor-pointer" size={12} onClick={()=>handleDeleteRequest("settings_damage_types", i.id, 'Damage Reason')}/>}</Badge>))}</div></div></Col>
            </Row>
          </div>
        );

      // --- FINANCE ---
      case 'finance': return (
          <div className="fade-in">
            <div style={s.sectionHeader}><h2 style={s.headerTitle} className="text-dark"><FiDollarSign className="me-2"/> Financial Categories</h2><p style={s.headerSub}>Manage Income and Expense types.</p></div>
            <div style={s.card}>
               <Row className="g-3 mb-4">
                  <Col md={5}><label style={s.label}>Category Name</label><Form.Control placeholder="e.g. Salary, Sales" style={s.input} value={newFinCat.name} onChange={(e)=>setNewFinCat({...newFinCat, name:e.target.value})} /></Col>
                  <Col md={4}><label style={s.label}>Type</label><Form.Select style={s.customSelect} value={newFinCat.type} onChange={(e)=>setNewFinCat({...newFinCat, type:e.target.value})}><option value="Expense">Expense</option><option value="Income">Income</option></Form.Select></Col>
                  <Col md={3}><label style={s.label}>&nbsp;</label><Button variant="dark" className="w-100 fw-bold" style={{borderRadius:'10px', padding:'12px'}} onClick={()=>addItem("settings_finance_categories", newFinCat, setFinanceCats, setNewFinCat, {name:'', type:'Expense'})}>Add Category</Button></Col>
               </Row>
               <div className="d-flex flex-wrap gap-3 mt-4 pt-4 border-top">
                   {financeCats.map(cat => (
                       <div key={cat.id} style={{...s.badge, backgroundColor: cat.type==='Income'?'#f0fdf4':'#fef2f2', borderColor: cat.type==='Income'?'#bbf7d0':'#fecaca', color: cat.type==='Income'?'#166534':'#991b1b'}}>
                           {cat.type==='Income'?<FiDollarSign/>:<FiCreditCard/>} {cat.name} 
                           {userRole === 'Admin' && <FiTrash2 className="ms-2 cursor-pointer opacity-50 hover-opacity-100" onClick={()=>handleDeleteRequest("settings_finance_categories", cat.id, 'Category')}/>}
                       </div>
                   ))}
               </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={confirmDelete} 
        title="Remove Item?" 
        message={`Are you sure you want to remove this ${itemToDelete.type}?`}
        type="danger" 
        confirmText="Yes, Remove" 
      />
      <div className="settings-content-container">{renderContent()}</div>
    </div>
  );
};

export default Settings;