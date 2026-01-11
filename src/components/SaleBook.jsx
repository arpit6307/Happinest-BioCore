import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Table, Badge, InputGroup, Modal } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiTruck, FiCalendar, 
  FiArrowRight, FiTrash2, FiXCircle, FiSave, FiEdit, FiArchive, FiFileText, 
  FiCheckCircle, FiChevronDown, FiCheck, FiMapPin, FiSettings 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, where, deleteDoc, doc, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { format } from 'date-fns';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

const SaleBook = ({ selectedBranch, setActiveTab, userRole }) => {
  const [sales, setSales] = useState([]);
  const [sourceLocs, setSourceLocs] = useState([]); 
  const [destLocs, setDestLocs] = useState([]);     
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState([{
      id: 1, 
      sourceLocation: '', destinationLocation: '', description: '',
      ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '',
      recPack30: '', recPack10: '', recPack06: '',
      disposeEggs: '', returnedFarm: '', returnedNRGP: ''
  }]);
  const [uiStats, setUiStats] = useState({ totalEggs: 0 });

  const [openDropdowns, setOpenDropdowns] = useState({}); 
  const dropdownRefs = useRef({});

  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState({
    from: format(new Date(), 'yyyy-MM-01'), 
    to: format(new Date(), 'yyyy-MM-dd')    
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-select-container')) {
          setOpenDropdowns({});
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
    const fetchData = async () => {
        try {
            const srcSnap = await getDocs(collection(db, "settings_dispatch_from"));
            setSourceLocs(srcSnap.docs.map(d => d.data().name));
            const destSnap = await getDocs(collection(db, "settings_dispatch_to"));
            setDestLocs(destSnap.docs.map(d => d.data().name));
        } catch (e) { console.error(e); }
    };
    fetchData();

    let q;
    if (selectedBranch === 'All') {
        q = query(collection(db, "sale_book"), orderBy("date", "desc"));
    } else {
        q = query(
            collection(db, "sale_book"), 
            where("branch", "==", selectedBranch), 
            orderBy("date", "desc")
        );
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsubscribe();
  }, [selectedBranch]);

  useEffect(() => {
    let total = 0;
    rows.forEach(r => {
        const val = (v) => isNaN(Number(v)) ? 0 : Number(v);
        total += (val(r.ordPack30)*30) + (val(r.ordPack10)*10) + (val(r.ordPack06)*6) + val(r.ordDamage);
    });
    setUiStats({ totalEggs: total });
  }, [rows]);

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const handleAddRow = () => {
      setRows([...rows, {
          id: Date.now(), 
          sourceLocation: '', destinationLocation: '', description: '',
          ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '',
          recPack30: '', recPack10: '', recPack06: '',
          disposeEggs: '', returnedFarm: '', returnedNRGP: ''
      }]);
  };

  const handleRemoveRow = (id) => {
      if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
      else showToast("At least one trip entry is required.", "warning");
  };

  const handleInputChange = (id, field, value) => {
      setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const toggleDropdown = (rowId, type) => {
      setOpenDropdowns({ [`${rowId}-${type}`]: !openDropdowns[`${rowId}-${type}`] });
  };

  const handleDropdownSelect = (rowId, field, value) => {
      handleInputChange(rowId, field, value);
      setOpenDropdowns({}); 
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
        let batchTotalOrder = 0;
        let batchTotalShort = 0;
        const processedDeliveries = [];

        for (let r of rows) {
            if (!r.sourceLocation || !r.destinationLocation) {
                showToast("Please select Source and Destination for all trips.", "warning");
                setSubmitLoading(false); return;
            }
            const num = (v) => (v === '' || v === undefined || isNaN(Number(v))) ? 0 : Number(v);
            const str = (v) => (v === undefined || v === null) ? '' : String(v);

            const totalOrder = (num(r.ordPack30)*30) + (num(r.ordPack10)*10) + (num(r.ordPack06)*6) + num(r.ordDamage);
            const totalReceived = (num(r.recPack30)*30) + (num(r.recPack10)*10) + (num(r.recPack06)*6);
            
            const sP30 = num(r.ordPack30) - num(r.recPack30);
            const sP10 = num(r.ordPack10) - num(r.recPack10);
            const sP06 = num(r.ordPack06) - num(r.recPack06);
            const totalShort = (sP30 * 30) + (sP10 * 10) + (sP06 * 6);

            batchTotalOrder += totalOrder;
            batchTotalShort += totalShort;

            processedDeliveries.push({
                sourceLocation: str(r.sourceLocation), destinationLocation: str(r.destinationLocation), description: str(r.description),
                ordPack30: num(r.ordPack30), ordPack10: num(r.ordPack10), ordPack06: num(r.ordPack06), ordDamage: num(r.ordDamage),
                recPack30: num(r.recPack30), recPack10: num(r.recPack10), recPack06: num(r.recPack06),
                disposeEggs: num(r.disposeEggs), returnedFarm: num(r.returnedFarm), returnedNRGP: num(r.returnedNRGP),
                totalOrderEggs: totalOrder, totalReceivedEggs: totalReceived, totalShortEggs: totalShort,
                calcShortP30: sP30, calcShortP10: sP10, calcShortP06: sP06
            });
        }

        const branchToSave = selectedBranch === 'All' ? 'Delhi' : selectedBranch;

        const dataToSave = {
            date: entryDate, 
            grandTotalOrder: batchTotalOrder, 
            grandTotalShort: batchTotalShort,
            deliveries: processedDeliveries, 
            branch: branchToSave,
            timestamp: serverTimestamp()
        };

        if (editingId) {
            await updateDoc(doc(db, "sale_book", editingId), dataToSave);
            setEditingId(null);
            showToast("Dispatch updated successfully!", "success");
        } else {
            await addDoc(collection(db, "sale_book"), dataToSave);
            showToast(`Dispatch saved to ${branchToSave} Branch!`, "success");
        }
        handleCancelEdit(); 
    } catch (error) { showToast("Error saving dispatch data.", "error"); console.error(error); }
    setSubmitLoading(false);
  };

  const handleEdit = (entry) => {
      setEntryDate(entry.date);
      setRows(entry.deliveries.map((d, index) => ({ ...d, id: Date.now() + index })));
      setEditingId(entry.id);
      if(isMobile) window.scrollTo(0,0);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setRows([{
          id: Date.now(), 
          sourceLocation: '', destinationLocation: '', description: '',
          ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '',
          recPack30: '', recPack10: '', recPack06: '',
          disposeEggs: '', returnedFarm: '', returnedNRGP: ''
      }]);
  };

  const handleDeleteClick = (id) => { setDeleteId(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
      if (deleteId) {
        await deleteDoc(doc(db, "sale_book", deleteId));
        setShowDeleteModal(false);
        showToast("Dispatch entry deleted.", "error");
      }
  };

  const filteredList = sales.filter(item => {
      if(!item.deliveries) return false;
      return item.deliveries.some(d => 
        (d.sourceLocation && d.sourceLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.destinationLocation && d.destinationLocation.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  });

  const openExportModal = () => setShowExportModal(true);

  // --- PDF EXPORT Logic ---
  const generatePDF = async (dataList, titlePeriod) => {
    const doc = new jsPDF('landscape');
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
    doc.text(`Dispatch Register (${selectedBranch === 'All' ? 'All Branches' : selectedBranch})`, 42, 24);
    
    doc.setFontSize(9); doc.setTextColor(50);
    doc.text(`Period: ${titlePeriod}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 23, { align: 'right' });
    
    doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(14, 35, pageWidth - 14, 35); 

    let tableRows = [];
    dataList.forEach(entry => {
        if(entry.deliveries){
            entry.deliveries.forEach((d, index) => {
                let shortText = [];
                if(d.calcShortP30 > 0) shortText.push(`${d.calcShortP30} T30`);
                if(d.calcShortP10 > 0) shortText.push(`${d.calcShortP10} B10`);
                if(d.calcShortP06 > 0) shortText.push(`${d.calcShortP06} B06`);
                
                const totalShortVal = Number(d.totalShortEggs || 0).toLocaleString();
                const shortDisplay = shortText.length > 0 ? shortText.join(', ') : 'OK';

                const sentTotal = Number(d.totalOrderEggs).toLocaleString();
                const sentDetails = `T30:${d.ordPack30}|B10:${d.ordPack10}|B06:${d.ordPack06}|L:${d.ordDamage}`;
                
                const recvTotal = Number(d.totalReceivedEggs).toLocaleString();
                const recvDetails = `T30:${d.recPack30}|B10:${d.recPack10}|B06:${d.recPack06}`;

                tableRows.push([
                    index === 0 ? entry.date : '', 
                    `${d.sourceLocation} -> ${d.destinationLocation}`,
                    d.description || '-',
                    `Total: ${sentTotal}\n${sentDetails}`,
                    `Total: ${recvTotal}\n${recvDetails}`,
                    `Total: ${totalShortVal}\n${shortDisplay}`,
                    `D:${d.disposeEggs} | F:${d.returnedFarm}`
                ]);
            });
        }
    });

    autoTable(doc, {
        startY: 40,
        head: [["Date", "Route", "Description", "Sent (Total & Packs)", "Recv (Total & Packs)", "Shortage", "Returns"]],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, valign: 'middle', cellPadding: 2, lineColor: 220, lineWidth: 0.1 },
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 
            0: { cellWidth: 22, fontStyle: 'bold' }, 
            1: { cellWidth: 35 }, 
            3: { halign: 'left' }, 
            4: { halign: 'left' }, 
            5: { textColor: [220, 53, 69] } 
        }
    });
    doc.save(`Dispatch_Report_${titlePeriod}.pdf`);
  };

  const handleExportConfirm = (type) => {
      let finalData = [];
      let title = "";
      if (type === 'all') { finalData = sales; title = "All_Time_Records"; } 
      else { finalData = sales.filter(item => item.date >= exportRange.from && item.date <= exportRange.to); title = `${exportRange.from}_to_${exportRange.to}`; }

      if (finalData.length === 0) { showToast("No records found.", "warning"); } 
      else { generatePDF(finalData, title); setShowExportModal(false); showToast("Report downloading...", "success"); }
  };

  if (loading) return <Loader text={`Loading ${selectedBranch} Sales...`} />;

  const getShortageBadge = (d) => {
      if (d.calcShortP30 <= 0 && d.calcShortP10 <= 0 && d.calcShortP06 <= 0) return <Badge bg="success" className="bg-opacity-25 text-success border border-success px-2">Perfect</Badge>;
      return (
          <div className="d-flex flex-column gap-1">
              {d.calcShortP30>0 && <Badge bg="danger" className="text-start">Short: {d.calcShortP30} T</Badge>}
              {d.calcShortP10>0 && <Badge bg="danger" className="text-start">Short: {d.calcShortP10} B10</Badge>}
              {d.calcShortP06>0 && <Badge bg="danger" className="text-start">Short: {d.calcShortP06} B06</Badge>}
          </div>
      );
  };

  const totalTrips = sales.reduce((acc, curr) => acc + (curr.deliveries ? curr.deliveries.length : 0), 0);
  const totalSent = sales.reduce((acc, curr) => acc + Number(curr.grandTotalOrder || 0), 0);
  const totalShort = sales.reduce((acc, curr) => acc + Number(curr.grandTotalShort || 0), 0);

  // --- UPDATED STYLES FOR SMOOTH RESIZING ---
  const s = {
    page: { 
        maxWidth: '100%', 
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // ✅ Smooth Resize Added
    },
    statCard: (color) => ({
      borderRadius: '20px', padding: '25px', position: 'relative', overflow: 'hidden', color: 'white',
      background: color === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                  color === 'green' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                  'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
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
    
    // ✅ List Panel: Takes Remaining Space (Grows when sidebar collapses)
    listPanel: { 
        flex: 1, 
        width: '100%', backgroundColor: 'white', borderRadius: '24px', padding: '0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        minHeight: '500px', overflow: 'hidden',
        transition: 'all 0.3s ease' // ✅ Smooth Resize
    },
    
    input: { borderRadius: '10px', padding: '8px 12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', backgroundColor:'#fdfdfd' },
    customSelect: {
        width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0',
        backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '0.9rem', color: '#334155', fontWeight: '500', minHeight: '38px'
    },
    dropdownMenu: {
        position: 'absolute', top: '105%', left: 0, width: '100%', backgroundColor: 'white',
        borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9',
        padding: '5px', zIndex: 100, maxHeight: '200px', overflowY: 'auto'
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

  return (
    <div className="fade-in" style={s.page}>
      
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} title="Delete Dispatch Entry?" message="This will remove the entire day's dispatch log. Are you sure?" type="danger" confirmText="Yes, Delete Log" />

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
              <div style={{width:'60px', height:'60px', borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px auto'}}>
                 <FiFileText size={28} className="text-primary"/>
              </div>
              <h6 className="fw-bold text-dark">Download Dispatch Log</h6>
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
        <div><h4 className="fw-bold text-dark mb-1">Sale Book & Dispatch</h4><p className="text-muted small mb-0">Track Trays (30) and Boxes (10/06).</p></div>
        <Button variant="outline-primary" size="sm" onClick={openExportModal} className="fw-bold" style={{borderRadius:'10px', padding:'8px 15px'}}><FiDownload className="me-2"/> Export PDF</Button>
      </div>

      {/* STATS */}
      <Row className="g-3">
         <Col xs={12} md={4}><div style={s.statCard('blue')}><p style={s.statLabel}>Total Trips ({selectedBranch})</p><h3 style={s.statValue}>{totalTrips}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('green')}><p style={s.statLabel}>Eggs Sent</p><h3 style={s.statValue}>{totalSent.toLocaleString()}</h3></div></Col>
         <Col xs={12} md={4}><div style={s.statCard('red')}><p style={s.statLabel}>Total Shortage</p><h3 style={s.statValue}>{totalShort.toLocaleString()}</h3></div></Col>
      </Row>

      {/* MAIN FORM */}
      <div style={s.mainContainer}>
         
         {/* LEFT: FORM */}
         <div style={s.formPanel}>
            <h6 className="fw-bold mb-4 d-flex align-items-center text-primary">
               {editingId ? <FiEdit className="me-2"/> : <FiTruck className="me-2"/>} {editingId ? 'Edit Dispatch' : 'New Dispatch'}
               {selectedBranch !== 'All' && <Badge bg="dark" className="ms-2">{selectedBranch}</Badge>}
            </h6>
            
            <Form onSubmit={handleSubmit}>
               <div className="mb-3 p-2 bg-light rounded border">
                    <label className="small fw-bold text-muted mb-1">Dispatch Date</label>
                    <InputGroup><InputGroup.Text className="bg-white border-end-0 text-primary"><FiCalendar/></InputGroup.Text><Form.Control type="date" value={entryDate} onChange={(e)=>setEntryDate(e.target.value)} className="border-start-0 fw-bold" required /></InputGroup>
               </div>

               {/* Dynamic Rows */}
               <div style={{maxHeight: '500px', overflowY: 'auto', paddingRight: '5px'}}>
                   {rows.map((row, index) => (
                       <div key={row.id} className="bg-white p-3 rounded border mb-3 shadow-sm custom-select-container" style={{borderLeft: '4px solid #3b82f6'}}>
                           <div className="d-flex justify-content-between align-items-center mb-2">
                               <Badge bg="dark">Trip #{index + 1}</Badge>
                               {rows.length > 1 && <FiXCircle className="text-danger cursor-pointer" onClick={() => handleRemoveRow(row.id)}/>}
                           </div>
                           
                           {/* --- CUSTOM SOURCE & DESTINATION DROPDOWNS --- */}
                           <div className="d-flex gap-2 mb-2">
                                <div className="w-50 position-relative">
                                    <div style={s.customSelect} onClick={() => toggleDropdown(row.id, 'source')}>
                                        <span className="text-truncate">{row.sourceLocation || "Source"}</span>
                                        <FiChevronDown size={14} className="text-muted" />
                                    </div>
                                    {openDropdowns[`${row.id}-source`] && (
                                        <div style={s.dropdownMenu} className="fade-in">
                                            {sourceLocs.length === 0 ? <div className="p-2 small text-muted">No Routes</div> : 
                                                sourceLocs.map((loc, i) => (
                                                    <div key={i} style={s.dropdownItem(row.sourceLocation === loc)} onClick={() => handleDropdownSelect(row.id, 'sourceLocation', loc)}>
                                                        {loc} {row.sourceLocation === loc && <FiCheck size={14}/>}
                                                    </div>
                                                ))
                                            }
                                            {userRole === 'Admin' && (
                                                <div className="border-top mt-1 pt-1">
                                                    <small className="d-block text-center text-primary fw-bold py-1 cursor-pointer" style={{fontSize:'0.7rem'}} onClick={() => setActiveTab('settings_dispatch')}>+ Manage Sources</small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <FiArrowRight className="mt-2 text-muted"/>
                                <div className="w-50 position-relative">
                                    <div style={s.customSelect} onClick={() => toggleDropdown(row.id, 'dest')}>
                                        <span className="text-truncate">{row.destinationLocation || "Dest"}</span>
                                        <FiChevronDown size={14} className="text-muted" />
                                    </div>
                                    {openDropdowns[`${row.id}-dest`] && (
                                        <div style={s.dropdownMenu} className="fade-in">
                                            {destLocs.length === 0 ? <div className="p-2 small text-muted">No Routes</div> : 
                                                destLocs.map((loc, i) => (
                                                    <div key={i} style={s.dropdownItem(row.destinationLocation === loc)} onClick={() => handleDropdownSelect(row.id, 'destinationLocation', loc)}>
                                                        {loc} {row.destinationLocation === loc && <FiCheck size={14}/>}
                                                    </div>
                                                ))
                                            }
                                            {userRole === 'Admin' && (
                                                <div className="border-top mt-1 pt-1">
                                                    <small className="d-block text-center text-primary fw-bold py-1 cursor-pointer" style={{fontSize:'0.7rem'}} onClick={() => setActiveTab('settings_dispatch')}>+ Manage Routes</small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                           </div>

                           <Form.Control size="sm" placeholder="Description / Vehicle No..." className="mb-2" value={row.description} onChange={(e)=>handleInputChange(row.id, 'description', e.target.value)} style={s.input} />

                           {/* Sent Section */}
                           <div className="bg-primary bg-opacity-10 p-2 rounded mb-2 border border-primary border-opacity-25">
                               <small className="text-primary fw-bold">Sent (Bheja)</small>
                               <Row className="g-1 mt-1">
                                   <Col xs={3}><Form.Control size="sm" type="number" placeholder="Tray30" value={row.ordPack30} onChange={(e)=>handleInputChange(row.id, 'ordPack30', e.target.value)} style={s.input}/></Col>
                                   <Col xs={3}><Form.Control size="sm" type="number" placeholder="Box10" value={row.ordPack10} onChange={(e)=>handleInputChange(row.id, 'ordPack10', e.target.value)} style={s.input}/></Col>
                                   <Col xs={3}><Form.Control size="sm" type="number" placeholder="Box06" value={row.ordPack06} onChange={(e)=>handleInputChange(row.id, 'ordPack06', e.target.value)} style={s.input}/></Col>
                                   <Col xs={3}><Form.Control size="sm" type="number" placeholder="Loose" value={row.ordDamage} onChange={(e)=>handleInputChange(row.id, 'ordDamage', e.target.value)} style={s.input}/></Col>
                               </Row>
                           </div>

                           {/* Received Section */}
                           <div className="bg-success bg-opacity-10 p-2 rounded mb-2 border border-success border-opacity-25">
                               <small className="text-success fw-bold">Received (Pahucha)</small>
                               <Row className="g-1 mt-1">
                                   <Col xs={4}><Form.Control size="sm" type="number" placeholder="Tray30" value={row.recPack30} onChange={(e)=>handleInputChange(row.id, 'recPack30', e.target.value)} style={s.input}/></Col>
                                   <Col xs={4}><Form.Control size="sm" type="number" placeholder="Box10" value={row.recPack10} onChange={(e)=>handleInputChange(row.id, 'recPack10', e.target.value)} style={s.input}/></Col>
                                   <Col xs={4}><Form.Control size="sm" type="number" placeholder="Box06" value={row.recPack06} onChange={(e)=>handleInputChange(row.id, 'recPack06', e.target.value)} style={s.input}/></Col>
                               </Row>
                           </div>

                           <div className="p-1"><Row className="g-1"><Col xs={4}><Form.Control size="sm" type="number" placeholder="Dispose" value={row.disposeEggs} onChange={(e)=>handleInputChange(row.id, 'disposeEggs', e.target.value)} style={s.input}/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="Farm Ret" value={row.returnedFarm} onChange={(e)=>handleInputChange(row.id, 'returnedFarm', e.target.value)} style={s.input}/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="NRGP" value={row.returnedNRGP} onChange={(e)=>handleInputChange(row.id, 'returnedNRGP', e.target.value)} style={s.input}/></Col></Row></div>
                       </div>
                   ))}
               </div>

               <Button variant="outline-dark" className="w-100 mb-2 border-dashed" onClick={handleAddRow}><FiPlus/> Add Another Trip</Button>
               <div className="d-flex gap-2">
                  {editingId && <Button variant="outline-secondary" className="w-50" onClick={handleCancelEdit}>Cancel</Button>}
                  <Button type="submit" variant={editingId?"warning":"primary"} className={`w-100 py-2 fw-bold`} disabled={submitLoading}>{submitLoading ? 'Saving...' : (editingId ? 'Update' : <><FiSave className="me-2"/> Save Record</>)}</Button>
               </div>
            </Form>
         </div>

         {/* RIGHT: LIST */}
         <div style={s.listPanel}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
               <h6 className="fw-bold mb-0">Dispatch Log</h6>
               <InputGroup size="sm" style={{width:'180px'}}><InputGroup.Text className="bg-white border-end-0"><FiSearch/></InputGroup.Text><Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="border-start-0" /></InputGroup>
            </div>

            <div style={{maxHeight:'600px', overflowY:'auto'}}>
               <Table hover responsive className="mb-0 align-middle small text-center" style={{fontSize: '0.8rem'}}>
                 <thead className="bg-light text-muted sticky-top" style={{zIndex: 1, top: 0}}>
                    <tr>
                        <th style={{width:'10%'}}>Date</th>
                        <th style={{width:'20%'}} className="text-start">Route</th>
                        <th style={{width:'20%'}} className="table-primary">Sent</th>
                        <th style={{width:'20%'}} className="table-success">Received</th>
                        <th style={{width:'15%'}} className="table-danger">Status</th>
                        <th style={{width:'10%'}}>Ret</th>
                        <th style={{width:'5%'}}>Act</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredList.length === 0 ? (
                        <tr><td colSpan="7" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No records found for {selectedBranch}</p></td></tr>
                    ) : (
                        filteredList.map((entry) => (
                            <React.Fragment key={entry.id}>
                                {entry.deliveries && entry.deliveries.map((d, index) => (
                                    <tr key={`${entry.id}-${index}`}>
                                        {index === 0 && (<td rowSpan={entry.deliveries.length} className="bg-white align-middle fw-bold border-end"><div>{format(new Date(entry.date), 'dd MMM')}</div><div className="text-muted small">{format(new Date(entry.date), 'yyyy')}</div><Badge bg="secondary" className="mt-1">{entry.deliveries.length} Trips</Badge></td>)}
                                        
                                        <td className="text-start align-middle">
                                            <div className="d-flex align-items-center gap-1 mb-1"><Badge bg="light" text="dark" className="border text-truncate" style={{maxWidth:'80px'}}>{d.sourceLocation}</Badge><FiArrowRight className="text-muted flex-shrink-0" size={10}/><Badge bg="info" className="bg-opacity-10 text-primary border border-primary text-truncate" style={{maxWidth:'80px'}}>{d.destinationLocation}</Badge></div>
                                            {d.description && <div className="text-muted small fst-italic text-truncate" style={{maxWidth:'150px'}}>{d.description}</div>}
                                        </td>

                                        {/* SENT COLUMN */}
                                        <td className="bg-primary bg-opacity-10 align-middle text-start ps-4">
                                            <div className="fw-bold text-primary mb-1">{Number(d.totalOrderEggs).toLocaleString()} Eggs</div>
                                            <div className="d-flex flex-column gap-0 text-muted" style={{fontSize:'0.75rem'}}>
                                                {Number(d.ordPack30) > 0 && <span>T30: <b>{d.ordPack30}</b></span>}
                                                {Number(d.ordPack10) > 0 && <span>B10: <b>{d.ordPack10}</b></span>}
                                                {Number(d.ordPack06) > 0 && <span>B06: <b>{d.ordPack06}</b></span>}
                                                {Number(d.ordDamage) > 0 && <span>Loose: <b>{d.ordDamage}</b></span>}
                                            </div>
                                        </td>

                                        {/* RECEIVED COLUMN */}
                                        <td className="bg-success bg-opacity-10 align-middle text-start ps-4">
                                            <div className="fw-bold text-success mb-1">{Number(d.totalReceivedEggs).toLocaleString()} Eggs</div>
                                            <div className="d-flex flex-column gap-0 text-muted" style={{fontSize:'0.75rem'}}>
                                                {Number(d.recPack30) > 0 && <span>T30: <b>{d.recPack30}</b></span>}
                                                {Number(d.recPack10) > 0 && <span>B10: <b>{d.recPack10}</b></span>}
                                                {Number(d.recPack06) > 0 && <span>B06: <b>{d.recPack06}</b></span>}
                                            </div>
                                        </td>

                                        {/* STATUS COLUMN */}
                                        <td className="align-middle bg-danger bg-opacity-10 text-start ps-4">
                                            <div className="fw-bold text-danger mb-1">{Number(d.totalShortEggs || 0).toLocaleString()} Eggs</div>
                                            {getShortageBadge(d)}
                                        </td>
                                        
                                        <td className="align-middle small text-muted">
                                            {d.disposeEggs > 0 && <div>D: {d.disposeEggs}</div>}
                                            {d.returnedFarm > 0 && <div>F: {d.returnedFarm}</div>}
                                            {d.returnedNRGP > 0 && <div>N: {d.returnedNRGP}</div>}
                                            {(!d.disposeEggs && !d.returnedFarm && !d.returnedNRGP) && '-'}
                                        </td>

                                        {index === 0 && (
                                            <td rowSpan={entry.deliveries.length} className="align-middle border-start">
                                                <Button variant="link" className="text-primary p-0 d-block mb-2" onClick={() => handleEdit(entry)}><FiEdit size={16}/></Button>
                                                <Button variant="link" className="text-danger p-0 d-block" onClick={() => handleDeleteClick(entry.id)}><FiTrash2 size={16}/></Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </React.Fragment>
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

export default SaleBook;