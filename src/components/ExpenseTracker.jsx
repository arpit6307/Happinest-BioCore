import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge } from 'react-bootstrap';
import { 
  FiSearch, FiDownload, FiDollarSign, FiCalendar, 
  FiFileText, FiTrendingUp, FiTrendingDown, FiPieChart, 
  FiTrash2, FiSave, FiArchive, FiActivity, FiChevronDown, FiCheck 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { ToastNotification, ConfirmationModal } from './CustomAlerts';

const ExpenseTracker = ({ selectedBranch, setActiveTab, userRole }) => {
  const [transactions, setTransactions] = useState([]);
  const [financeCats, setFinanceCats] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'Expense',
    category: ''     
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  // --- Custom Dropdown State ---
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    
    // Close dropdown on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCatDropdownOpen(false);
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
    let qTrx;
    if (selectedBranch === 'All') {
        qTrx = query(collection(db, "cashbook"), orderBy("timestamp", "desc"));
    } else {
        qTrx = query(
            collection(db, "cashbook"), 
            where("branch", "==", selectedBranch),
            orderBy("timestamp", "desc")
        );
    }

    setLoading(true);
    const unsubTrx = onSnapshot(qTrx, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      
      let inc = 0, exp = 0;
      data.forEach(item => {
        if(item.type === 'Income') inc += Number(item.amount);
        else exp += Number(item.amount);
      });
      setSummary({ income: inc, expense: exp, balance: inc - exp });
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });

    const qCats = query(collection(db, "settings_finance_categories"), orderBy("name"));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
        setFinanceCats(snapshot.docs.map(doc => doc.data()));
    });

    return () => { unsubTrx(); unsubCats(); };
  }, [selectedBranch]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleTypeChange = (type) => setFormData({ ...formData, type: type, category: '' });
  
  // Handle Custom Dropdown Selection
  const handleCategorySelect = (catName) => {
      setFormData({ ...formData, category: catName });
      setIsCatDropdownOpen(false);
  };

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return showToast("Please fill all details.", "warning");
    if (!formData.category) return showToast("Please select a Category.", "warning");

    const branchToSave = selectedBranch === 'All' ? 'Delhi' : selectedBranch;

    setSubmitLoading(true);
    try {
      await addDoc(collection(db, "cashbook"), { 
          ...formData, 
          amount: Number(formData.amount), 
          branch: branchToSave,
          timestamp: serverTimestamp() 
      });
      setFormData(prev => ({ ...prev, description: '', amount: '' }));
      showToast(`Transaction saved to ${branchToSave}!`, "success");
    } catch (error) { showToast("Error adding transaction.", "error"); }
    setSubmitLoading(false);
  };

  const handleDeleteClick = (id) => {
      setDeleteId(id);
      setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
      if (deleteId) {
        await deleteDoc(doc(db, "cashbook", deleteId));
        setShowDeleteModal(false);
        showToast("Transaction deleted.", "error");
      }
  };

  const filteredList = transactions.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Helper to load image
    const loadImage = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg"));
            };
            img.onerror = () => resolve(null);
        });
    };

    const logoUrl = "https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg";
    const imgData = await loadImage(logoUrl);

    if(imgData) doc.addImage(imgData, 'JPEG', 14, 10, 22, 22);
    doc.setFontSize(18); doc.setTextColor(13, 110, 253); doc.setFont("helvetica", "bold");
    doc.text("Happinest Poultry Products Pvt. Ltd.", 42, 18);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    const titleSuffix = selectedBranch === 'All' ? 'Total' : selectedBranch;
    doc.text(`Financial Cashbook Statement (${titleSuffix})`, 42, 24);
    doc.setFontSize(9); doc.setTextColor(50);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 18, { align: 'right' });
    doc.text("Status: Verified Financials", pageWidth - 14, 23, { align: 'right' });
    doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(14, 35, pageWidth - 14, 35); 

    // Summary Box in PDF
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 40, 182, 18, 2, 2, 'F');
    doc.setFontSize(10); doc.setTextColor(50);
    doc.text("Total Income:", 20, 52); doc.setTextColor(25, 135, 84); doc.setFont("helvetica", "bold"); doc.text(`+${summary.income.toLocaleString()}`, 45, 52);
    doc.setTextColor(50); doc.setFont("helvetica", "normal"); doc.text("Total Expense:", 80, 52); doc.setTextColor(220, 53, 69); doc.setFont("helvetica", "bold"); doc.text(`-${summary.expense.toLocaleString()}`, 110, 52);
    doc.setTextColor(50); doc.setFont("helvetica", "normal"); doc.text("Net Balance:", 140, 52); doc.setTextColor(13, 110, 253); doc.setFont("helvetica", "bold"); doc.text(`${summary.balance.toLocaleString()}`, 165, 52);

    const rows = filteredList.map(item => [item.date, item.type, item.category, item.description, item.amount.toLocaleString()]);
    autoTable(doc, { 
        startY: 65, head: [["Date", "Type", "Category", "Description", "Amount (INR)"]], body: rows, theme: 'grid',
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                if (data.cell.raw === 'Income') data.cell.styles.textColor = [25, 135, 84];
                if (data.cell.raw === 'Expense') data.cell.styles.textColor = [220, 53, 69];
            }
        }
    });

    const lastPage = doc.internal.getNumberOfPages(); doc.setPage(lastPage); const footerY = pageHeight - 35;
    doc.setDrawColor(150); doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(8); doc.setTextColor(100); doc.text("System Generated Report by BioCore ERP", 14, footerY + 6); doc.text("Note: This is a computer generated document.", 14, footerY + 11);
    doc.save(`Cashbook_Statement_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) return <Loader text="Auditing Financials..." />;
  
  // Filter categories based on Income/Expense type
  const currentCategories = financeCats.filter(c => c.type === formData.type);

  // --- STYLES ---
  const s = {
    page: { 
        maxWidth: '100%', 
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // ✅ Smooth Resize
    },
    statCard: (type) => ({
      borderRadius: '20px', padding: '25px', position: 'relative', overflow: 'hidden', color: 'white',
      background: type === 'inc' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                  type === 'exp' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 
                  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: 'none', height: '100%'
    }),
    statValue: { fontSize: '1.8rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' },
    statLabel: { fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' },
    
    // ✅ Main Layout: Uses Flex to adjust width automatically
    mainContainer: {
        display: 'flex', gap: '25px', marginTop: '25px', alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
        transition: 'all 0.3s ease'
    },
    
    // ✅ Form Panel: Fixed Width on Desktop
    formPanel: {
        flex: isMobile ? 'none' : '0 0 350px',
        width: '100%', 
        backgroundColor: 'white', borderRadius: '24px', padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        position: isMobile ? 'static' : 'sticky', top: '20px',
        transition: 'all 0.3s ease'
    },
    
    toggleBtn: (active, type) => ({
        flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '0.9rem', transition: 'all 0.3s',
        backgroundColor: active ? (type==='Income'?'#dcfce7':'#fee2e2') : '#f8fafc',
        color: active ? (type==='Income'?'#166534':'#991b1b') : '#64748b',
        boxShadow: active ? 'inset 0 0 0 1px ' + (type==='Income'?'#166534':'#991b1b') : 'none'
    }),
    
    // ✅ List Panel: Takes Remaining Space
    listPanel: {
        flex: 1, width: '100%', backgroundColor: 'white', borderRadius: '24px', padding: '0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden',
        minHeight: '500px',
        transition: 'all 0.3s ease'
    },
    listHeader: { padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    trxRow: {
        display: 'flex', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid #f8fafc', transition: 'background 0.2s', cursor: 'default'
    },
    dateBox: {
        width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '15px',
        color: '#64748b', fontWeight: 'bold', fontSize: '0.8rem', lineHeight: '1.2'
    },
    trxAmount: (type) => ({
        fontWeight: '800', fontSize: '1.1rem', marginLeft: 'auto',
        color: type === 'Income' ? '#10b981' : '#ef4444'
    }),
    input: { borderRadius: '10px', padding: '12px 15px', border: '1px solid #e2e8f0', fontSize: '0.95rem', fontWeight: '500', backgroundColor:'#fdfdfd' },
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
        backgroundColor: active ? '#eff6ff' : 'transparent', color: active ? '#1d4ed8' : '#475569', fontWeight: active ? '600' : '500', fontSize: '0.9rem', marginBottom: '2px', transition: 'all 0.2s'
    }),
  };

  return (
    <div className="fade-in" style={s.page}>
      
      <ToastNotification show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      <ConfirmationModal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={confirmDelete} 
        title="Delete Transaction?" 
        message="Are you sure you want to remove this financial record?"
        type="danger" 
        confirmText="Delete" 
      />

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 className="fw-bold text-dark mb-1">Cash Flow Manager</h4>
           <p className="text-muted small mb-0">Track daily income & expenses.</p>
        </div>
        <Button variant="outline-primary" size="sm" onClick={exportPDF} style={{borderRadius:'10px', fontWeight:'600'}}>
           <FiDownload className="me-2"/> PDF Report
        </Button>
      </div>

      {/* 1. TOP STATS */}
      <Row className="g-3">
         <Col xs={12} md={4}>
            <div style={s.statCard('inc')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Income</p><h3 style={s.statValue}>₹ {summary.income.toLocaleString()}</h3></div>
                  <FiTrendingUp size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
         <Col xs={12} md={4}>
            <div style={s.statCard('exp')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Expense</p><h3 style={s.statValue}>₹ {summary.expense.toLocaleString()}</h3></div>
                  <FiTrendingDown size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
         <Col xs={12} md={4}>
            <div style={s.statCard('bal')}>
               <div className="d-flex justify-content-between align-items-start">
                  <div><p style={s.statLabel}>Balance</p><h3 style={s.statValue}>₹ {summary.balance.toLocaleString()}</h3></div>
                  <FiPieChart size={28} style={{opacity:0.8}}/>
               </div>
            </div>
         </Col>
      </Row>

      {/* 2. MAIN LAYOUT */}
      <div style={s.mainContainer}>
         
         {/* LEFT: ENTRY FORM */}
         <div style={s.formPanel}>
            <h6 className="fw-bold mb-4 d-flex align-items-center"><FiActivity className="me-2 text-primary"/> New Entry</h6>
            
            <Form onSubmit={handleSubmit}>
               <div className="d-flex gap-2 mb-4 p-1 bg-light rounded-4">
                  <button type="button" style={s.toggleBtn(formData.type==='Income', 'Income')} onClick={()=>handleTypeChange('Income')}>
                     <FiTrendingUp className="me-2"/> Income
                  </button>
                  <button type="button" style={s.toggleBtn(formData.type==='Expense', 'Expense')} onClick={()=>handleTypeChange('Expense')}>
                     <FiTrendingDown className="me-2"/> Expense
                  </button>
               </div>

               <div className="mb-3">
                  <label style={s.label}>Date</label>
                  <InputGroup>
                     <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'10px', borderBottomLeftRadius:'10px'}}><FiCalendar/></InputGroup.Text>
                     <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} style={{...s.input, borderLeft:'none'}} required />
                  </InputGroup>
               </div>

               {/* ✅ CUSTOM CATEGORY DROPDOWN */}
               <div className="mb-3 position-relative" ref={dropdownRef}>
                  <label style={s.label}>Category</label>
                  <div 
                      style={s.customSelect} 
                      onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                  >
                      <span>{formData.category || "-- Select --"}</span>
                      <FiChevronDown className={`text-muted transition ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isCatDropdownOpen && (
                      <div style={s.dropdownMenu} className="fade-in">
                          {currentCategories.length === 0 ? (
                              <div className="p-2 text-center text-muted small">No categories found.</div>
                          ) : (
                              currentCategories.map((cat, idx) => (
                                  <div 
                                      key={idx} 
                                      style={s.dropdownItem(formData.category === cat.name)}
                                      onClick={() => handleCategorySelect(cat.name)}
                                      onMouseEnter={(e) => { if(formData.category !== cat.name) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                      onMouseLeave={(e) => { if(formData.category !== cat.name) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                      {cat.name}
                                      {formData.category === cat.name && <FiCheck size={16}/>}
                                  </div>
                              ))
                          )}
                          
                          {/* ✅ ADMIN ONLY: Manage Categories Link */}
                          {userRole === 'Admin' && (
                              <div className="border-top mt-1 pt-1">
                                 <small 
                                    className="d-block text-center text-primary fw-bold py-1" 
                                    style={{fontSize:'0.75rem', cursor:'pointer'}} 
                                    onClick={() => {
                                        if(setActiveTab) {
                                            setActiveTab('settings_finance'); // Redirects to Finance Settings
                                        }
                                    }}
                                 >
                                    + Manage Categories
                                 </small>
                              </div>
                          )}
                      </div>
                  )}
               </div>

               <div className="mb-3">
                  <label style={s.label}>Amount (₹)</label>
                  <InputGroup>
                     <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'10px', borderBottomLeftRadius:'10px'}}><FiDollarSign/></InputGroup.Text>
                     <Form.Control type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" style={{...s.input, borderLeft:'none', fontSize:'1.1rem'}} required />
                  </InputGroup>
               </div>

               <div className="mb-4">
                  <label style={s.label}>Description</label>
                  <InputGroup>
                     <InputGroup.Text className="bg-white border-end-0 text-muted" style={{borderTopLeftRadius:'10px', borderBottomLeftRadius:'10px'}}><FiFileText/></InputGroup.Text>
                     <Form.Control type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Details..." style={{...s.input, borderLeft:'none'}} required />
                  </InputGroup>
               </div>

               <Button type="submit" className="w-100 py-3 fw-bold" disabled={submitLoading} style={{
                  backgroundColor: formData.type === 'Income' ? '#10b981' : '#ef4444', border:'none', borderRadius:'12px', boxShadow:'0 4px 15px rgba(0,0,0,0.1)'
               }}>
                  {submitLoading ? 'Saving...' : <><FiSave className="me-2"/> Save Entry</>}
               </Button>
            </Form>
         </div>

         {/* RIGHT: TRANSACTION LEDGER */}
         <div style={s.listPanel}>
            <div style={s.listHeader}>
               <h6 className="fw-bold mb-0">Recent Transactions</h6>
               <div style={{width:'100%', maxWidth:'200px'}}>
                  <InputGroup size="sm">
                     <InputGroup.Text className="bg-white border-end-0"><FiSearch className="text-muted"/></InputGroup.Text>
                     <Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="border-start-0 shadow-none" />
                  </InputGroup>
               </div>
            </div>

            <div style={{maxHeight:'600px', overflowY:'auto'}}>
               {filteredList.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                     <FiArchive size={40} className="mb-3 opacity-25"/>
                     <p className="mb-0">No records found</p>
                  </div>
               ) : (
                  filteredList.map((item) => (
                     <div key={item.id} style={s.trxRow} className="hover-bg-light">
                        <div style={s.dateBox}>
                           <span style={{fontSize:'1.1rem', color:'#1e293b'}}>{new Date(item.date).getDate()}</span>
                           <span style={{fontSize:'0.65rem', textTransform:'uppercase'}}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        
                        <div className="flex-grow-1">
                           <div className="fw-bold text-dark mb-1" style={{fontSize:'0.95rem'}}>{item.description}</div>
                           <Badge bg="light" text="dark" className="border fw-normal text-muted">{item.category}</Badge>
                        </div>

                        <div className="text-end">
                           <div style={s.trxAmount(item.type)}>
                              {item.type === 'Income' ? '+' : '-'} ₹{item.amount.toLocaleString()}
                           </div>
                           <Button variant="link" className="text-danger p-0 mt-1 opacity-25 hover-opacity-100" onClick={() => handleDeleteClick(item.id)}>
                              <FiTrash2 size={14} />
                           </Button>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default ExpenseTracker;