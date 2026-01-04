import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, InputGroup, ProgressBar } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiDollarSign, FiCalendar, 
  FiFileText, FiTrendingUp, FiTrendingDown, FiPieChart, FiTrash2, FiSave, FiArchive 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';

const ExpenseTracker = () => {
  const [transactions, setTransactions] = useState([]);
  const [financeCats, setFinanceCats] = useState([]); // Store categories
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'Expense', // Default
    category: ''     // Starts Empty
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [submitLoading, setSubmitLoading] = useState(false);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    // Fetch Transactions
    const qTrx = query(collection(db, "cashbook"), orderBy("timestamp", "desc"));
    const unsubTrx = onSnapshot(qTrx, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      
      // Calculate Totals
      let inc = 0, exp = 0;
      data.forEach(item => {
        if(item.type === 'Income') inc += Number(item.amount);
        else exp += Number(item.amount);
      });
      setSummary({ income: inc, expense: exp, balance: inc - exp });
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });

    // Fetch Categories
    const qCats = query(collection(db, "settings_finance_categories"), orderBy("name"));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
        setFinanceCats(snapshot.docs.map(doc => doc.data()));
    });

    return () => { unsubTrx(); unsubCats(); };
  }, []);

  // --- 2. HANDLERS ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleTypeChange = (type) => setFormData({ ...formData, type: type, category: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return alert("Please fill all fields");
    if (!formData.category) return alert("Please select a valid Category.");

    setSubmitLoading(true);
    try {
      await addDoc(collection(db, "cashbook"), { ...formData, amount: Number(formData.amount), timestamp: serverTimestamp() });
      setFormData(prev => ({ ...prev, description: '', amount: '' }));
    } catch (error) { alert("Error adding transaction"); }
    setSubmitLoading(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm("Delete this transaction record?")) await deleteDoc(doc(db, "cashbook", id));
  };

  // --- 3. PROFESSIONAL EXPORT ---
  const filteredList = transactions.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportPDF = async () => {
    const doc = new jsPDF();
    
    // Logo Helper
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

    if(imgData) doc.addImage(imgData, 'JPEG', 14, 10, 20, 20);

    doc.setFontSize(16);
    doc.setTextColor(13, 110, 253);
    doc.text("Happinest Poultry Products Pvt. Ltd.", 40, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Financial Cashbook Statement", 40, 24);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 40, 29);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    // FINANCE SUMMARY BOX
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 40, 182, 18, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("Total Income:", 20, 52);
    doc.setTextColor(25, 135, 84); // Green
    doc.setFont("helvetica", "bold");
    doc.text(`+${summary.income.toLocaleString()}`, 45, 52);

    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.text("Total Expense:", 80, 52);
    doc.setTextColor(220, 53, 69); // Red
    doc.setFont("helvetica", "bold");
    doc.text(`-${summary.expense.toLocaleString()}`, 110, 52);

    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.text("Net Balance:", 140, 52);
    doc.setTextColor(13, 110, 253); // Blue
    doc.setFont("helvetica", "bold");
    doc.text(`${summary.balance.toLocaleString()}`, 165, 52);

    // TABLE
    const rows = filteredList.map(item => [item.date, item.type, item.category, item.description, item.amount.toLocaleString()]);
    autoTable(doc, { 
        startY: 65,
        head: [["Date", "Type", "Category", "Description", "Amount (INR)"]], 
        body: rows, 
        theme: 'grid',
        headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: 'bold' }, // Dark Header
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                // Color Code Income/Expense text
                if (data.cell.raw === 'Income') data.cell.styles.textColor = [25, 135, 84];
                if (data.cell.raw === 'Expense') data.cell.styles.textColor = [220, 53, 69];
            }
        },
        didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Confidential | Financial Statement | Page ${data.pageNumber} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }
    });
    doc.save(`Cashbook_Statement.pdf`);
  };

  if (loading) return <Loader text="Auditing Financials..." />;
  const currentCategories = financeCats.filter(c => c.type === formData.type);

  return (
    <div className="fade-in">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 className="fw-bold text-dark mb-1">Financial Cash Book</h4>
           <p className="text-muted small mb-0">Manage daily income, factory expenses, and petty cash.</p>
        </div>
        <Button variant="outline-dark" size="sm" onClick={exportPDF}>
           <FiDownload className="me-2"/> Statement
        </Button>
      </div>

      {/* --- TOP STATS CARDS --- */}
      <Row className="g-4 mb-4">
        <Col md={4}>
            <div className="p-4 bg-white rounded-3 shadow-sm border h-100 d-flex justify-content-between align-items-center">
                <div>
                    <p className="text-muted text-uppercase small fw-bold mb-1">Total Income</p>
                    <h3 className="text-success fw-bold mb-0">₹ {summary.income.toLocaleString()}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success">
                    <FiTrendingUp size={24}/>
                </div>
            </div>
        </Col>
        <Col md={4}>
            <div className="p-4 bg-white rounded-3 shadow-sm border h-100 d-flex justify-content-between align-items-center">
                <div>
                    <p className="text-muted text-uppercase small fw-bold mb-1">Total Expense</p>
                    <h3 className="text-danger fw-bold mb-0">₹ {summary.expense.toLocaleString()}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle text-danger">
                    <FiTrendingDown size={24}/>
                </div>
            </div>
        </Col>
        <Col md={4}>
            <div className={`p-4 bg-white rounded-3 shadow-sm border h-100 d-flex justify-content-between align-items-center ${summary.balance < 0 ? 'border-danger' : 'border-success'}`}>
                <div>
                    <p className="text-muted text-uppercase small fw-bold mb-1">Net Balance</p>
                    <h3 className={`fw-bold mb-0 ${summary.balance < 0 ? 'text-danger' : 'text-primary'}`}>₹ {summary.balance.toLocaleString()}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                    <FiPieChart size={24}/>
                </div>
            </div>
        </Col>
      </Row>

      <Row className="g-4">
        
        {/* --- LEFT: TRANSACTION FORM --- */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
               <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                 <FiPlus className="me-2 text-primary"/> Add Transaction
               </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                
                {/* Transaction Type Toggle */}
                <div className="d-flex gap-2 mb-3 p-1 bg-light rounded border">
                    <Button 
                        variant={formData.type === 'Income' ? 'success' : 'light'} 
                        className={`flex-fill fw-bold ${formData.type === 'Income' ? 'shadow-sm' : 'text-muted border-0'}`}
                        onClick={() => handleTypeChange('Income')}
                    >
                        <FiTrendingUp className="me-2"/> Income
                    </Button>
                    <Button 
                        variant={formData.type === 'Expense' ? 'danger' : 'light'} 
                        className={`flex-fill fw-bold ${formData.type === 'Expense' ? 'shadow-sm' : 'text-muted border-0'}`}
                        onClick={() => handleTypeChange('Expense')}
                    >
                        <FiTrendingDown className="me-2"/> Expense
                    </Button>
                </div>

                <div className="mb-3">
                    <Form.Label className="small fw-bold text-muted">Transaction Date</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted"><FiCalendar/></InputGroup.Text>
                        <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} className="border-start-0 bg-light" required />
                    </InputGroup>
                </div>

                {/* DYNAMIC CATEGORY DROPDOWN */}
                <div className="mb-3">
                    <Form.Label className="small fw-bold text-muted">Category</Form.Label>
                    <Form.Select name="category" value={formData.category} onChange={handleChange} className="bg-light fw-bold" required>
                        <option value="">-- Select Category --</option>
                        {currentCategories.length > 0 ? (
                            currentCategories.map((cat, idx) => (
                                <option key={idx} value={cat.name}>{cat.name}</option>
                            ))
                        ) : (
                            <option value="" disabled>No Categories Found. Add in Settings.</option>
                        )}
                    </Form.Select>
                </div>

                <div className="mb-3">
                    <Form.Label className="small fw-bold text-muted">Amount (₹)</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted"><FiDollarSign/></InputGroup.Text>
                        <Form.Control type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" className="border-start-0 bg-light fw-bold fs-5" required />
                    </InputGroup>
                </div>

                <div className="mb-4">
                    <Form.Label className="small fw-bold text-muted">Description / Party Name</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted"><FiFileText/></InputGroup.Text>
                        <Form.Control type="text" name="description" value={formData.description} onChange={handleChange} placeholder="e.g. Sold 500 Trays to Raju" className="border-start-0 bg-light" required />
                    </InputGroup>
                </div>

                <Button type="submit" variant={formData.type === 'Income' ? 'success' : 'danger'} className="w-100 py-2 fw-bold" disabled={submitLoading}>
                    {submitLoading ? 'Processing...' : <><FiSave className="me-2"/> Save Transaction</>}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* --- RIGHT: TRANSACTION LEDGER (WITH SCROLL) --- */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
             <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
               <h6 className="fw-bold text-dark mb-0"><FiFileText className="me-2"/> Recent Transactions</h6>
               <InputGroup style={{ maxWidth: '250px' }} size="sm">
                  <InputGroup.Text className="bg-light border-end-0"><FiSearch className="text-muted"/></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search ledger..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="border-start-0 bg-light"
                  />
               </InputGroup>
            </Card.Header>
            {/* ADDED SCROLL STYLE HERE */}
            <Card.Body className="p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
               <Table hover responsive className="mb-0 align-middle">
                 {/* STICKY HEADER ADDED */}
                 <thead className="bg-light text-muted small" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                   <tr>
                     <th className="ps-4 py-3">Date</th>
                     <th>Details</th>
                     <th>Category</th>
                     <th className="text-end pe-4">Amount</th>
                     <th className="text-end"></th>
                   </tr>
                 </thead>
                 <tbody>
                    {filteredList.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No transactions recorded</p></td></tr>
                    ) : (
                        filteredList.map((item) => (
                            <tr key={item.id} style={{ fontSize: '0.95rem' }}>
                                <td className="ps-4 text-muted small">{item.date}</td>
                                <td>
                                    <div className="fw-bold text-dark">{item.description}</div>
                                </td>
                                <td>
                                    <Badge bg="light" text="dark" className="border fw-normal">{item.category}</Badge>
                                </td>
                                <td className="text-end pe-4">
                                    <span className={`fw-bold ${item.type === 'Income' ? 'text-success' : 'text-danger'}`}>
                                        {item.type === 'Income' ? '+' : '-'} ₹{item.amount.toLocaleString()}
                                    </span>
                                </td>
                                <td className="text-end pe-3">
                                    <Button variant="link" className="text-muted p-0 opacity-50" onClick={() => handleDelete(item.id)}>
                                        <FiTrash2 />
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                 </tbody>
               </Table>
            </Card.Body>
          </Card>
        </Col>

      </Row>
    </div>
  );
};

export default ExpenseTracker;