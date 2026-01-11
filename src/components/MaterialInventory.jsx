import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge, Table, Modal } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiPackage, FiTool, FiCalendar, 
  FiLayers, FiTrash2, FiSave, FiArchive, FiX, FiEdit, FiActivity, 
  FiCheckCircle, FiXCircle, FiChevronDown, FiCheck 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, where, deleteDoc, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

const MaterialInventory = ({ selectedBranch, setActiveTab, userRole }) => {
  const [itemOptions, setItemOptions] = useState([]); 
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchList, setBatchList] = useState([]); 
  const [currentEntry, setCurrentEntry] = useState({ 
    itemName: '', variant: '', category: 'Consumable', quantity: '', unit: 'Nos' 
  });
  
  const [currentVariants, setCurrentVariants] = useState([]); 
  
  // --- Custom Dropdown States ---
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false); // New for Category
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false); // New for Unit
  
  // Refs for click outside
  const dropdownRef = useRef(null); // Item Ref
  const catDropdownRef = useRef(null); // Category Ref
  const unitDropdownRef = useRef(null); // Unit Ref

  const [editingDateMode, setEditingDateMode] = useState(false); 
  const [originalBatchIds, setOriginalBatchIds] = useState([]);
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
    
    // Close dropdowns on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsItemDropdownOpen(false);
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target)) setIsCatDropdownOpen(false);
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) setIsUnitDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "settings_items"));
        const items = querySnapshot.docs.map(doc => doc.data());
        setItemOptions(items);
      } catch (err) { console.error(err); }
    };
    fetchItems();

    let q;
    if (selectedBranch === 'All') {
        q = query(collection(db, "material_inventory"), orderBy("date", "desc"));
    } else {
        q = query(
            collection(db, "material_inventory"), 
            where("branch", "==", selectedBranch), 
            orderBy("date", "desc")
        );
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInventoryList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setLoading(false));
    return () => unsubscribe();
  }, [selectedBranch]);

  // Handlers
  const handleCustomItemSelect = (selectedName) => {
    const itemData = itemOptions.find(i => i.name === selectedName);
    if (itemData) {
        setCurrentEntry({ 
            ...currentEntry, 
            itemName: selectedName, 
            category: itemData.category || 'Consumable', 
            unit: itemData.unit || 'Nos',
            variant: '' 
        });
        setCurrentVariants(itemData.variants || []);
    } else {
        setCurrentEntry({ ...currentEntry, itemName: selectedName, variant: '' });
        setCurrentVariants([]);
    }
    setIsItemDropdownOpen(false);
  };

  const handleCategorySelect = (val) => {
      setCurrentEntry({ ...currentEntry, category: val });
      setIsCatDropdownOpen(false);
  };

  const handleUnitSelect = (val) => {
      setCurrentEntry({ ...currentEntry, unit: val });
      setIsUnitDropdownOpen(false);
  };
  
  const handleEntryChange = (e) => setCurrentEntry({ ...currentEntry, [e.target.name]: e.target.value });
  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const addToBatch = (e) => {
      e.preventDefault();
      if (!currentEntry.itemName) return showToast("Please select an Item Name.", "warning");
      if (!currentEntry.quantity) return showToast("Please enter Quantity.", "warning");

      const newItem = { ...currentEntry, id: Date.now() }; 
      setBatchList([...batchList, newItem]);
      setCurrentEntry(prev => ({ ...prev, itemName: '', variant: '', quantity: '' }));
      setCurrentVariants([]);
  };

  const removeFromBatch = (id) => {
      setBatchList(batchList.filter(item => item.id !== id));
  };

  const handleEditDateBatch = (date, items) => {
      setEditingDateMode(true);
      setBatchDate(date);
      const formattedItems = items.map(item => ({
          id: item.id, 
          itemName: item.baseItemName || item.itemName.split(' (')[0], 
          variant: item.variant || '',
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          isExisting: true 
      }));
      setBatchList(formattedItems);
      setOriginalBatchIds(items.map(i => i.id)); 
      window.scrollTo(0, 0); 
  };

  const handleCancelEdit = () => {
      setEditingDateMode(false);
      setBatchDate(new Date().toISOString().split('T')[0]);
      setBatchList([]);
      setOriginalBatchIds([]);
      setCurrentEntry({ itemName: '', variant: '', category: 'Consumable', quantity: '', unit: 'Nos' });
  };

  const handleFinalSubmit = async () => {
    if (batchList.length === 0) return showToast("List is empty! Add items first.", "warning");
    
    const branchToSave = selectedBranch === 'All' ? 'Delhi' : selectedBranch;

    setSubmitLoading(true);
    try {
        const batch = writeBatch(db); 
        if (editingDateMode) {
            const currentIds = batchList.map(i => i.id);
            const toDelete = originalBatchIds.filter(id => !currentIds.includes(id));
            toDelete.forEach(id => { const docRef = doc(db, "material_inventory", id); batch.delete(docRef); });

            batchList.forEach(item => {
                const finalName = item.variant ? `${item.itemName} (${item.variant})` : item.itemName;
                const docData = {
                    date: batchDate, 
                    itemName: finalName, 
                    baseItemName: item.itemName, 
                    variant: item.variant || '',
                    category: item.category, 
                    quantity: item.quantity, 
                    unit: item.unit, 
                    branch: branchToSave,
                    timestamp: serverTimestamp()
                };
                if (item.isExisting) { const docRef = doc(db, "material_inventory", item.id); batch.update(docRef, docData); } 
                else { const newDocRef = doc(collection(db, "material_inventory")); batch.set(newDocRef, docData); }
            });
            await batch.commit(); 
            showToast("Batch updated successfully!", "success"); 
            handleCancelEdit();
        } else {
            const promises = batchList.map(item => {
                 const finalName = item.variant ? `${item.itemName} (${item.variant})` : item.itemName;
                 return addDoc(collection(db, "material_inventory"), { 
                     date: batchDate, 
                     itemName: finalName, 
                     baseItemName: item.itemName, 
                     variant: item.variant || '',
                     category: item.category, 
                     quantity: item.quantity, 
                     unit: item.unit, 
                     branch: branchToSave,
                     timestamp: serverTimestamp() 
                 });
            });
            await Promise.all(promises); 
            setBatchList([]); 
            showToast(`Items saved to ${branchToSave}!`, "success");
        }
    } catch(err) { console.error(err); showToast("Error saving data.", "error"); }
    setSubmitLoading(false);
  };

  const handleDeleteItem = (id) => { setDeleteId(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
      if (deleteId) {
        await deleteDoc(doc(db, "material_inventory", deleteId));
        setShowDeleteModal(false);
        showToast("Item deleted successfully.", "error");
      }
  };

  // --- PDF EXPORT ---
  const filteredList = inventoryList.filter(item => 
    (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedInventory = filteredList.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
  }, {});
  const sortedDates = Object.keys(groupedInventory).sort((a, b) => new Date(b) - new Date(a));

  const openExportModal = () => setShowExportModal(true);

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
    doc.setFontSize(18); doc.setTextColor(13, 110, 253); doc.setFont("helvetica", "bold");
    doc.text("Happinest Poultry Products Pvt. Ltd.", 42, 18);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text(`Asset & Material Inventory (${selectedBranch === 'All' ? 'Total' : selectedBranch})`, 42, 24);

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
       tableBody.push([{ content: `BATCH DATE: ${date} (${items.length} Items)`, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [50, 50, 50] } }]);
       items.forEach(item => tableBody.push([item.itemName, item.category, item.quantity, item.unit]));
    });

    autoTable(doc, { 
        startY: 40, head: [["Item Description", "Category", "Qty", "Unit"]], body: tableBody, theme: 'plain',
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' }
    });

    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8); doc.setTextColor(100); doc.text("System Generated Report by BioCore ERP", 14, footerY);

    doc.save(`Material_Report_${titlePeriod.replace(/\s/g, '_')}.pdf`);
  };

  const handleExportConfirm = (type) => {
      let finalData = [];
      let title = "";
      if (type === 'all') { finalData = inventoryList; title = "All_Time_Records"; } 
      else { finalData = inventoryList.filter(item => item.date >= exportRange.from && item.date <= exportRange.to); title = `${exportRange.from}_to_${exportRange.to}`; }

      if (finalData.length === 0) { showToast("No records found.", "warning"); } 
      else { generatePDF(finalData, title); setShowExportModal(false); showToast("Report downloading...", "success"); }
  };

  if (loading) return <Loader text={`Loading ${selectedBranch} Inventory...`} />;

  // --- STYLES ---
  const s = {
    page: { 
        maxWidth: '100%', 
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // ✅ Smooth Resize
    },
    statCard: (color) => ({
      borderRadius: '20px', padding: '25px', position: 'relative', overflow: 'hidden', color: 'white',
      background: color === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                  color === 'orange' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
    
    // --- Custom Dropdown Styles ---
    customSelect: {
        width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0',
        backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '0.95rem', color: '#334155', fontWeight: '500'
    },
    dropdownMenu: {
        position: 'absolute', top: '105%', left: 0, width: '100%', backgroundColor: 'white',
        borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9',
        padding: '5px', zIndex: 100, maxHeight: '250px', overflowY: 'auto'
    },
    dropdownItem: (active) => ({
        padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: active ? '#fff7ed' : 'transparent', color: active ? '#ea580c' : '#475569', fontWeight: active ? '600' : '500', fontSize: '0.9rem', marginBottom: '2px', transition: 'all 0.2s'
    }),

    // ✅ ORIGINAL PRO MODAL STYLES PRESERVED
    modalHeader: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px 25px' },
    modalBody: { padding: '30px' },
    modalInput: { borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 15px', fontWeight: 'bold' },
    btnPrimary: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' },
    btnDark: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600' }
  };

  const totalItems = filteredList.length;
  const totalAssets = filteredList.filter(i => i.category === 'Asset').length;
  const totalConsumables = filteredList.filter(i => i.category === 'Consumable').length;

  return (
    <div className="fade-in" style={s.page}>
      
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} title="Delete Item?" message="Are you sure?" type="danger" confirmText="Yes, Delete" />

      {/* EXPORT MODAL (PRO DESIGN) */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered contentClassName="border-0 rounded-4 shadow-lg overflow-hidden">
        <div style={s.modalHeader}>
           <div className="d-flex align-items-center justify-content-between">
               <h5 className="fw-bold mb-0 d-flex align-items-center"><FiDownload className="me-2 text-primary-light" style={{color:'#93c5fd'}}/> Export Report</h5>
               <FiXCircle size={24} style={{cursor:'pointer', opacity:0.8}} onClick={() => setShowExportModal(false)}/>
           </div>
        </div>
        <div style={s.modalBody}>
           <div className="text-center mb-4">
              <div style={{width:'60px', height:'60px', borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px auto'}}>
                 <FiPackage size={28} className="text-primary"/>
              </div>
              <h6 className="fw-bold text-dark">Download Material Log</h6>
              <p className="text-muted small">Select a date range to generate a PDF report.</p>
           </div>
           <Row className="g-3 mb-4">
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">From Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-primary" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
                       <Form.Control type="date" value={exportRange.from} onChange={(e) => setExportRange({...exportRange, from: e.target.value})} style={{...s.modalInput, borderLeft:'none'}} />
                   </InputGroup>
               </Col>
               <Col xs={6}>
                   <label className="small fw-bold text-muted mb-1 ms-1">To Date</label>
                   <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-primary" style={{borderTopLeftRadius:'12px', borderBottomLeftRadius:'12px'}}><FiCalendar/></InputGroup.Text>
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
        <div><h4 className="fw-bold text-dark mb-1">Stock & Assets</h4><p className="text-muted small mb-0">Manage material inventory logs.</p></div>
        <Button variant="outline-primary" size="sm" onClick={openExportModal} className="fw-bold" style={{borderRadius:'10px', padding:'8px 15px'}}><FiDownload className="me-2"/> Export Data</Button>
      </div>

      {/* 1. HUD STATS */}
      <Row className="g-3">
         <Col xs={12} md={4}><div style={s.statCard('blue')}><p style={s.statLabel}>Total Entries ({selectedBranch})</p><h3 style={s.statValue}>{totalItems}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('orange')}><p style={s.statLabel}>Materials</p><h3 style={s.statValue}>{totalConsumables}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('green')}><p style={s.statLabel}>Fixed Assets</p><h3 style={s.statValue}>{totalAssets}</h3></div></Col>
      </Row>

      {/* 2. SPLIT LAYOUT */}
      <div style={s.mainContainer}>
         
         {/* LEFT: FORM */}
         <div style={s.formPanel}>
            <h6 className="fw-bold mb-4 d-flex align-items-center">
               {editingDateMode ? <FiEdit className="me-2 text-warning"/> : <FiActivity className="me-2 text-primary"/>} 
               {editingDateMode ? 'Edit Batch' : 'New Stock Entry'}
               {selectedBranch !== 'All' && <Badge bg="dark" className="ms-2">{selectedBranch}</Badge>}
            </h6>
            
            <Form onSubmit={addToBatch}>
               <div className="mb-3 p-2 bg-light rounded border">
                    <label className="small fw-bold text-muted mb-1">Entry Date</label>
                    <InputGroup>
                        <InputGroup.Text className="bg-white border-end-0 text-muted"><FiCalendar/></InputGroup.Text>
                        <Form.Control type="date" value={batchDate} onChange={(e)=>setBatchDate(e.target.value)} className="border-start-0 fw-bold" required />
                    </InputGroup>
               </div>

               {/* ✅ 1. CUSTOM ITEM DROPDOWN */}
               <div className="mb-3 position-relative" ref={dropdownRef}>
                  <label style={s.label}>Select Item</label>
                  <div style={s.customSelect} onClick={() => setIsItemDropdownOpen(!isItemDropdownOpen)}>
                      <span>{currentEntry.itemName || "-- Choose Item --"}</span>
                      <FiChevronDown className={`text-muted transition ${isItemDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isItemDropdownOpen && (
                      <div style={s.dropdownMenu} className="fade-in">
                          {itemOptions.length === 0 ? <div className="p-2 text-muted small">No items configured.</div> : 
                              itemOptions.map((opt, idx) => (
                                  <div key={idx} style={s.dropdownItem(currentEntry.itemName === opt.name)} onClick={() => handleCustomItemSelect(opt.name)}>
                                      {opt.name} {currentEntry.itemName === opt.name && <FiCheck size={16}/>}
                                  </div>
                              ))
                          }
                          <div style={s.dropdownItem(currentEntry.itemName === 'Other')} onClick={() => handleCustomItemSelect('Other')} className="border-top">
                              <span className="fst-italic text-muted">Other (Manual)</span> {currentEntry.itemName === 'Other' && <FiCheck size={16}/>}
                          </div>
                          {userRole === 'Admin' && (
                              <div className="border-top mt-1 pt-1">
                                 <small className="d-block text-center text-primary fw-bold py-1" style={{fontSize:'0.75rem', cursor:'pointer'}} onClick={() => { if(setActiveTab) setActiveTab('settings_inventory'); }}>+ Manage Items</small>
                              </div>
                          )}
                      </div>
                  )}
               </div>
               
               {currentVariants.length > 0 && (
                   <div className="mb-3 p-2 bg-warning bg-opacity-10 rounded border border-warning">
                       <label style={s.label} className="text-dark">Select Type/Variant</label>
                       <Form.Select name="variant" value={currentEntry.variant} onChange={handleEntryChange} style={s.input} required>
                          <option value="">-- Select Type --</option>
                          {currentVariants.map((v, idx) => <option key={idx} value={v}>{v}</option>)}
                       </Form.Select>
                   </div>
               )}

               <Row className="g-2 mb-3">
                  {/* ✅ 2. CUSTOM CATEGORY DROPDOWN */}
                  <Col xs={6}>
                      <div className="position-relative" ref={catDropdownRef}>
                          <label style={s.label}>Category</label>
                          <div style={s.customSelect} onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}>
                              <span>{currentEntry.category === 'Consumable' ? 'Material' : 'Asset'}</span>
                              <FiChevronDown className={`text-muted transition ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>
                          {isCatDropdownOpen && (
                              <div style={s.dropdownMenu} className="fade-in">
                                  <div style={s.dropdownItem(currentEntry.category === 'Consumable')} onClick={() => handleCategorySelect('Consumable')}>Material (Consumable)</div>
                                  <div style={s.dropdownItem(currentEntry.category === 'Asset')} onClick={() => handleCategorySelect('Asset')}>Asset (Fixed)</div>
                              </div>
                          )}
                      </div>
                  </Col>

                  {/* ✅ 3. CUSTOM UNIT DROPDOWN */}
                  <Col xs={6}>
                      <div className="position-relative" ref={unitDropdownRef}>
                          <label style={s.label}>Unit</label>
                          <div style={s.customSelect} onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}>
                              <span>{currentEntry.unit}</span>
                              <FiChevronDown className={`text-muted transition ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>
                          {isUnitDropdownOpen && (
                              <div style={s.dropdownMenu} className="fade-in">
                                  {['Nos', 'Bdl', 'Kg', 'Box', 'Ltr'].map(u => (
                                      <div key={u} style={s.dropdownItem(currentEntry.unit === u)} onClick={() => handleUnitSelect(u)}>{u}</div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </Col>
               </Row>

               <div className="mb-3"><label style={s.label}>Quantity</label>
                  <div className="d-flex gap-2">
                      <Form.Control type="number" name="quantity" value={currentEntry.quantity} onChange={handleEntryChange} placeholder="0.00" style={s.input} required />
                      <Button type="submit" variant="primary" style={{borderRadius:'10px', minWidth:'50px'}} title="Add to Batch"><FiPlus/></Button>
                  </div>
               </div>
            </Form>

            {/* Batch List */}
            <div className="flex-grow-1 overflow-auto mb-3 border rounded p-2 bg-light" style={{ maxHeight: '200px' }}>
                 {batchList.length === 0 ? <div className="text-center text-muted small fst-italic py-3">Batch is empty...</div> : (
                    batchList.map((item) => (
                        <div key={item.id} className="d-flex justify-content-between align-items-center p-2 border-bottom bg-white mb-1 rounded shadow-sm">
                            <div style={{fontSize:'0.85rem', fontWeight:'600'}}>
                                {item.itemName} {item.variant ? <span className="text-primary">({item.variant})</span> : ''}
                                <span className="text-muted fw-normal ms-1">({item.quantity} {item.unit})</span>
                            </div>
                            <FiX className="text-danger cursor-pointer" onClick={()=>removeFromBatch(item.id)}/>
                        </div>
                    ))
                 )}
            </div>

            {editingDateMode ? (
               <div className="d-flex gap-2"><Button variant="outline-secondary" className="w-50" onClick={handleCancelEdit}>Cancel</Button><Button onClick={handleFinalSubmit} variant="warning" className="w-50 fw-bold" disabled={submitLoading || batchList.length === 0}>{submitLoading ? 'Updating...' : 'Update'}</Button></div>
            ) : (
               <Button onClick={handleFinalSubmit} variant="primary" className="w-100 py-2 fw-bold" disabled={submitLoading || batchList.length === 0}>{submitLoading ? 'Saving...' : <><FiSave className="me-2"/> Save Batch</>}</Button>
            )}
         </div>

         {/* RIGHT: LIST */}
         <div style={s.listPanel}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
               <h6 className="fw-bold mb-0">Log History</h6>
               <InputGroup size="sm" style={{width:'180px'}}><InputGroup.Text className="bg-white border-end-0"><FiSearch/></InputGroup.Text><Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="border-start-0" /></InputGroup>
            </div>

            <div style={{maxHeight:'600px', overflowY:'auto'}}>
               <Table hover responsive className="mb-0 align-middle">
                 <thead className="bg-light text-muted small sticky-top" style={{top:0}}><tr><th className="ps-4">Date</th><th>Item</th><th>Type</th><th className="text-center">Qty</th><th className="text-end pe-4">Act</th></tr></thead>
                 <tbody>
                    {sortedDates.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No records found for {selectedBranch}</p></td></tr>
                    ) : (
                        sortedDates.map((date) => {
                            const items = groupedInventory[date];
                            return (
                                <React.Fragment key={date}>
                                    {items.map((item, index) => (
                                        <tr key={item.id} style={{ fontSize: '0.9rem' }}>
                                            {index === 0 && (
                                                <td rowSpan={items.length} className="ps-4 align-top bg-white border-end pt-3">
                                                    <div className="fw-bold text-dark">{date}</div>
                                                    <Button variant="outline-primary" size="sm" className="py-0 px-2 mt-1" style={{fontSize: '0.7rem'}} onClick={() => handleEditDateBatch(date, items)} disabled={editingDateMode}>Edit</Button>
                                                </td>
                                            )}
                                            <td><div className="fw-bold text-dark">{item.itemName}</div></td>
                                            <td>{item.category === 'Asset' ? <Badge bg="info" text="dark">Asset</Badge> : <Badge bg="warning" text="dark">Mat</Badge>}</td>
                                            <td className="text-center fw-bold">{item.quantity} {item.unit}</td>
                                            <td className="text-end pe-4"><FiTrash2 className="text-danger cursor-pointer opacity-50 hover-opacity-100" onClick={() => handleDeleteItem(item.id)}/></td>
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

export default MaterialInventory;