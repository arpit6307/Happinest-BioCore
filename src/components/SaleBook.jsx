import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, InputGroup, Alert, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiTruck, FiCalendar, 
  FiArrowRight, FiTrash2, FiFileText, FiXCircle, FiSave, FiAlertCircle 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import { format } from 'date-fns';

const SaleBook = () => {
  const [sales, setSales] = useState([]);
  const [sourceLocs, setSourceLocs] = useState([]); 
  const [destLocs, setDestLocs] = useState([]);     
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({ name: 'Happinest BioCore', logo: '' });

  // --- FORM STATE ---
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState([{
      id: 1, 
      sourceLocation: '', destinationLocation: '', description: '',
      ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '',
      recPack30: '', recPack10: '', recPack06: '',
      disposeEggs: '', returnedFarm: '', returnedNRGP: ''
  }]);
  const [uiStats, setUiStats] = useState({ totalEggs: 0 });

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
        try {
            const srcSnap = await getDocs(collection(db, "settings_dispatch_from"));
            setSourceLocs(srcSnap.docs.map(d => d.data().name));
            const destSnap = await getDocs(collection(db, "settings_dispatch_to"));
            setDestLocs(destSnap.docs.map(d => d.data().name));
            const profileSnap = await getDoc(doc(db, "settings_config", "general_profile"));
            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setCompanyProfile({ 
                    name: data.companyName || 'Happinest BioCore',
                    logo: data.logoUrl || ''
                });
            }
        } catch (e) { console.error(e); }
    };
    fetchData();

    const q = query(collection(db, "sale_book"), orderBy("date", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. LIVE CALCULATION ---
  useEffect(() => {
    let total = 0;
    rows.forEach(r => {
        const val = (v) => isNaN(Number(v)) ? 0 : Number(v);
        total += (val(r.ordPack30)*30) + (val(r.ordPack10)*10) + (val(r.ordPack06)*6) + val(r.ordDamage);
    });
    setUiStats({ totalEggs: total });
  }, [rows]);

  // --- 3. HANDLERS ---
  const handleAddRow = () => setRows([...rows, { id: Date.now(), sourceLocation: '', destinationLocation: '', description: '', ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '', recPack30: '', recPack10: '', recPack06: '', disposeEggs: '', returnedFarm: '', returnedNRGP: '' }]);
  const handleRemoveRow = (id) => rows.length > 1 ? setRows(rows.filter(r => r.id !== id)) : alert("Kam se kam ek entry honi chahiye.");
  const handleInputChange = (id, field, value) => setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));

  // --- 4. SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
        let batchTotalOrder = 0, batchTotalShort = 0, processedDeliveries = [];
        for (let r of rows) {
            if (!r.sourceLocation || !r.destinationLocation) { alert("Please select Locations."); setSubmitLoading(false); return; }
            const num = (v) => (v === '' || isNaN(Number(v))) ? 0 : Number(v);
            const str = (v) => v || '';

            const totalOrder = (num(r.ordPack30)*30) + (num(r.ordPack10)*10) + (num(r.ordPack06)*6) + num(r.ordDamage);
            const totalReceived = (num(r.recPack30)*30) + (num(r.recPack10)*10) + (num(r.recPack06)*6);
            const sP30 = num(r.ordPack30)-num(r.recPack30), sP10 = num(r.ordPack10)-num(r.recPack10), sP06 = num(r.ordPack06)-num(r.recPack06);
            
            batchTotalOrder += totalOrder;
            batchTotalShort += (sP30*30 + sP10*10 + sP06*6);

            processedDeliveries.push({
                sourceLocation: str(r.sourceLocation), destinationLocation: str(r.destinationLocation), description: str(r.description),
                ordPack30: num(r.ordPack30), ordPack10: num(r.ordPack10), ordPack06: num(r.ordPack06), ordDamage: num(r.ordDamage),
                recPack30: num(r.recPack30), recPack10: num(r.recPack10), recPack06: num(r.recPack06),
                disposeEggs: num(r.disposeEggs), returnedFarm: num(r.returnedFarm), returnedNRGP: num(r.returnedNRGP),
                totalOrderEggs: totalOrder, totalReceivedEggs: totalReceived, totalShortEggs: (sP30*30 + sP10*10 + sP06*6),
                calcShortP30: sP30, calcShortP10: sP10, calcShortP06: sP06
            });
        }
        await addDoc(collection(db, "sale_book"), { date: entryDate, grandTotalOrder: batchTotalOrder, grandTotalShort: batchTotalShort, deliveries: processedDeliveries, timestamp: serverTimestamp() });
        setEntryDate(format(new Date(), 'yyyy-MM-dd'));
        setRows([{ id: Date.now(), sourceLocation: '', destinationLocation: '', description: '', ordPack30: '', ordPack10: '', ordPack06: '', ordDamage: '', recPack30: '', recPack10: '', recPack06: '', disposeEggs: '', returnedFarm: '', returnedNRGP: '' }]);
    } catch (error) { console.error(error); alert("Error saving data."); }
    setSubmitLoading(false);
  };

  const handleDelete = async (docId) => { if(window.confirm("Delete this entry?")) await deleteDoc(doc(db, "sale_book", docId)); };

  // --- 5. FIXED & PRO PDF EXPORT ---
  const filteredList = sales.filter(item => item.deliveries && item.deliveries.some(d => (d.sourceLocation?.toLowerCase().includes(searchTerm.toLowerCase()) || d.destinationLocation?.toLowerCase().includes(searchTerm.toLowerCase()))));
  
  // Helper to load image for PDF
  const getDataUri = (url) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.setAttribute('crossOrigin', 'anonymous'); 
      image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext('2d').drawImage(image, 0, 0);
          resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => resolve(null); // Return null if fails
      image.src = url;
    });
  };

  const exportPDF = async () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Load Logo first
    let logoData = null;
    if (companyProfile.logo) {
        logoData = await getDataUri(companyProfile.logo);
    }

    // 1. HEADER (Only on First Page)
    if (logoData) {
        doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(companyProfile.name.toUpperCase(), 42, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Sale Book & Dispatch Register", 42, 26);
    } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(companyProfile.name.toUpperCase(), 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Sale Book & Dispatch Register", 14, 26);
    }
    
    // Top Right Info
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 18, { align: 'right' });
    doc.text("Status: Verified Report", pageWidth - 14, 23, { align: 'right' });
    doc.setDrawColor(200);
    doc.line(14, 38, pageWidth - 14, 38);

    // 2. TABLE DATA
    let tableRows = [];
    filteredList.forEach(entry => {
        if(entry.deliveries){
            entry.deliveries.forEach((d, index) => {
                let shortText = [];
                if(d.calcShortP30 > 0) shortText.push(`${d.calcShortP30} Tray`);
                if(d.calcShortP10 > 0) shortText.push(`${d.calcShortP10} Box10`);
                if(d.calcShortP06 > 0) shortText.push(`${d.calcShortP06} Box06`);
                
                tableRows.push([
                    index === 0 ? entry.date : '', 
                    `${d.sourceLocation} -> ${d.destinationLocation}`,
                    d.description || '-',
                    `T30:${d.ordPack30} | B10:${d.ordPack10} | B06:${d.ordPack06}`,
                    Number(d.totalOrderEggs).toLocaleString(),
                    `T30:${d.recPack30} | B10:${d.recPack10} | B06:${d.recPack06}`,
                    shortText.length > 0 ? shortText.join(', ') : 'OK',
                    `D:${d.disposeEggs} | F:${d.returnedFarm}`
                ]);
            });
            tableRows.push(['', '', '', '', '', '', '', '']); 
        }
    });

    autoTable(doc, {
        startY: 42, // Start below header
        head: [["Date", "Route", "Vehicle", "Sent (Packs)", "Total Eggs", "Recv (Packs)", "Shortage", "Returns"]],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, valign: 'middle', cellPadding: 2 },
        headStyles: { fillColor: [52, 58, 64], textColor: 255 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 40, fontStyle: 'bold' },
            4: { cellWidth: 20, fontStyle: 'bold', halign: 'right' },
        },
        // Header ONLY on first page logic:
        didDrawPage: (data) => {
            // No repeated header code here, so it only draws where we put it manually above
        }
    });

    // 3. FOOTER (Only on Last Page)
    const finalY = doc.lastAutoTable.finalY + 10; // Position after table
    const footerY = Math.min(finalY, pageHeight - 20);
    
    // Check if we need a new page for footer
    if (finalY > pageHeight - 25) {
        doc.addPage();
        doc.text("", 14, 10); // Dummy
    }

    const lastPageHeight = doc.internal.pageSize.height;
    
    // Draw Footer at bottom of LAST page
    doc.setDrawColor(150);
    doc.line(14, lastPageHeight - 30, pageWidth - 14, lastPageHeight - 30);
    
    doc.setFontSize(8);
    doc.setTextColor(50);
    
    // Left: System Gen
    doc.text(`Generated by ${companyProfile.name} Inventory System`, 14, lastPageHeight - 15);
    doc.text(`Report ID: #${Date.now().toString().slice(-6)}`, 14, lastPageHeight - 10);

    // Center: Page Count
    const pageCount = doc.internal.getNumberOfPages();
    doc.text(`Total Pages: ${pageCount}`, pageWidth / 2, lastPageHeight - 15, { align: 'center' });

    // Right: Signatures
    doc.text("Authorized Signatory", pageWidth - 14, lastPageHeight - 20, { align: 'right' });
    doc.text("_______________________", pageWidth - 14, lastPageHeight - 10, { align: 'right' });

    doc.save(`Dispatch_Report_${format(new Date(), 'ddMMMyyyy')}.pdf`);
  };

  if (loading) return <Loader text="Loading Dispatch Data..." />;

  // --- UI HELPER: SHORTAGE BADGE ---
  const getShortageBadge = (d) => {
      const s30 = d.calcShortP30; const s10 = d.calcShortP10; const s06 = d.calcShortP06;
      if (s30 <= 0 && s10 <= 0 && s06 <= 0) return <Badge bg="success" className="bg-opacity-25 text-success border border-success px-2">Perfect</Badge>;
      return (
          <div className="d-flex flex-column gap-1">
              {s30 > 0 && <Badge bg="danger" className="text-start">Short: {s30} Tray</Badge>}
              {s10 > 0 && <Badge bg="danger" className="text-start">Short: {s10} Box10</Badge>}
              {s06 > 0 && <Badge bg="danger" className="text-start">Short: {s06} Box06</Badge>}
          </div>
      );
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h4 className="fw-bold text-dark mb-1">Sale Book & Dispatch</h4><p className="text-muted small mb-0">Track Trays (30) and Boxes (10/06).</p></div>
        <Button variant="danger" size="sm" onClick={exportPDF}><FiFileText className="me-2"/> Download Report</Button>
      </div>

      <Row className="g-4">
        {/* FORM */}
        <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center sticky-top border-bottom" style={{zIndex: 5}}><h6 className="fw-bold text-dark mb-0"><FiPlus className="me-2 text-primary"/> New Entry</h6><Badge bg="primary">Total: {uiStats.totalEggs.toLocaleString()}</Badge></Card.Header>
                <Card.Body className="p-3 bg-light" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    <Form onSubmit={handleSubmit}>
                        <div className="bg-white p-2 rounded border mb-3 shadow-sm"><Form.Label className="small fw-bold text-muted mb-1">Dispatch Date</Form.Label><InputGroup><InputGroup.Text className="bg-light"><FiCalendar/></InputGroup.Text><Form.Control type="date" value={entryDate} onChange={(e)=>setEntryDate(e.target.value)} className="fw-bold" required /></InputGroup></div>
                        {rows.map((row, index) => (
                            <div key={row.id} className="bg-white p-3 rounded border mb-3 shadow-sm">
                                <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2"><span className="badge bg-dark">Trip #{index + 1}</span>{rows.length > 1 && <Button variant="link" className="text-danger p-0" onClick={() => handleRemoveRow(row.id)}><FiXCircle size={18}/></Button>}</div>
                                <div className="d-flex gap-2 mb-2"><Form.Select size="sm" value={row.sourceLocation} onChange={(e) => handleInputChange(row.id, 'sourceLocation', e.target.value)} className="fw-bold" required><option value="">Source</option>{sourceLocs.map((l, i) => <option key={i} value={l}>{l}</option>)}</Form.Select><FiArrowRight className="mt-2 text-muted"/><Form.Select size="sm" value={row.destinationLocation} onChange={(e) => handleInputChange(row.id, 'destinationLocation', e.target.value)} className="fw-bold text-primary" required><option value="">Destination</option>{destLocs.map((l, i) => <option key={i} value={l}>{l}</option>)}</Form.Select></div>
                                <Form.Control size="sm" placeholder="Vehicle No." className="mb-2" value={row.description} onChange={(e)=>handleInputChange(row.id, 'description', e.target.value)} />
                                <div className="bg-light p-2 rounded mb-2 border"><div className="d-flex justify-content-between"><small className="text-primary fw-bold mb-1">Sent (Bheja)</small></div><Row className="g-1"><Col xs={3}><Form.Control size="sm" type="number" placeholder="Tray30" value={row.ordPack30} onChange={(e)=>handleInputChange(row.id, 'ordPack30', e.target.value)} className="border-primary"/></Col><Col xs={3}><Form.Control size="sm" type="number" placeholder="Box10" value={row.ordPack10} onChange={(e)=>handleInputChange(row.id, 'ordPack10', e.target.value)} className="border-primary"/></Col><Col xs={3}><Form.Control size="sm" type="number" placeholder="Box06" value={row.ordPack06} onChange={(e)=>handleInputChange(row.id, 'ordPack06', e.target.value)} className="border-primary"/></Col><Col xs={3}><Form.Control size="sm" type="number" placeholder="Loose" value={row.ordDamage} onChange={(e)=>handleInputChange(row.id, 'ordDamage', e.target.value)} className="border-primary"/></Col></Row></div>
                                <div className="bg-light p-2 rounded mb-2 border"><div className="d-flex justify-content-between"><small className="text-success fw-bold mb-1">Received (Pahucha)</small></div><Row className="g-1"><Col xs={4}><Form.Control size="sm" type="number" placeholder="Tray30" value={row.recPack30} onChange={(e)=>handleInputChange(row.id, 'recPack30', e.target.value)} className="border-success"/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="Box10" value={row.recPack10} onChange={(e)=>handleInputChange(row.id, 'recPack10', e.target.value)} className="border-success"/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="Box06" value={row.recPack06} onChange={(e)=>handleInputChange(row.id, 'recPack06', e.target.value)} className="border-success"/></Col></Row></div>
                                <div className="p-1"><Row className="g-1"><Col xs={4}><Form.Control size="sm" type="number" placeholder="Disp" value={row.disposeEggs} onChange={(e)=>handleInputChange(row.id, 'disposeEggs', e.target.value)}/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="Farm" value={row.returnedFarm} onChange={(e)=>handleInputChange(row.id, 'returnedFarm', e.target.value)}/></Col><Col xs={4}><Form.Control size="sm" type="number" placeholder="NRGP" value={row.returnedNRGP} onChange={(e)=>handleInputChange(row.id, 'returnedNRGP', e.target.value)}/></Col></Row></div>
                            </div>
                        ))}
                        <div className="d-flex gap-2"><Button variant="outline-dark" className="w-50 border-dashed" onClick={handleAddRow}><FiPlus/> Add Trip</Button><Button type="submit" variant="dark" className="w-50 shadow-sm" disabled={submitLoading}>{submitLoading ? 'Saving...' : <><FiSave className="me-1"/> Save</>}</Button></div>
                    </Form>
                </Card.Body>
            </Card>
        </Col>

        {/* PRO TABLE */}
        <Col lg={8}>
            <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0"><FiTruck className="me-2"/> Dispatch Log</h6>
                    <InputGroup style={{ maxWidth: '200px' }} size="sm"><InputGroup.Text className="bg-light border-end-0"><FiSearch/></InputGroup.Text><Form.Control placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="bg-light border-start-0" /></InputGroup>
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    <Table bordered hover responsive className="mb-0 align-middle small text-center" style={{fontSize: '0.8rem'}}>
                        <thead className="bg-light text-muted sticky-top" style={{zIndex: 1, top: 0}}>
                            <tr><th style={{width:'10%'}}>Date</th><th style={{width:'20%'}} className="text-start">Route</th><th style={{width:'20%'}} className="table-primary">Sent (Bheja)</th><th style={{width:'20%'}} className="table-success">Received (Pahucha)</th><th style={{width:'15%'}} className="table-danger">Status / Short</th><th style={{width:'10%'}}>Returns</th><th style={{width:'5%'}}>Action</th></tr>
                        </thead>
                        <tbody>
                            {filteredList.map((entry) => (
                                <React.Fragment key={entry.id}>
                                    {entry.deliveries && entry.deliveries.map((d, index) => (
                                        <tr key={`${entry.id}-${index}`}>
                                            {index === 0 && <td rowSpan={entry.deliveries.length} className="bg-white align-middle fw-bold border-end"><div>{format(new Date(entry.date), 'dd MMM')}</div><div className="text-muted small">{format(new Date(entry.date), 'yyyy')}</div><div className="badge bg-secondary mt-1">{entry.deliveries.length} Trips</div></td>}
                                            <td className="text-start align-middle"><div className="d-flex align-items-center gap-1 mb-1"><Badge bg="light" text="dark" className="border text-truncate" style={{maxWidth:'80px'}}>{d.sourceLocation}</Badge><FiArrowRight className="text-muted flex-shrink-0" size={10}/><Badge bg="info" className="bg-opacity-10 text-primary border border-primary text-truncate" style={{maxWidth:'80px'}}>{d.destinationLocation}</Badge></div>{d.description && <div className="text-muted small fst-italic text-truncate" style={{maxWidth:'150px'}}>{d.description}</div>}</td>
                                            <td className="bg-primary bg-opacity-10 align-middle text-start ps-4"><div className="fw-bold text-primary mb-1">{Number(d.totalOrderEggs).toLocaleString()} Eggs</div><div className="d-flex flex-column gap-0 text-muted" style={{fontSize:'0.75rem'}}>{d.ordPack30 > 0 && <span>Tray30: <b>{d.ordPack30}</b></span>}{d.ordPack10 > 0 && <span>Box10: <b>{d.ordPack10}</b></span>}{d.ordPack06 > 0 && <span>Box06: <b>{d.ordPack06}</b></span>}</div></td>
                                            <td className="bg-success bg-opacity-10 align-middle text-start ps-4"><div className="fw-bold text-success mb-1">{Number(d.totalReceivedEggs).toLocaleString()} Eggs</div><div className="d-flex flex-column gap-0 text-muted" style={{fontSize:'0.75rem'}}>{d.recPack30 > 0 && <span>Tray30: <b>{d.recPack30}</b></span>}{d.recPack10 > 0 && <span>Box10: <b>{d.recPack10}</b></span>}{d.recPack06 > 0 && <span>Box06: <b>{d.recPack06}</b></span>}</div></td>
                                            <td className="align-middle bg-danger bg-opacity-10">{getShortageBadge(d)}</td>
                                            <td className="align-middle small text-muted">{d.disposeEggs > 0 && <div>D: {d.disposeEggs}</div>}{d.returnedFarm > 0 && <div>F: {d.returnedFarm}</div>}{d.returnedNRGP > 0 && <div>N: {d.returnedNRGP}</div>}{(!d.disposeEggs && !d.returnedFarm && !d.returnedNRGP) && '-'}</td>
                                            {index === 0 && <td rowSpan={entry.deliveries.length} className="align-middle border-start"><Button variant="link" className="text-danger p-0" onClick={() => handleDelete(entry.id)}><FiTrash2 size={16}/></Button></td>}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            {filteredList.length === 0 && <tr><td colSpan="7" className="py-5 text-muted">No records found.</td></tr>}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SaleBook;