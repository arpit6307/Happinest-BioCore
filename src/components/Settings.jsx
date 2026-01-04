import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, ListGroup, Tab, Nav, Badge, Image } from 'react-bootstrap';
import { 
  FiMapPin, FiPackage, FiTrash2, FiDollarSign, 
  FiBriefcase, FiCamera, FiX, FiShield, FiTruck, FiArrowRight, FiTarget
} from "react-icons/fi";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ConfirmationModal, ToastNotification } from './CustomAlerts';

const Settings = () => {
  // --- STATES ---
  const [locations, setLocations] = useState([]); // Normal Warehouses
  const [newLocation, setNewLocation] = useState('');
  
  // NEW: SALE BOOK SPECIFIC STATES
  const [dispatchSources, setDispatchSources] = useState([]); // FROM (Sale Book Only)
  const [newDispatchSource, setNewDispatchSource] = useState('');
  
  const [dispatchDestinations, setDispatchDestinations] = useState([]); // TO (Sale Book Only)
  const [newDispatchDestination, setNewDispatchDestination] = useState('');

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'Consumable', unit: 'Nos', variants: [] });
  const [currentVariant, setCurrentVariant] = useState('');
  
  const [financeCats, setFinanceCats] = useState([]);
  const [newCat, setNewCat] = useState({ name: '', type: 'Expense' });

  const [profile, setProfile] = useState({
    companyName: 'Happinest Poultry Products Pvt. Ltd.',
    managerName: 'Admin Manager',
    lowStockLimit: 10,
    logoUrl: 'https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg',
    adminPhotoUrl: '' 
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [adminFile, setAdminFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  // --- FETCH DATA ---
  useEffect(() => {
    // 1. General Data
    const unsubLoc = onSnapshot(query(collection(db, "settings_locations"), orderBy("name")), (snap) => setLocations(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubItem = onSnapshot(query(collection(db, "settings_items"), orderBy("name")), (snap) => setItems(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubFin = onSnapshot(query(collection(db, "settings_finance_categories"), orderBy("name")), (snap) => setFinanceCats(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 2. NEW: SALE BOOK SPECIFIC DATA
    const unsubSrc = onSnapshot(query(collection(db, "settings_dispatch_from"), orderBy("name")), (snap) => setDispatchSources(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubDest = onSnapshot(query(collection(db, "settings_dispatch_to"), orderBy("name")), (snap) => setDispatchDestinations(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const fetchProfile = async () => {
        const docRef = doc(db, "settings_config", "general_profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { setProfile(prev => ({...prev, ...docSnap.data()})); }
    };
    fetchProfile();
    return () => { unsubLoc(); unsubItem(); unsubFin(); unsubSrc(); unsubDest(); };
  }, []);

  // --- HANDLERS ---
  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "happinest_preset");
    data.append("cloud_name", "dm2yxz4g8");
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dm2yxz4g8/image/upload`, { method: "POST", body: data });
      const fileData = await res.json();
      return fileData.secure_url;
    } catch (error) { triggerToast("Upload Failed", 'danger'); return null; }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaveLoading(true); setUploading(true);
    let finalLogoUrl = profile.logoUrl; let finalAdminUrl = profile.adminPhotoUrl;
    if (logoFile) finalLogoUrl = await uploadToCloudinary(logoFile) || finalLogoUrl;
    if (adminFile) finalAdminUrl = await uploadToCloudinary(adminFile) || finalAdminUrl;
    await setDoc(doc(db, "settings_config", "general_profile"), { ...profile, logoUrl: finalLogoUrl, adminPhotoUrl: finalAdminUrl }, { merge: true });
    setProfile(prev => ({ ...prev, logoUrl: finalLogoUrl, adminPhotoUrl: finalAdminUrl }));
    setLogoFile(null); setAdminFile(null); setUploading(false); setSaveLoading(false); triggerToast("Profile Updated!", "success");
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if(file) {
        const previewUrl = URL.createObjectURL(file);
        if (type === 'logo') { setLogoFile(file); setProfile(prev => ({ ...prev, logoUrl: previewUrl })); } 
        else { setAdminFile(file); setProfile(prev => ({ ...prev, adminPhotoUrl: previewUrl })); }
    }
  };

  // STANDARD HANDLERS
  const handleAddLocation = async (e) => { e.preventDefault(); if (newLocation.trim()) { await addDoc(collection(db, "settings_locations"), { name: newLocation }); setNewLocation(''); triggerToast("Warehouse Added", "success"); } };
  const addVariant = () => { if (currentVariant.trim()) { setNewItem({ ...newItem, variants: [...newItem.variants, currentVariant.trim()] }); setCurrentVariant(''); } };
  const removeVariant = (i) => { setNewItem({ ...newItem, variants: newItem.variants.filter((_, idx) => idx !== i) }); };
  const handleAddItem = async (e) => { e.preventDefault(); if (newItem.name.trim()) { await addDoc(collection(db, "settings_items"), newItem); setNewItem({ name: '', category: 'Consumable', unit: 'Nos', variants: [] }); triggerToast("Item Added", "success"); } };
  const handleAddFinanceCat = async (e) => { e.preventDefault(); if (newCat.name.trim()) { await addDoc(collection(db, "settings_finance_categories"), newCat); setNewCat({ name: '', type: 'Expense' }); triggerToast("Category Added", "success"); } };

  // NEW: SALE BOOK HANDLERS
  const handleAddDispatchSource = async (e) => { e.preventDefault(); if (newDispatchSource.trim()) { await addDoc(collection(db, "settings_dispatch_from"), { name: newDispatchSource }); setNewDispatchSource(''); triggerToast("Dispatch Source Added", "success"); } };
  const handleAddDispatchDestination = async (e) => { e.preventDefault(); if (newDispatchDestination.trim()) { await addDoc(collection(db, "settings_dispatch_to"), { name: newDispatchDestination }); setNewDispatchDestination(''); triggerToast("Dispatch Destination Added", "success"); } };

  const confirmDeleteClick = (col, id) => { setItemToDelete({ col, id }); setShowDeleteModal(true); };
  const handleProceedDelete = async () => { if (itemToDelete) { await deleteDoc(doc(db, itemToDelete.col, itemToDelete.id)); setShowDeleteModal(false); setItemToDelete(null); triggerToast("Deleted Successfully", "success"); } };

  return (
    <div className="fade-in">
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleProceedDelete} title="Delete Item?" message="Cannot be undone." type="danger" confirmText="Yes, Delete" />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h4 className="fw-bold text-dark mb-1">System Configuration</h4><p className="text-muted small mb-0">Manage global settings and masters.</p></div>
        <Badge bg="dark" className="px-3 py-2"><FiShield className="me-2"/> Admin Access</Badge>
      </div>

      <Tab.Container defaultActiveKey="general">
        <Row className="g-4">
          <Col lg={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body className="p-0">
                <div className="bg-light p-3 border-bottom mb-2"><small className="fw-bold text-muted text-uppercase ls-1">Control Panel</small></div>
                <Nav variant="pills" className="flex-column gap-1 p-2">
                  <Nav.Item><Nav.Link eventKey="general" className="d-flex align-items-center py-3 px-3 fw-bold text-dark"><FiBriefcase className="me-3 text-primary"/> General Profile</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="locations" className="d-flex align-items-center py-3 px-3 text-dark"><FiMapPin className="me-3 text-info"/> Stock Locations</Nav.Link></Nav.Item>
                  {/* NEW TAB FOR SALE BOOK MASTER */}
                  <Nav.Item><Nav.Link eventKey="dispatch_master" className="d-flex align-items-center py-3 px-3 text-dark"><FiTruck className="me-3 text-danger"/> Sale Book / Routes</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="items" className="d-flex align-items-center py-3 px-3 text-dark"><FiPackage className="me-3 text-warning"/> Inventory Items</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="expenses" className="d-flex align-items-center py-3 px-3 text-dark"><FiDollarSign className="me-3 text-success"/> Finance Heads</Nav.Link></Nav.Item>
                </Nav>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
            <Tab.Content>
              {/* PROFILE TAB */}
              <Tab.Pane eventKey="general">
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-white py-3 border-bottom"><h6 className="fw-bold text-dark mb-0">Company Identity</h6></Card.Header>
                  <Card.Body className="p-4">
                    <Form onSubmit={handleSaveProfile}>
                        <Row className="mb-4">
                            <Col md={6} className="d-flex align-items-center border-end">
                                <Image src={profile.logoUrl} rounded style={{ width: '80px', height: '80px', objectFit: 'cover' }} className="me-3 border" />
                                <div className="flex-grow-1"><h6 className="fw-bold mb-1">Logo</h6><Form.Control type="file" size="sm" onChange={(e) => handleImageChange(e, 'logo')} /></div>
                            </Col>
                            <Col md={6} className="d-flex align-items-center ps-4">
                                <Image src={profile.adminPhotoUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} roundedCircle style={{ width: '80px', height: '80px', objectFit: 'cover' }} className="me-3 border" />
                                <div className="flex-grow-1"><h6 className="fw-bold mb-1">Admin Photo</h6><Form.Control type="file" size="sm" onChange={(e) => handleImageChange(e, 'admin')} /></div>
                            </Col>
                        </Row>
                        <Row className="g-4">
                            <Col md={12}><Form.Label className="small fw-bold">Company Name</Form.Label><Form.Control value={profile.companyName} onChange={(e) => setProfile({...profile, companyName: e.target.value})} className="fw-bold" /></Col>
                            <Col md={6}><Form.Label className="small fw-bold">Manager Name</Form.Label><Form.Control value={profile.managerName} onChange={(e) => setProfile({...profile, managerName: e.target.value})} /></Col>
                            <Col md={6}><Form.Label className="small fw-bold">Low Stock Limit</Form.Label><Form.Control type="number" value={profile.lowStockLimit} onChange={(e) => setProfile({...profile, lowStockLimit: e.target.value})} /></Col>
                        </Row>
                        <div className="mt-4 pt-3 border-top text-end"><Button type="submit" variant="primary" disabled={saveLoading || uploading}>{saveLoading ? 'Saving...' : 'Save Changes'}</Button></div>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* LOCATIONS TAB (Standard Stock) */}
              <Tab.Pane eventKey="locations">
                <Card className="shadow-sm border-0 mb-4"><Card.Body className="p-4"><h6 className="fw-bold mb-3">Add Stock Location (For Eggs/Materials)</h6><Form onSubmit={handleAddLocation} className="d-flex gap-2"><Form.Control placeholder="e.g. Farm 1, Godown A" value={newLocation} onChange={(e)=>setNewLocation(e.target.value)} /><Button type="submit" variant="dark">Add</Button></Form></Card.Body></Card>
                <Card className="shadow-sm border-0"><Card.Header className="bg-white fw-bold py-3">Active Warehouses</Card.Header><ListGroup variant="flush" style={{maxHeight:'300px', overflowY:'auto'}}>{locations.map(loc => (<ListGroup.Item key={loc.id} className="d-flex justify-content-between py-2"><span className="fw-bold"><FiMapPin className="text-muted me-2"/> {loc.name}</span><Button variant="outline-danger" size="sm" onClick={()=>confirmDeleteClick("settings_locations", loc.id)}><FiTrash2/></Button></ListGroup.Item>))}</ListGroup></Card>
              </Tab.Pane>

              {/* NEW: DISPATCH MASTER TAB (Specifically for Sale Book) */}
              <Tab.Pane eventKey="dispatch_master">
                <Row className="g-4">
                    {/* LEFT: FROM (SOURCE) */}
                    <Col md={6}>
                        <Card className="shadow-sm border-0 h-100">
                            <Card.Body className="p-4 d-flex flex-column">
                                <h6 className="fw-bold mb-3 d-flex align-items-center text-primary"><FiMapPin className="me-2"/> Add 'From' Location</h6>
                                <p className="text-muted small">Where does the stock leave from?</p>
                                <Form onSubmit={handleAddDispatchSource} className="d-flex gap-2 mb-3">
                                    <Form.Control placeholder="e.g. Farm, Godown" value={newDispatchSource} onChange={(e)=>setNewDispatchSource(e.target.value)} />
                                    <Button type="submit" variant="primary">Add</Button>
                                </Form>
                                <ListGroup variant="flush" className="flex-grow-1 border-top pt-2" style={{maxHeight:'400px', overflowY:'auto'}}>
                                    {dispatchSources.map(loc => (
                                        <ListGroup.Item key={loc.id} className="d-flex justify-content-between py-2 border-0 border-bottom px-0">
                                            <span className="fw-bold text-dark">{loc.name}</span>
                                            <Button variant="link" className="text-danger p-0" onClick={()=>confirmDeleteClick("settings_dispatch_from", loc.id)}><FiTrash2/></Button>
                                        </ListGroup.Item>
                                    ))}
                                    {dispatchSources.length === 0 && <small className="text-muted fst-italic">No 'From' locations.</small>}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                    
                    {/* RIGHT: TO (DESTINATION) */}
                    <Col md={6}>
                        <Card className="shadow-sm border-0 h-100">
                            <Card.Body className="p-4 d-flex flex-column">
                                <h6 className="fw-bold mb-3 d-flex align-items-center text-success"><FiTarget className="me-2"/> Add 'To' Location</h6>
                                <p className="text-muted small">Where does the stock go?</p>
                                <Form onSubmit={handleAddDispatchDestination} className="d-flex gap-2 mb-3">
                                    <Form.Control placeholder="e.g. Zepto, Delhi Market" value={newDispatchDestination} onChange={(e)=>setNewDispatchDestination(e.target.value)} />
                                    <Button type="submit" variant="success">Add</Button>
                                </Form>
                                <ListGroup variant="flush" className="flex-grow-1 border-top pt-2" style={{maxHeight:'400px', overflowY:'auto'}}>
                                    {dispatchDestinations.map(loc => (
                                        <ListGroup.Item key={loc.id} className="d-flex justify-content-between py-2 border-0 border-bottom px-0">
                                            <span className="fw-bold text-dark">{loc.name}</span>
                                            <Button variant="link" className="text-danger p-0" onClick={()=>confirmDeleteClick("settings_dispatch_to", loc.id)}><FiTrash2/></Button>
                                        </ListGroup.Item>
                                    ))}
                                    {dispatchDestinations.length === 0 && <small className="text-muted fst-italic">No 'To' locations.</small>}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
              </Tab.Pane>
              
              {/* ITEMS TAB */}
              <Tab.Pane eventKey="items">
                 <Card className="shadow-sm border-0 mb-4"><Card.Body className="p-4"><h6 className="fw-bold mb-3">Add Inventory Item</h6><Form onSubmit={handleAddItem}><Row className="g-3"><Col md={4}><Form.Control placeholder="Item Name" value={newItem.name} onChange={(e)=>setNewItem({...newItem, name: e.target.value})} /></Col><Col md={4}><Form.Select value={newItem.category} onChange={(e)=>setNewItem({...newItem, category: e.target.value})}><option value="Consumable">Material</option><option value="Asset">Fixed Asset</option></Form.Select></Col><Col md={4}><Form.Select value={newItem.unit} onChange={(e)=>setNewItem({...newItem, unit: e.target.value})}><option>Nos</option><option>Kg</option><option>Ltr</option><option>Box</option><option>Bdl</option></Form.Select></Col><Col md={12}><div className="d-flex gap-2"><Form.Control placeholder="Type (Optional)" value={currentVariant} onChange={(e)=>setCurrentVariant(e.target.value)} /><Button type="button" variant="outline-secondary" onClick={addVariant}>Add Type</Button></div><div className="mt-2">{newItem.variants.map((v, i) => <Badge key={i} bg="light" text="dark" className="border me-1">{v} <FiX className="ms-1 cursor-pointer" onClick={()=>removeVariant(i)}/></Badge>)}</div></Col><Col md={12}><Button type="submit" variant="success" className="w-100">Save Item</Button></Col></Row></Form></Card.Body></Card>
                 <Card className="shadow-sm border-0"><Card.Header className="bg-white fw-bold py-3">Item Catalog</Card.Header><ListGroup variant="flush" style={{maxHeight:'300px', overflowY:'auto'}}>{items.map(item => (<ListGroup.Item key={item.id} className="d-flex justify-content-between py-2"><div><strong className="d-block">{item.name}</strong><small className="text-muted">{item.category} • {item.unit}</small></div><Button variant="outline-danger" size="sm" onClick={()=>confirmDeleteClick("settings_items", item.id)}><FiTrash2/></Button></ListGroup.Item>))}</ListGroup></Card>
              </Tab.Pane>

              {/* EXPENSES TAB */}
              <Tab.Pane eventKey="expenses">
                  <Card className="shadow-sm border-0 mb-4"><Card.Body className="p-4"><h6 className="fw-bold mb-3">Add Finance Category</h6><Form onSubmit={handleAddFinanceCat} className="d-flex gap-2"><Form.Control placeholder="Category Name" value={newCat.name} onChange={(e)=>setNewCat({...newCat, name: e.target.value})} /><Form.Select value={newCat.type} onChange={(e)=>setNewCat({...newCat, type: e.target.value})} style={{maxWidth:'150px'}}><option value="Expense">Expense</option><option value="Income">Income</option></Form.Select><Button type="submit" variant="primary">Add</Button></Form></Card.Body></Card>
                  <Card className="shadow-sm border-0"><Card.Header className="bg-white fw-bold py-3">Active Finance Heads</Card.Header><ListGroup variant="flush" style={{maxHeight:'300px', overflowY:'auto'}}>{financeCats.map(cat => (<ListGroup.Item key={cat.id} className="d-flex justify-content-between py-2"><div><span className="fw-bold"><FiDollarSign className="text-muted me-2"/> {cat.name}</span><Badge bg={cat.type==='Income'?'success':'danger'} className="ms-2">{cat.type}</Badge></div><Button variant="outline-danger" size="sm" onClick={()=>confirmDeleteClick("settings_finance_categories", cat.id)}><FiTrash2/></Button></ListGroup.Item>))}</ListGroup></Card>
              </Tab.Pane>

            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </div>
  );
};

export default Settings;