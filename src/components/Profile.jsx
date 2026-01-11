import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Card, InputGroup, Spinner, Nav, Tab, Modal, Badge, ProgressBar } from 'react-bootstrap';
import { 
  FiUser, FiMail, FiLock, FiCamera, FiSave, FiShield, 
  FiActivity, FiCheckCircle, FiClock, FiMapPin, FiGlobe, 
  FiAlertTriangle, FiSmartphone, FiEdit, FiGrid
} from "react-icons/fi";
import { getAuth, updateProfile, updatePassword, onAuthStateChanged } from 'firebase/auth'; 
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../firebase';
import { ToastNotification } from './CustomAlerts';

const Profile = () => {
  const auth = getAuth();
  
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true); 
  const [imgLoading, setImgLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const CLOUD_NAME = "dm2yxz4g8"; 
  const UPLOAD_PRESET = "happinest_preset"; 

  const initialFormState = {
    displayName: '', email: '', photoURL: '', phone: '', 
    bio: '', role: 'Loading...', branch: ''  
  };

  const [formData, setFormData] = useState(initialFormState);
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });

  // --- 1. AUTH & DATA FETCHING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setFormData(initialFormState);
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      
      // Default set from Auth
      setFormData(prev => ({
          ...prev,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || ''
      }));

      // Fetch Firestore Data
      const userRef = doc(db, "users", user.uid);
      const unsubDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            displayName: data.name || user.displayName || '',
            email: user.email || data.email || '',
            photoURL: data.photoURL || user.photoURL || '',
            phone: data.phone || '',
            bio: data.bio || '',
            role: data.role || 'Staff',
            branch: data.branch || 'Global'
          });
        }
        setDataLoading(false);
      }, (error) => {
        console.error("Profile Sync Error:", error);
        setDataLoading(false);
      });

      return () => unsubDoc();
    }
  }, [user]);

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  // --- 2. HANDLERS ---
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) return showToast("Image size must be < 2MB", "warning");
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) return showToast("Only JPG/PNG allowed", "warning");

    setImgLoading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);
    data.append("cloud_name", CLOUD_NAME);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const cloudData = await res.json();
      if (cloudData.secure_url) {
        const newPhotoURL = cloudData.secure_url;
        setFormData(prev => ({ ...prev, photoURL: newPhotoURL }));

        await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
        const userRef = doc(db, "users", user.uid);
        // Only update photoURL, merge with existing
        await updateDoc(userRef, { photoURL: newPhotoURL });
        
        showToast("Photo uploaded successfully!", "success");
      } else { throw new Error("Upload failed"); }
    } catch (error) { console.error(error); showToast("Upload failed.", "error"); } 
    finally { setImgLoading(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: formData.displayName,
        phone: formData.phone,
        bio: formData.bio
      });
      await updateProfile(auth.currentUser, { displayName: formData.displayName });
      showToast("Profile Updated Successfully!", "success");
    } catch (error) { showToast("Error updating profile.", "error"); }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirmPass) return showToast("Passwords do not match!", "warning");
    if (passData.newPass.length < 6) return showToast("Password weak (min 6 chars)", "warning");

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, passData.newPass);
      showToast("Password changed securely.", "success");
      setPassData({ newPass: '', confirmPass: '' });
    } catch (error) { showToast("Recent login required. Please re-login.", "error"); }
    setLoading(false);
  };

  const calculateCompletion = () => {
      let score = 0;
      if (formData.displayName) score += 25;
      if (formData.email) score += 25;
      if (formData.phone) score += 20;
      if (formData.bio) score += 20;
      if (formData.photoURL) score += 10;
      return score;
  };

  if (dataLoading || !user) return (
    <div className="d-flex justify-content-center align-items-center vh-100 flex-column">
        <Spinner animation="border" variant="primary" className="mb-3"/>
        <p className="text-muted fw-bold">Loading Profile...</p>
    </div>
  );

  // --- 3. PREMIUM STYLES ---
  const s = {
    page: { maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px', paddingTop: '20px' },
    
    // Left Identity Card
    identityCard: {
        border: 'none', borderRadius: '24px', overflow: 'hidden', 
        background: 'white', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
        position: 'relative'
    },
    bgPattern: {
        height: '160px',
        background: `linear-gradient(120deg, #2563eb 0%, #1e40af 100%)`,
        position: 'relative',
        clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
    },
    avatarBox: {
        width: '140px', height: '140px', borderRadius: '50%', 
        border: '6px solid white', backgroundColor: '#fff',
        position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 2
    },
    avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
    cameraBtn: {
        position: 'absolute', bottom: '5px', right: '5px',
        background: '#0f172a', color: 'white', width: '38px', height: '38px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        border: '3px solid white', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
    },
    identityContent: { marginTop: '80px', padding: '0 30px 40px 30px', textAlign: 'center' },
    roleBadge: {
        background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', 
        padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
        display: 'inline-flex', alignItems: 'center', gap: '6px'
    },
    
    // Right Content Card
    contentCard: {
        border: 'none', borderRadius: '24px', 
        background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        overflow: 'hidden', minHeight: '600px'
    },
    navPills: {
        background: '#f8fafc', padding: '8px', borderRadius: '16px', display: 'flex', gap: '5px', marginBottom: '30px'
    },
    
    // Form Elements
    label: { fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { 
        borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', 
        fontSize: '0.95rem', fontWeight: '500', backgroundColor: '#fff', transition: 'all 0.2s',
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
    },
    sectionTitle: { fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '5px', letterSpacing: '-0.5px' },
    sectionDesc: { color: '#64748b', fontSize: '0.95rem', marginBottom: '30px' },
    
    // Stats
    statBox: {
        background: '#f8fafc', borderRadius: '16px', padding: '20px', textAlign: 'center',
        border: '1px solid #f1f5f9', transition: 'transform 0.2s'
    }
  };

  return (
    <div className="fade-in" style={s.page}>
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

      <Row className="g-4">
        
        {/* === LEFT COLUMN: IDENTITY CARD === */}
        <Col lg={4}>
            <div style={{ position: 'sticky', top: '20px' }}>
                <Card style={s.identityCard}>
                    <div style={s.bgPattern}>
                        <div style={{position:'absolute', top:'20px', right:'20px', color:'white', opacity:0.8}}>
                            <FiActivity size={24}/>
                        </div>
                    </div>
                    
                    <div style={s.avatarBox}>
                        {imgLoading ? <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light rounded-circle"><Spinner size="sm"/></div> : 
                        <img 
                            src={formData.photoURL || "https://via.placeholder.com/150"} 
                            style={s.avatarImg} 
                            alt="Profile" 
                            onError={(e)=>{e.target.onerror = null; e.target.src="https://via.placeholder.com/150"}}
                        />}
                        <label htmlFor="p-upload" style={s.cameraBtn} className="hover-scale"><FiCamera size={16}/></label>
                        <input id="p-upload" type="file" hidden accept="image/*" onChange={handleImageChange}/>
                    </div>

                    <div style={s.identityContent}>
                        <h3 className="fw-bold text-dark mb-1">{formData.displayName || 'User'}</h3>
                        <p className="text-muted mb-3">{formData.email}</p>
                        
                        <div className="d-flex justify-content-center gap-2 mb-4">
                            <span style={s.roleBadge}><FiUser size={12}/> {formData.role}</span>
                            <span style={{...s.roleBadge, background:'rgba(16, 185, 129, 0.1)', color:'#10b981'}}><FiMapPin size={12}/> {formData.branch}</span>
                        </div>

                        {/* Profile Strength */}
                        <div className="text-start mb-4">
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span className="text-muted">Profile Strength</span>
                                <span className={calculateCompletion() === 100 ? 'text-success' : 'text-primary'}>{calculateCompletion()}%</span>
                            </div>
                            <ProgressBar now={calculateCompletion()} variant={calculateCompletion() === 100 ? 'success' : 'primary'} style={{height:'8px', borderRadius:'10px'}} />
                        </div>

                        <div className="d-grid gap-3">
                            <div className="d-flex justify-content-between p-3 rounded-3 bg-light">
                                <span className="small text-muted fw-bold">JOINED</span>
                                <span className="small fw-bold text-dark">{user?.metadata.creationTime ? new Date(user.metadata.creationTime).getFullYear() : 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between p-3 rounded-3 bg-light">
                                <span className="small text-muted fw-bold">LAST LOGIN</span>
                                <span className="small fw-bold text-dark">{user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Just now'}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </Col>

        {/* === RIGHT COLUMN: SETTINGS TABS === */}
        <Col lg={8}>
            <Card style={s.contentCard}>
                {/* Default Active Key set to 'edit' */}
                <Tab.Container defaultActiveKey="edit">
                    <div className="p-4 pb-0">
                        <Nav variant="pills" style={s.navPills} className="custom-nav-pills">
                            <Nav.Item className="flex-grow-1 text-center">
                                <Nav.Link eventKey="edit" className="fw-bold py-2"><FiEdit className="me-2"/> Edit Profile</Nav.Link>
                            </Nav.Item>
                            <Nav.Item className="flex-grow-1 text-center">
                                <Nav.Link eventKey="security" className="fw-bold py-2"><FiShield className="me-2"/> Security</Nav.Link>
                            </Nav.Item>
                            <Nav.Item className="flex-grow-1 text-center">
                                <Nav.Link eventKey="settings" className="fw-bold py-2"><FiGrid className="me-2"/> Account</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </div>

                    <Tab.Content className="p-4 p-md-5 pt-2">
                        
                        {/* TAB 1: EDIT PROFILE */}
                        <Tab.Pane eventKey="edit">
                            <div className="mb-4">
                                <div style={s.sectionTitle}>Personal Information</div>
                                <div style={s.sectionDesc}>Update your photo and personal details here.</div>
                            </div>
                            
                            <Form onSubmit={handleUpdateProfile}>
                                <Row className="g-4">
                                    <Col md={6}>
                                        <Form.Group>
                                            <label style={s.label}>Full Name</label>
                                            <InputGroup>
                                                <InputGroup.Text className="bg-white border-end-0 text-muted"><FiUser/></InputGroup.Text>
                                                <Form.Control type="text" value={formData.displayName} onChange={(e)=>setFormData({...formData, displayName: e.target.value})} style={{...s.input, borderLeft:'none'}} />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <label style={s.label}>Contact Number</label>
                                            <InputGroup>
                                                <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiSmartphone/></InputGroup.Text>
                                                <Form.Control type="text" value={formData.phone} onChange={(e)=>setFormData({...formData, phone: e.target.value})} style={{...s.input, borderLeft:'none'}} placeholder="+91 00000 00000" />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <label style={s.label}>Bio / Job Description</label>
                                            <Form.Control as="textarea" rows={4} value={formData.bio} onChange={(e)=>setFormData({...formData, bio: e.target.value})} style={s.input} placeholder="Describe your role briefly..." />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="mt-5 d-flex justify-content-end">
                                    <Button type="submit" variant="dark" size="lg" disabled={loading} style={{borderRadius:'12px', padding:'12px 30px', fontSize:'1rem', fontWeight:'bold', boxShadow:'0 10px 20px -5px rgba(0,0,0,0.2)'}}>
                                        {loading ? <Spinner size="sm" className="me-2"/> : <><FiSave className="me-2"/> Save Changes</>}
                                    </Button>
                                </div>
                            </Form>
                        </Tab.Pane>

                        {/* TAB 2: SECURITY */}
                        <Tab.Pane eventKey="security">
                            <div className="mb-4">
                                <div style={s.sectionTitle}>Login & Security</div>
                                <div style={s.sectionDesc}>Ensure your account is secure with a strong password.</div>
                            </div>

                            <Row className="g-5">
                                <Col md={7}>
                                    <Form onSubmit={handleChangePassword}>
                                        <Form.Group className="mb-3">
                                            <label style={s.label}>New Password</label>
                                            <InputGroup>
                                                <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiLock/></InputGroup.Text>
                                                <Form.Control type="password" value={passData.newPass} onChange={(e)=>setPassData({...passData, newPass: e.target.value})} style={{...s.input, borderLeft:'none'}} placeholder="Min 6 characters" />
                                            </InputGroup>
                                        </Form.Group>
                                        <Form.Group className="mb-4">
                                            <label style={s.label}>Confirm Password</label>
                                            <InputGroup>
                                                <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCheckCircle/></InputGroup.Text>
                                                <Form.Control type="password" value={passData.confirmPass} onChange={(e)=>setPassData({...passData, confirmPass: e.target.value})} style={{...s.input, borderLeft:'none'}} placeholder="Re-enter password" />
                                            </InputGroup>
                                        </Form.Group>
                                        <Button type="submit" variant="primary" disabled={loading} style={{borderRadius:'12px', padding:'10px 20px', fontWeight:'600'}}>Update Password</Button>
                                    </Form>
                                </Col>

                                <Col md={5}>
                                    <div className="p-4 bg-danger bg-opacity-10 rounded-4 border border-danger border-opacity-25 h-100">
                                        <h6 className="fw-bold text-danger mb-3"><FiAlertTriangle className="me-2"/> Danger Zone</h6>
                                        <p className="small text-muted mb-4" style={{lineHeight:'1.5'}}>
                                            Deleting your account is permanent. All your data will be wiped out immediately.
                                        </p>
                                        <Button variant="danger" size="sm" className="w-100 fw-bold" onClick={()=>setShowDeleteModal(true)}>Delete Account</Button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* TAB 3: ACCOUNT STATS */}
                        <Tab.Pane eventKey="settings">
                            <div className="mb-4">
                                <div style={s.sectionTitle}>Account Details</div>
                                <div style={s.sectionDesc}>View your system status and identifiers.</div>
                            </div>
                            
                            <Row className="g-3">
                                <Col md={6}>
                                    <div style={s.statBox}>
                                        <div className="text-muted small fw-bold mb-1">USER ID</div>
                                        <div className="text-dark fw-bold text-break" style={{fontSize:'0.9rem', fontFamily:'monospace'}}>{user?.uid}</div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div style={s.statBox}>
                                        <div className="text-muted small fw-bold mb-1">PROVIDER</div>
                                        <div className="text-dark fw-bold">Email / Password</div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div style={s.statBox}>
                                        <div className="text-muted small fw-bold mb-1">EMAIL VERIFIED</div>
                                        <div className={user?.emailVerified ? "text-success fw-bold" : "text-warning fw-bold"}>
                                            {user?.emailVerified ? "Verified" : "Pending Verification"}
                                        </div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div style={s.statBox}>
                                        <div className="text-muted small fw-bold mb-1">LAST IP LOCATION</div>
                                        <div className="text-dark fw-bold"><FiGlobe className="me-1"/> India (IN)</div>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>

                    </Tab.Content>
                </Tab.Container>
            </Card>
        </Col>
      </Row>

      {/* DELETE MODAL */}
      <Modal show={showDeleteModal} onHide={()=>setShowDeleteModal(false)} centered>
         <Modal.Header closeButton className="border-0"><Modal.Title className="text-danger fw-bold">Delete Account?</Modal.Title></Modal.Header>
         <Modal.Body>Are you sure you want to delete your account? This action involves erasing all your data and cannot be undone.</Modal.Body>
         <Modal.Footer className="border-0">
            <Button variant="light" onClick={()=>setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={()=>{setShowDeleteModal(false); showToast("Admin access required for deletion.", "error")}}>Confirm Delete</Button>
         </Modal.Footer>
      </Modal>

      {/* Custom Styles Injection */}
      <style>{`
        .custom-nav-pills .nav-link { 
            color: #64748b; background: transparent; border-radius: 12px; transition: all 0.2s; 
        }
        .custom-nav-pills .nav-link.active { 
            background-color: white; color: #2563eb; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .custom-nav-pills .nav-link:hover:not(.active) {
            background-color: #e2e8f0;
        }
        .hover-scale:hover { transform: scale(1.1); }
      `}</style>
    </div>
  );
};

export default Profile;