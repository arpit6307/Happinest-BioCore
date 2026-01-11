import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge, Table, Modal } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiMapPin, FiCalendar, 
  FiLayers, FiBox, FiArchive, FiCheckCircle, FiTrash2, FiEdit, FiX, FiActivity, FiXCircle, FiChevronDown, FiCheck 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

// ✅ UPDATE: Added 'userRole' & 'setActiveTab' for Admin Features
const EggInventory = ({ selectedBranch, setActiveTab, userRole }) => {
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '', 
    inTray: '', pack30: '', pack10: '', pack06: ''
  });

  const [totalEggs, setTotalEggs] = useState(0);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  
  // Custom Dropdown State
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' }); 
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [deleteId, setDeleteId] = useState(null); 

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState({
    from: new Date().toISOString().split('T')[0].substring(0, 8) + '01', 
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    
    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLocDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "settings_locations"));
        const locs = querySnapshot.docs.map(doc => doc.data().name);
        setLocations(locs);
        if (locs.length > 0 && !editingId) setFormData(prev => ({ ...prev, location: locs[0] }));
      } catch (error) { console.error("Error fetching locations:", error); }
    };
    fetchLocs();

    // ✅ Branch Filter Logic
    let q;
    if (selectedBranch === 'All') {
        q = query(collection(db, "egg_inventory"), orderBy("date", "desc"));
    } else {
        q = query(
            collection(db, "egg_inventory"), 
            where("branch", "==", selectedBranch), 
            orderBy("date", "desc")
        );
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStockList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });

    return () => unsubscribe();
  }, [editingId, selectedBranch]);

  useEffect(() => {
    const total = (Number(formData.inTray || 0) * 30) + 
                  (Number(formData.pack30 || 0) * 30) + 
                  (Number(formData.pack10 || 0) * 10) + 
                  (Number(formData.pack06 || 0) * 6);
    setTotalEggs(total);
  }, [formData]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleLocationSelect = (loc) => {
      setFormData({ ...formData, location: loc });
      setIsLocDropdownOpen(false);
  };

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location) return showToast("Please configure Warehouse Locations first!", "warning");
    if (totalEggs === 0) return showToast("Please enter stock quantity.", "warning");
    
    const branchToSave = selectedBranch === 'All' ? 'Delhi' : selectedBranch;

    setSubmitLoading(true);
    try {
      const dataPayload = { 
          ...formData, 
          totalEggs, 
          branch: branchToSave, 
          timestamp: serverTimestamp() 
      };

      if (editingId) {
        const docRef = doc(db, "egg_inventory", editingId);
        await updateDoc(docRef, dataPayload);
        setEditingId(null);
        showToast("Record updated successfully!", "success");
      } else {
        await addDoc(collection(db, "egg_inventory"), dataPayload);
        showToast(`Stock saved to ${branchToSave} Branch!`, "success");
      }
      setFormData({ 
          date: new Date().toISOString().split('T')[0],
          location: locations.length > 0 ? locations[0] : '', 
          inTray: '', pack30: '', pack10: '', pack06: '' 
      });
    } catch (error) { showToast("Failed to save entry.", "error"); console.error(error); }
    setSubmitLoading(false);
  };

  const handleEdit = (item) => {
      setFormData({
          date: item.date, location: item.location,
          inTray: item.inTray, pack30: item.pack30, pack10: item.pack10, pack06: item.pack06
      });
      setEditingId(item.id);
      if(isMobile) window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setFormData({ 
          date: new Date().toISOString().split('T')[0],
          location: locations.length > 0 ? locations[0] : '', 
          inTray: '', pack30: '', pack10: '', pack06: '' 
      });
  };

  const handleDeleteClick = (id) => { setDeleteId(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
      if (deleteId) {
        await deleteDoc(doc(db, "egg_inventory", deleteId));
        setShowDeleteModal(false);
        showToast("Entry deleted successfully.", "error");
      }
  };

  const filteredList = stockList.filter(item => 
    (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.date && item.date.includes(searchTerm))
  );

  const openExportModal = () => setShowExportModal(true);

  const generatePDF = async (dataList, titlePeriod) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
        img.onload = () => { const c = document.createElement("canvas"); c.width=img.width; c.height=img.height; c.getContext("2d").drawImage(img,0,0); resolve(c.toDataURL("image/jpeg")); };
        img.onerror = () => resolve(null);
    });
    const imgData = await loadImage("https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg");

    if(imgData) doc.addImage(imgData, 'JPEG', 14, 10, 22, 22);
    doc.setFontSize(18); doc.setTextColor(13, 110, 253); doc.setFont("helvetica", "bold");
    doc.text("Happinest Poultry Products Pvt. Ltd.", 42, 18);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text(`Daily Egg Production Report (${selectedBranch === 'All' ? 'All Branches' : selectedBranch})`, 42, 24);
    
    doc.setFontSize(9); doc.setTextColor(50);
    doc.text(`Period: ${titlePeriod}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 23, { align: 'right' });
    
    doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(14, 35, pageWidth - 14, 35); 

    const groupedStock = dataList.reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
    }, {});
    const sortedDates = Object.keys(groupedStock).sort((a, b) => new Date(b) - new Date(a));

    let tableBody = [];
    sortedDates.forEach(date => {
       const items = groupedStock[date];
       const dayTotal = items.reduce((sum, i) => sum + Number(i.totalEggs), 0);
       tableBody.push([{ content: `DATE: ${date}   (Total: ${dayTotal.toLocaleString()} Eggs)`, colSpan: 6, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [50, 50, 50], halign: 'left' } }]);
       items.forEach(item => {
           tableBody.push([
               item.location, item.inTray || '-', item.pack30 || '-', item.pack10 || '-', item.pack06 || '-', Number(item.totalEggs).toLocaleString()
           ]);
       });
    });

    autoTable(doc, { 
        startY: 40, head: [["Location", "Trays (30s)", "Pack-30", "Pack-10", "Pack-06", "Total Quantity"]], body: tableBody, theme: 'plain', 
        styles: { fontSize: 9, cellPadding: 3, lineColor: 220, lineWidth: 0.1, valign: 'middle' },
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { cellWidth: 'auto', fontStyle: 'bold' }, 5: { halign: 'right', fontStyle: 'bold', textColor: [13, 110, 253] } },
    });
    const lastPage = doc.internal.getNumberOfPages(); doc.setPage(lastPage); const footerY = pageHeight - 35;
    doc.setDrawColor(150); doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(8); doc.setTextColor(100); doc.text("System Generated Report by BioCore ERP", 14, footerY + 6); 
    doc.save(`Egg_Report_${titlePeriod}.pdf`);
  };

  const handleExportConfirm = (type) => {
      let finalData = [];
      let title = "";
      if (type === 'all') { finalData = stockList; title = "All_Time_Records"; } 
      else { finalData = stockList.filter(item => item.date >= exportRange.from && item.date <= exportRange.to); title = `${exportRange.from}_to_${exportRange.to}`; }

      if (finalData.length === 0) { showToast("No records found.", "warning"); } 
      else { generatePDF(finalData, title); setShowExportModal(false); showToast("Report downloading...", "success"); }
  };

  if (loading) return <Loader text={`Loading ${selectedBranch} Stock...`} />;

  // --- UPDATED STYLES FOR SMOOTH RESIZING ---
  const s = {
    page: { 
        maxWidth: '100%', // Allows full width expansion
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // ✅ Smooth Resize
    },
    statCard: (color) => ({
      borderRadius: '20px', padding: '25px', position: 'relative', overflow: 'hidden', color: 'white',
      background: color === 'gold' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                  color === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: 'none', height: '100%', marginBottom: isMobile ? '15px' : '0',
      transition: 'transform 0.2s ease-in-out'
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
        transition: 'all 0.3s ease' 
    },
    
    // ✅ Form Panel: Fixed Width on Desktop, Full Width on Mobile
    formPanel: { 
        flex: isMobile ? 'none' : '0 0 350px', 
        width: '100%', 
        backgroundColor: 'white', borderRadius: '24px', padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        position: isMobile ? 'static' : 'sticky', top: '20px',
        transition: 'all 0.3s ease'
    },
    
    // ✅ List Panel: Takes Remaining Space (Grows when sidebar collapses)
    listPanel: { 
        flex: 1, 
        width: '100%', 
        backgroundColor: 'white', borderRadius: '24px', padding: '0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        minHeight: '500px', overflow: 'hidden',
        transition: 'all 0.3s ease'
    },
    
    input: { borderRadius: '10px', padding: '12px 15px', border: '1px solid #e2e8f0', fontSize: '0.95rem', backgroundColor:'#fdfdfd' },
    label: { fontSize: '0.8rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' },
    
    // ✅ Your Original Pro Modal Styles
    modalHeader: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px 25px' },
    modalBody: { padding: '30px' },
    modalInput: { borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 15px', fontWeight: 'bold' },
    btnPrimary: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' },
    btnDark: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600' },

    // Custom Dropdown Styles
    customSelect: {
        width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0',
        backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '0.95rem', color: '#334155', fontWeight: '500'
    },
    dropdownMenu: {
        position: 'absolute', top: '105%', left: 0, width: '100%', backgroundColor: 'white',
        borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9',
        padding: '5px', zIndex: 100, maxHeight: '200px', overflowY: 'auto'
    },
    dropdownItem: (active) => ({
        padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: active ? '#fff7ed' : 'transparent', color: active ? '#ea580c' : '#475569', fontWeight: active ? '600' : '500', fontSize: '0.9rem', marginBottom: '2px', transition: 'all 0.2s'
    })
  };

  const totalStock = stockList.reduce((acc, curr) => acc + Number(curr.totalEggs), 0);
  const todayStock = stockList.filter(i => i.date === new Date().toISOString().split('T')[0]).reduce((acc, curr) => acc + Number(curr.totalEggs), 0);

  return (
    <div className="fade-in" style={s.page}>
      
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} title="Delete Entry?" message="Are you sure?" type="danger" confirmText="Yes, Delete" />

      {/* EXPORT MODAL (KEPT EXACTLY AS YOU WANTED) */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered contentClassName="border-0 rounded-4 shadow-lg overflow-hidden">
        <div style={s.modalHeader}>
           <div className="d-flex align-items-center justify-content-between">
               <h5 className="fw-bold mb-0 d-flex align-items-center"><FiDownload className="me-2 text-primary-light" style={{color:'#93c5fd'}}/> Export Report</h5>
               <FiXCircle size={24} style={{cursor:'pointer', opacity:0.8}} onClick={() => setShowExportModal(false)}/>
           </div>
        </div>
        <div style={s.modalBody}>
           <div className="text-center mb-4">
              <div style={{width:'60px', height:'60px', borderRadius:'50%', background:'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px auto'}}>
                 <FiBox size={28} className="text-warning"/>
              </div>
              <h6 className="fw-bold text-dark">Download Egg Inventory</h6>
              <p className="text-muted small">Select a date range to generate a PDF report.</p>
           </div>
           <Row className="g-3 mb-4">
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">From Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-warning" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
                       <Form.Control type="date" value={exportRange.from} onChange={(e) => setExportRange({...exportRange, from: e.target.value})} style={{...s.modalInput, borderLeft:'none'}} />
                   </InputGroup>
               </Col>
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">To Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-warning" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
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
        <div><h4 className="fw-bold text-dark mb-1">Egg Production</h4><p className="text-muted small mb-0">Daily stock entry log.</p></div>
        <Button variant="outline-warning" className="text-dark" size="sm" onClick={openExportModal} style={{borderRadius:'10px', fontWeight:'600'}}><FiDownload className="me-2"/> Export Report</Button>
      </div>

      {/* STATS */}
      <Row className="g-3">
         <Col xs={12} md={4}>
            <div style={s.statCard('gold')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Total Stock ({selectedBranch})</p><h3 style={s.statValue}>{totalStock.toLocaleString()}</h3></div>
                  <FiLayers size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
         <Col xs={12} md={4}>
            <div style={s.statCard('blue')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Today's Entry</p><h3 style={s.statValue}>{todayStock.toLocaleString()}</h3></div>
                  <FiActivity size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
         <Col xs={12} md={4}>
            <div style={s.statCard('green')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Locations</p><h3 style={s.statValue}>{locations.length}</h3></div>
                  <FiMapPin size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
      </Row>

      {/* SPLIT LAYOUT */}
      <div style={s.mainContainer}>
         
         {/* LEFT: FORM */}
         <div style={s.formPanel}>
            <h6 className="fw-bold mb-4 d-flex align-items-center text-warning">
                <FiBox className="me-2 text-dark"/> {editingId ? 'Edit Entry' : 'New Stock Entry'}
                {selectedBranch !== 'All' && <Badge bg="dark" className="ms-2">{selectedBranch}</Badge>}
            </h6>
            <Form onSubmit={handleSubmit}>
               <div className="mb-3 p-2 bg-warning bg-opacity-10 rounded border border-warning">
                    <label className="small fw-bold text-dark mb-1">Entry Date</label>
                    <InputGroup>
                        <InputGroup.Text className="bg-white border-end-0 text-warning"><FiCalendar/></InputGroup.Text>
                        <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} className="border-start-0 fw-bold" required />
                    </InputGroup>
               </div>

               {/* CUSTOM DROPDOWN */}
               <div className="mb-3 position-relative" ref={dropdownRef}>
                  <label style={s.label}>Warehouse Location</label>
                  <div 
                      style={s.customSelect} 
                      onClick={() => setIsLocDropdownOpen(!isLocDropdownOpen)}
                  >
                      <span>{formData.location || "Select Warehouse"}</span>
                      <FiChevronDown className={`text-muted transition ${isLocDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isLocDropdownOpen && (
                      <div style={s.dropdownMenu} className="fade-in">
                          {locations.length === 0 ? (
                              <div className="p-2 text-center text-muted small">No locations configured.</div>
                          ) : (
                              locations.map((loc, idx) => (
                                  <div 
                                      key={idx} 
                                      style={s.dropdownItem(formData.location === loc)}
                                      onClick={() => handleLocationSelect(loc)}
                                      onMouseEnter={(e) => { if(formData.location !== loc) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                      onMouseLeave={(e) => { if(formData.location !== loc) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                      {loc}
                                      {formData.location === loc && <FiCheck size={16}/>}
                                  </div>
                              ))
                          )}
                          
                          {/* ✅ UPDATE: Added Admin 'Manage Locations' Link */}
                          {userRole === 'Admin' && (
                              <div className="border-top mt-1 pt-1">
                                 <small 
                                    className="d-block text-center text-primary fw-bold py-1" 
                                    style={{fontSize:'0.75rem', cursor:'pointer'}} 
                                    onClick={() => {
                                        if(setActiveTab) {
                                            setActiveTab('settings_inventory');
                                        }
                                    }}
                                 >
                                    + Manage Locations
                                 </small>
                              </div>
                          )}
                      </div>
                  )}
               </div>

               <div className="mb-3">
                  <label style={s.label} className="mb-2">Egg Quantity Breakdown</label>
                  <Row className="g-2">
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Tray (30)" name="inTray" value={formData.inTray} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Pack 30" name="pack30" value={formData.pack30} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Pack 10" name="pack10" value={formData.pack10} onChange={handleChange} style={s.input}/></Col>
                     <Col xs={6}><Form.Control size="sm" type="number" placeholder="Pack 6" name="pack06" value={formData.pack06} onChange={handleChange} style={s.input}/></Col>
                  </Row>
               </div>

               <div className="p-3 bg-light rounded-3 border text-center mb-3">
                  <small className="text-muted fw-bold text-uppercase ls-1">Calculated Total</small>
                  <h2 className="text-dark fw-bold mb-0 mt-1">{totalEggs.toLocaleString()} <span className="fs-6 text-muted">eggs</span></h2>
               </div>

               <div className="d-flex gap-2">
                  {editingId && <Button variant="outline-secondary" className="w-50" onClick={handleCancelEdit}>Cancel</Button>}
                  <Button type="submit" variant={editingId?"dark":"warning"} className={`w-100 py-3 fw-bold`} style={{borderRadius:'12px'}} disabled={submitLoading || locations.length === 0}>
                      {submitLoading ? 'Saving...' : (editingId ? 'Update Record' : <><FiCheckCircle className="me-2"/> Save Record</>)}
                  </Button>
               </div>
            </Form>
         </div>

         {/* RIGHT: LIST */}
         <div style={s.listPanel}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
               <h6 className="fw-bold mb-0">Production History</h6>
               <InputGroup size="sm" style={{width:'200px'}}><InputGroup.Text className="bg-white border-end-0"><FiSearch/></InputGroup.Text><Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="border-start-0" /></InputGroup>
            </div>

            <div style={{maxHeight:'600px', overflowY:'auto'}}>
               <Table hover responsive className="mb-0 align-middle">
                 <thead className="bg-light text-muted small sticky-top" style={{top:0}}>
                    <tr>
                        <th className="ps-4">Date</th>
                        <th>Location</th>
                        <th className="text-center">Trays</th>
                        <th className="text-center">Packs</th>
                        <th className="text-end pe-4">Total</th>
                        <th className="text-end pe-4">Act</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredList.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No records found for {selectedBranch}</p></td></tr>
                    ) : (
                        filteredList.map((item) => (
                            <tr key={item.id} style={{ fontSize: '0.9rem' }}>
                                <td className="ps-4 fw-bold text-dark">{item.date}</td>
                                <td><Badge bg="light" text="dark" className="border fw-normal">{item.location}</Badge></td>
                                <td className="text-center text-muted">{item.inTray || '-'}</td>
                                <td className="text-center small text-muted">
                                    {item.pack30 || '-'} / {item.pack10 || '-'} / {item.pack06 || '-'}
                                </td>
                                <td className="text-end pe-4 fw-bold text-warning text-dark">{Number(item.totalEggs).toLocaleString()}</td>
                                <td className="text-end pe-4">
                                    <Button variant="link" className="text-primary p-0 me-2" onClick={() => handleEdit(item)}><FiEdit/></Button>
                                    <Button variant="link" className="text-danger p-0" onClick={() => handleDeleteClick(item.id)}><FiTrash2/></Button>
                                </td>
                            </tr>
                        ))
                    )}
                 </tbody>
               </Table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EggInventory;