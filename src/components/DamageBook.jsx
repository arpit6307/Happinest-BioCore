import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge, Table, Modal } from 'react-bootstrap';
import { 
  FiAlertTriangle, FiDownload, FiSearch, FiCalendar, FiMapPin, FiInfo, 
  FiTrash2, FiSave, FiArchive, FiEdit, FiBox, FiCheckCircle, FiXCircle,
  FiChevronDown, FiCheck, FiSettings, FiArrowRight 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, where, deleteDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

// Helper: Date Format DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const DamageBook = ({ selectedBranch, setActiveTab, userRole }) => {
  const [locations, setLocations] = useState([]);
  const [damageTypes, setDamageTypes] = useState([]);
  const [damageList, setDamageList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  // --- Custom Dropdown States ---
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const locDropdownRef = useRef(null);
  const typeDropdownRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' }); 
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [deleteId, setDeleteId] = useState(null); 

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState({
    from: new Date().toISOString().split('T')[0].substring(0, 8) + '01',
    to: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '', 
    type: '', 
    description: '',
    inTray: '', pack30: '', pack10: '', pack06: '', loose: ''
  });
  const [totalEggs, setTotalEggs] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    
    const handleClickOutside = (event) => {
        if (locDropdownRef.current && !locDropdownRef.current.contains(event.target)) {
            setIsLocDropdownOpen(false);
        }
        if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
            setIsTypeDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const total = (Number(formData.inTray || 0) * 30) + 
                  (Number(formData.pack30 || 0) * 30) + 
                  (Number(formData.pack10 || 0) * 10) + 
                  (Number(formData.pack06 || 0) * 6) +
                  (Number(formData.loose || 0));
    setTotalEggs(total);
  }, [formData]);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const locSnap = await getDocs(collection(db, "settings_damage_locations"));
            setLocations(locSnap.docs.map(doc => doc.data().name));
            
            const typeSnap = await getDocs(collection(db, "settings_damage_types"));
            setDamageTypes(typeSnap.docs.map(doc => doc.data().name));

            if(!editingId) {
                setFormData(prev => ({ 
                    ...prev, 
                    location: locSnap.docs.length > 0 ? locSnap.docs[0].data().name : '',
                    type: typeSnap.docs.length > 0 ? typeSnap.docs[0].data().name : ''
                }));
            }
        } catch(e) { console.error(e); }
    };
    fetchSettings();

    let q;
    if (selectedBranch === 'All') {
        q = query(collection(db, "egg_damage"), orderBy("date", "desc"));
    } else {
        q = query(
            collection(db, "egg_damage"), 
            where("branch", "==", selectedBranch), 
            orderBy("date", "desc")
        );
    }
    
    setLoading(true);
    const unsub = onSnapshot(q, (snapshot) => {
      setDamageList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsub();
  }, [editingId, selectedBranch]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleLocationSelect = (loc) => { setFormData({ ...formData, location: loc }); setIsLocDropdownOpen(false); };
  const handleTypeSelect = (t) => { setFormData({ ...formData, type: t }); setIsTypeDropdownOpen(false); };
  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.type) return showToast("Please configure Settings first.", "warning");
    if (totalEggs === 0) return showToast("Please enter quantity.", "warning");

    const branchToSave = selectedBranch === 'All' ? 'Delhi' : selectedBranch;
    setSubmitLoading(true);
    try {
        const payload = { ...formData, totalEggs, branch: branchToSave, timestamp: serverTimestamp() };
        if (editingId) {
            await updateDoc(doc(db, "egg_damage", editingId), payload);
            setEditingId(null);
            showToast("Damage updated!", "success");
        } else {
            await addDoc(collection(db, "egg_damage"), payload);
            showToast(`Damage logged in ${branchToSave}!`, "success");
        }
        setFormData(prev => ({ 
            date: new Date().toISOString().split('T')[0],
            location: locations.length > 0 ? locations[0] : '', 
            type: damageTypes.length > 0 ? damageTypes[0] : '',
            description: '', inTray: '', pack30: '', pack10: '', pack06: '', loose: ''
        }));
    } catch(err) { showToast("Error saving record.", "error"); }
    setSubmitLoading(false);
  };

  const handleEdit = (item) => {
      setFormData({
          date: item.date, location: item.location, type: item.type, description: item.description || '',
          inTray: item.inTray, pack30: item.pack30, pack10: item.pack10, pack06: item.pack06, loose: item.loose
      });
      setEditingId(item.id);
      if(isMobile) window.scrollTo(0,0);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setFormData(prev => ({ ...prev, description: '', inTray: '', pack30: '', pack10: '', pack06: '', loose: '' }));
  };

  const handleDeleteClick = (id) => { setDeleteId(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
      if (deleteId) {
        await deleteDoc(doc(db, "egg_damage", deleteId));
        setShowDeleteModal(false);
        showToast("Deleted successfully.", "error");
      }
  };

  // --- FILTER & SORT ---
  const filteredList = damageList.filter(item => 
    (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedEntries = filteredList.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
  }, {});
  
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

  const openExportModal = () => setShowExportModal(true);

  // --- PDF EXPORT (Updated Format & Sorting) ---
  const generatePDF = async (dataList, titlePeriod) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
        img.onload = () => { const c = document.createElement("canvas"); c.width=img.width; c.height=img.height; c.getContext("2d").drawImage(img,0,0); resolve(c.toDataURL("image/jpeg")); };
        img.onerror = () => resolve(null);
    });
    const imgData = await loadImage("https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg");
    
    if(imgData) doc.addImage(imgData, 'JPEG', 14, 10, 22, 22);
    doc.setFontSize(18); doc.setTextColor(220, 53, 69); doc.setFont("helvetica", "bold");
    doc.text("Happinest Poultry Products Pvt. Ltd.", 42, 18);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text(`Damage & Loss Report (${selectedBranch === 'All' ? 'Total' : selectedBranch})`, 42, 24);
    doc.setFontSize(9); doc.setTextColor(50);
    doc.text(`Period: ${titlePeriod}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 23, { align: 'right' });
    doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(14, 35, pageWidth - 14, 35);

    const reportGrouped = dataList.reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
    }, {});
    
    const reportDates = Object.keys(reportGrouped).sort((a, b) => new Date(b) - new Date(a));
    
    let tableBody = [];
    reportDates.forEach(date => {
       const items = reportGrouped[date];
       const dayTotal = items.reduce((sum, i) => sum + Number(i.totalEggs), 0);
       tableBody.push([{ content: `DATE: ${formatDate(date)} (Total Loss: ${dayTotal})`, colSpan: 5, styles: { fillColor: [255, 235, 238], fontStyle: 'bold', textColor: [200, 0, 0] } }]);
       items.forEach(item => tableBody.push([
           item.location, item.type, item.description || '-', 
           `${item.inTray?item.inTray+'T ':''}${item.loose?item.loose+'L':''}`,
           Number(item.totalEggs).toLocaleString()
       ]));
    });

    autoTable(doc, { 
        startY: 40, head: [["Loc", "Type", "Note", "Details", "Qty"]], body: tableBody, theme: 'grid',
        headStyles: { fillColor: [220, 53, 69], textColor: 255 }
    });
    doc.save(`Damage_Report_${titlePeriod}.pdf`);
  };

  const handleExportConfirm = (type) => {
      let finalData = [];
      let title = "";
      if (type === 'all') { finalData = damageList; title = "All_Time_Records"; } 
      else { finalData = damageList.filter(item => item.date >= exportRange.from && item.date <= exportRange.to); title = `${exportRange.from}_to_${exportRange.to}`; }
      if (finalData.length === 0) { showToast("No records found.", "warning"); } 
      else { generatePDF(finalData, title); setShowExportModal(false); showToast("Report downloading...", "success"); }
  };

  if (loading) return <Loader text={`Loading ${selectedBranch} Loss Records...`} />;

  // --- UPDATED STYLES FOR SMOOTH RESIZING ---
  const s = {
    page: { 
        maxWidth: '100%', 
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // ✅ Smooth Resize
    },
    statCard: (type) => ({
      borderRadius: '20px', padding: '25px', position: 'relative', overflow: 'hidden', color: 'white',
      background: type === 'red' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 
                  type === 'orange' ? 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' : 
                  'linear-gradient(135deg, #64748b 0%, #334155 100%)',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: 'none', height: '100%', marginBottom: isMobile ? '15px' : '0'
    }),
    statValue: { fontSize: '1.8rem', fontWeight: '800', margin: 0 },
    statLabel: { fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' },
    
    // ✅ Main Layout: Uses Flex to adjust width automatically
    mainContainer: { 
        display: 'flex', 
        gap: '25px', 
        marginTop: '25px', 
        alignItems: 'flex-start', 
        flexDirection: isMobile ? 'column' : 'row',
        transition: 'all 0.3s ease' // ✅ Smooth Resize
    },
    
    // ✅ Form Panel: Fixed Width on Desktop, Full Width on Mobile
    formPanel: { 
        flex: isMobile ? 'none' : '0 0 350px', 
        width: '100%', 
        backgroundColor: 'white', borderRadius: '24px', padding: '30px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        position: isMobile ? 'static' : 'sticky', top: '20px',
        transition: 'all 0.3s ease' // ✅ Smooth Resize
    },
    
    // ✅ List Panel: Takes Remaining Space
    listPanel: { 
        flex: 1, 
        width: '100%', backgroundColor: 'white', borderRadius: '24px', padding: '0', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        minHeight: '500px', overflow: 'hidden',
        transition: 'all 0.3s ease' // ✅ Smooth Resize
    },
    
    input: { borderRadius: '10px', padding: '12px 15px', border: '1px solid #e2e8f0', fontSize: '0.95rem', backgroundColor:'#fdfdfd' },
    label: { fontSize: '0.8rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' },
    customSelect: { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', color: '#334155', fontWeight: '500' },
    dropdownMenu: { position: 'absolute', top: '105%', left: 0, width: '100%', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', padding: '5px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' },
    dropdownItem: (active) => ({ padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: active ? '#fff7ed' : 'transparent', color: active ? '#ea580c' : '#475569', fontWeight: active ? '600' : '500', fontSize: '0.9rem', marginBottom: '2px', transition: 'all 0.2s' }),
    
    // ✅ ORIGINAL PRO MODAL STYLES PRESERVED
    modalHeader: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px 25px' },
    modalBody: { padding: '30px' },
    modalInput: { borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 15px', fontWeight: 'bold' },
    btnPrimary: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' },
    btnDark: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600' }
  };

  const totalLoss = damageList.reduce((sum, item) => sum + Number(item.totalEggs || 0), 0);
  const todayLoss = damageList.filter(i => i.date === new Date().toISOString().split('T')[0]).reduce((sum, item) => sum + Number(item.totalEggs || 0), 0);

  return (
    <div className="fade-in" style={s.page}>
      
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} title="Delete Damage Entry?" message="Are you sure?" type="danger" confirmText="Yes, Delete" />

      {/* EXPORT MODAL (PRO DESIGN RESTORED) */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered contentClassName="border-0 rounded-4 shadow-lg overflow-hidden">
        <div style={s.modalHeader}>
           <div className="d-flex align-items-center justify-content-between">
               <h5 className="fw-bold mb-0 d-flex align-items-center"><FiDownload className="me-2 text-primary-light" style={{color:'#93c5fd'}}/> Export Report</h5>
               <FiXCircle size={24} style={{cursor:'pointer', opacity:0.8}} onClick={() => setShowExportModal(false)}/>
           </div>
        </div>
        <div style={s.modalBody}>
           <div className="text-center mb-4">
              <div style={{width:'60px', height:'60px', borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px auto'}}>
                 <FiAlertTriangle size={28} className="text-danger"/>
              </div>
              <h6 className="fw-bold text-dark">Download Damage Log</h6>
              <p className="text-muted small">Select a date range to generate a PDF report.</p>
           </div>
           <Row className="g-3 mb-4">
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">From Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-danger" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
                       <Form.Control type="date" value={exportRange.from} onChange={(e) => setExportRange({...exportRange, from: e.target.value})} style={{...s.modalInput, borderLeft:'none'}} />
                   </InputGroup>
               </Col>
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">To Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-danger" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
                       <Form.Control type="date" value={exportRange.to} onChange={(e) => setExportRange({...exportRange, to: e.target.value})} style={{...s.modalInput, borderLeft:'none'}} />
                   </InputGroup>
               </Col>
           </Row>
           <div className="d-flex flex-column gap-3">
              <Button style={s.btnPrimary} onClick={() => handleExportConfirm('range')}>
                 <FiCheckCircle className="me-2"/> Download Selected Range
              </Button>
              <div className="text-center position-relative">
                  <hr className="text-muted opacity-25"/>
                  <span className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-muted small fw-bold">OR</span>
              </div>
              <Button style={s.btnDark} onClick={() => handleExportConfirm('all')}>
                 <FiArchive className="me-2"/> Download Complete History
              </Button>
           </div>
        </div>
      </Modal>

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h4 className="fw-bold text-dark mb-1">Damage & Loss</h4><p className="text-muted small mb-0">Daily breakage log.</p></div>
        <Button variant="outline-danger" size="sm" onClick={openExportModal} className="fw-bold" style={{borderRadius:'10px', padding:'8px 15px'}}><FiDownload className="me-2"/> Export Report</Button>
      </div>

      {/* STATS */}
      <Row className="g-3">
         <Col xs={12} md={4}><div style={s.statCard('red')}><p style={s.statLabel}>Total Loss ({selectedBranch})</p><h3 style={s.statValue}>{totalLoss.toLocaleString()}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('orange')}><p style={s.statLabel}>Today's Loss</p><h3 style={s.statValue}>{todayLoss.toLocaleString()}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('gray')}><p style={s.statLabel}>Total Incidents</p><h3 style={s.statValue}>{damageList.length}</h3></div></Col>
      </Row>

      {/* MAIN FORM */}
      <div style={s.mainContainer}>
         
         {/* LEFT: FORM */}
         <div style={s.formPanel}>
            <h6 className="fw-bold mb-4 d-flex align-items-center text-danger">
               {editingId ? <FiEdit className="me-2"/> : <FiAlertTriangle className="me-2"/>} {editingId ? 'Edit Entry' : 'Report Damage'}
               {selectedBranch !== 'All' && <Badge bg="dark" className="ms-2">{selectedBranch}</Badge>}
            </h6>
            
            <Form onSubmit={handleSubmit}>
               <div className="mb-3 p-2 bg-danger bg-opacity-10 rounded border border-danger">
                    <label className="small fw-bold text-danger mb-1">Incident Date</label>
                    <InputGroup><InputGroup.Text className="bg-white border-end-0 text-danger"><FiCalendar/></InputGroup.Text><Form.Control type="date" name="date" value={formData.date} onChange={handleChange} className="border-start-0 fw-bold" required /></InputGroup>
               </div>

               <div className="mb-3 position-relative" ref={locDropdownRef}>
                  <label style={s.label}>Location</label>
                  <div style={s.customSelect} onClick={() => setIsLocDropdownOpen(!isLocDropdownOpen)}>
                      <span>{formData.location || "Select Location"}</span>
                      <FiChevronDown className={`text-muted transition ${isLocDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isLocDropdownOpen && (
                      <div style={s.dropdownMenu} className="fade-in">
                          {locations.map((l, i) => (
                              <div key={i} style={s.dropdownItem(formData.location === l)} onClick={() => handleLocationSelect(l)}>{l} {formData.location === l && <FiCheck size={14}/>}</div>
                          ))}
                          {userRole === 'Admin' && <div className="border-top mt-1 pt-1"><small className="d-block text-center text-danger fw-bold py-1 cursor-pointer" style={{fontSize:'0.75rem'}} onClick={() => setActiveTab('settings_damage')}>+ Manage Locations</small></div>}
                      </div>
                  )}
               </div>

               <div className="mb-3 position-relative" ref={typeDropdownRef}>
                  <label style={s.label}>Reason (Type)</label>
                  <div style={s.customSelect} onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}>
                      <span>{formData.type || "Select Reason"}</span>
                      <FiChevronDown className={`text-muted transition ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isTypeDropdownOpen && (
                      <div style={s.dropdownMenu} className="fade-in">
                          {damageTypes.map((t, i) => (
                              <div key={i} style={s.dropdownItem(formData.type === t)} onClick={() => handleTypeSelect(t)}>{t} {formData.type === t && <FiCheck size={14}/>}</div>
                          ))}
                          {userRole === 'Admin' && <div className="border-top mt-1 pt-1"><small className="d-block text-center text-danger fw-bold py-1 cursor-pointer" style={{fontSize:'0.75rem'}} onClick={() => setActiveTab('settings_damage')}>+ Manage Reasons</small></div>}
                      </div>
                  )}
               </div>
               
               <div className="mb-3">
                  <label style={s.label} className="d-flex align-items-center mb-2"><FiBox className="me-2"/> Quantity Breakdown</label>
                  <Row className="g-2">
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Tray (30)" name="inTray" value={formData.inTray} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Pack 30" name="pack30" value={formData.pack30} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={4}><Form.Control size="sm" type="number" placeholder="Pk 10" name="pack10" value={formData.pack10} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={4}><Form.Control size="sm" type="number" placeholder="Pk 6" name="pack06" value={formData.pack06} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={4}><Form.Control size="sm" type="number" placeholder="Loose" name="loose" value={formData.loose} onChange={handleChange} style={s.input}/></Col>
                  </Row>
               </div>
               <div className="mb-3"><label style={s.label}>Note</label><Form.Control size="sm" type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Optional details..." style={s.input}/></div>
               
               <div className="p-3 bg-light rounded-3 border text-center mb-3">
                  <small className="text-muted fw-bold text-uppercase ls-1">Calculated Loss</small>
                  <h2 className="text-danger fw-bold mb-0 mt-1">{totalEggs.toLocaleString()} <span className="fs-6 text-muted">eggs</span></h2>
               </div>
               <div className="d-flex gap-2">
                  {editingId && <Button variant="outline-secondary" className="w-50" onClick={handleCancelEdit}>Cancel</Button>}
                  <Button type="submit" variant={editingId?"warning":"danger"} className={`w-100 py-2 fw-bold`} disabled={submitLoading || locations.length===0}>{submitLoading?'Saving...':(editingId?'Update':'Save Record')}</Button>
               </div>
            </Form>
         </div>

         {/* RIGHT: LIST (Smooth Resize) */}
         <div style={s.listPanel}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
               <h6 className="fw-bold mb-0">History</h6>
               <InputGroup size="sm" style={{width:'180px'}}><InputGroup.Text className="bg-white border-end-0"><FiSearch/></InputGroup.Text><Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="border-start-0" /></InputGroup>
            </div>
            <div style={{maxHeight:'600px', overflowY:'auto'}}>
               <Table hover responsive className="mb-0 align-middle small text-center" style={{fontSize: '0.8rem'}}>
                 <thead className="bg-light text-muted sticky-top" style={{zIndex: 1, top: 0}}>
                    <tr>
                        <th style={{width:'15%'}}>Date</th>
                        <th style={{width:'25%'}} className="text-start">Location & Reason</th>
                        <th style={{width:'30%'}} className="table-danger text-danger">Damage Qty</th>
                        <th style={{width:'20%'}} className="text-start">Note</th>
                        <th style={{width:'10%'}}>Act</th>
                    </tr>
                 </thead>
                 <tbody>
                    {sortedDates.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No records found for {selectedBranch}</p></td></tr>
                    ) : (
                        sortedDates.map((date) => {
                            const items = groupedEntries[date];
                            return (
                                <React.Fragment key={date}>
                                    {items.map((item, index) => (
                                        <tr key={item.id} style={{ fontSize: '0.9rem' }}>
                                            {index === 0 && (
                                                <td rowSpan={items.length} className="bg-white align-middle fw-bold border-end">
                                                    <div className="text-danger">{formatDate(date)}</div>
                                                    <Badge bg="light" text="danger" className="border border-danger mt-1">{items.length} Reports</Badge>
                                                </td>
                                            )}
                                            
                                            <td className="text-start align-middle">
                                                <div className="d-flex align-items-center gap-1 mb-1">
                                                    <Badge bg="light" text="dark" className="border">{item.location}</Badge>
                                                    <FiArrowRight className="text-muted" size={10}/>
                                                    <Badge bg="danger">{item.type}</Badge>
                                                </div>
                                            </td>

                                            <td className="bg-danger bg-opacity-10 align-middle text-start ps-4">
                                                <div className="fw-bold text-danger mb-1">{Number(item.totalEggs).toLocaleString()} Eggs</div>
                                                <div className="d-flex flex-column gap-0 text-muted" style={{fontSize:'0.75rem'}}>
                                                    {Number(item.inTray) > 0 && <span>T30: <b>{item.inTray}</b></span>}
                                                    {Number(item.pack30) > 0 && <span>P30: <b>{item.pack30}</b></span>}
                                                    {Number(item.pack10) > 0 && <span>P10: <b>{item.pack10}</b></span>}
                                                    {Number(item.pack06) > 0 && <span>P06: <b>{item.pack06}</b></span>}
                                                    {Number(item.loose) > 0 && <span>Loose: <b>{item.loose}</b></span>}
                                                </div>
                                            </td>

                                            <td className="text-start align-middle text-muted small fst-italic">
                                                {item.description || '-'}
                                            </td>

                                            <td className="text-end pe-3 align-middle">
                                                <Button variant="link" className="text-primary p-0 me-2" onClick={() => handleEdit(item)}><FiEdit/></Button>
                                                <Button variant="link" className="text-danger p-0" onClick={() => handleDeleteClick(item.id)}><FiTrash2/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })
                    )}
                 </tbody>
               </Table>
            </div>
         </div>

      </div>
    </div>
  );
};

export default DamageBook;