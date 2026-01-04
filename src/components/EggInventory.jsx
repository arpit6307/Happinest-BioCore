import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, InputGroup, Alert } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiMapPin, FiCalendar, 
  FiLayers, FiBox, FiArchive, FiCheckCircle, FiAlertCircle 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';

const EggInventory = () => {
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

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "settings_locations"));
        const locs = querySnapshot.docs.map(doc => doc.data().name);
        setLocations(locs);
        if (locs.length > 0) setFormData(prev => ({ ...prev, location: locs[0] }));
      } catch (error) { console.error("Error fetching locations:", error); }
    };
    fetchLocs();

    const q = query(collection(db, "egg_inventory"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStockList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });

    return () => unsubscribe();
  }, []);

  // --- 2. AUTO CALCULATION ---
  useEffect(() => {
    const total = (Number(formData.inTray || 0) * 30) + 
                  (Number(formData.pack30 || 0) * 30) + 
                  (Number(formData.pack10 || 0) * 10) + 
                  (Number(formData.pack06 || 0) * 6);
    setTotalEggs(total);
  }, [formData]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- 3. SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location) return alert("Please configure Warehouse Locations in Settings.");
    if (totalEggs === 0) return alert("Please enter stock quantity.");
    
    setSubmitLoading(true);
    try {
      await addDoc(collection(db, "egg_inventory"), { ...formData, totalEggs, timestamp: serverTimestamp() });
      setFormData(prev => ({ ...prev, inTray: '', pack30: '', pack10: '', pack06: '' }));
    } catch (error) { alert("Failed to save entry."); }
    setSubmitLoading(false);
  };

  // --- 4. PROFESSIONAL EXPORT PDF ---
  const filteredList = stockList.filter(item => 
    (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.date && item.date.includes(searchTerm))
  );

  const exportPDF = async () => {
    const doc = new jsPDF();
    
    // --- A. HELPER TO LOAD IMAGE ---
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

    // --- B. HEADER SECTION ---
    if(imgData) {
        doc.addImage(imgData, 'JPEG', 14, 10, 20, 20); // Logo
    }
    
    doc.setFontSize(16);
    doc.setTextColor(13, 110, 253); // Corporate Blue
    doc.text("Happinest Poultry Products Pvt. Ltd.", 40, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Enterprise Egg Production & Inventory Report", 40, 24);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 40, 29);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35); // Separator Line

    // --- C. SUMMARY BOX ---
    const totalProduction = filteredList.reduce((acc, item) => acc + (Number(item.totalEggs) || 0), 0);
    
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 40, 182, 18, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("Total Records:", 20, 52);
    doc.setFont("helvetica", "bold");
    doc.text(`${filteredList.length}`, 45, 52);
    
    doc.setFont("helvetica", "normal");
    doc.text("Total Production:", 80, 52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 110, 253);
    doc.text(`${totalProduction.toLocaleString()} Eggs`, 115, 52);

    // --- D. TABLE ---
    const rows = filteredList.map(item => [
        item.date, 
        item.location, 
        item.inTray || '-', 
        item.pack30 || '-', 
        item.pack10 || '-', 
        item.pack06 || '-', 
        Number(item.totalEggs).toLocaleString()
    ]);

    autoTable(doc, { 
        startY: 65,
        head: [["Date", "Location", "Trays", "P-30", "P-10", "P-06", "Total Qty"]], 
        body: rows,
        theme: 'grid',
        headStyles: { 
            fillColor: [13, 110, 253], 
            textColor: 255, 
            fontStyle: 'bold', 
            halign: 'center' 
        },
        columnStyles: {
            0: { cellWidth: 25 }, // Date
            1: { cellWidth: 40 }, // Location
            6: { fontStyle: 'bold', halign: 'right', textColor: [13, 110, 253] }, // Total
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' }
        },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        
        // --- E. FOOTER ---
        didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Confidential | System Generated by BioCore | Page ${data.pageNumber} of ${pageCount}`, 14, pageHeight - 10);
        }
    });

    doc.save(`Egg_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) return <Loader text="Loading Stock Records..." />;

  return (
    <div className="fade-in">
      
      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 className="fw-bold text-dark mb-1">Egg Stock Management</h4>
           <p className="text-muted small mb-0">Record daily production and track inventory movements.</p>
        </div>
        <Button variant="outline-primary" size="sm" onClick={exportPDF}>
           <FiDownload className="me-2"/> Export Report
        </Button>
      </div>

      <Row className="g-4">
        
        {/* --- LEFT COLUMN: ENTRY FORM --- */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
               <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                 <FiPlus className="me-2 text-primary"/> New Stock Entry
               </h6>
            </Card.Header>
            <Card.Body>
              {locations.length === 0 && (
                <Alert variant="warning" className="small d-flex align-items-center">
                  <FiAlertCircle className="me-2"/> Go to Settings to add Locations.
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Date & Location */}
                <Row className="g-3 mb-3">
                   <Col md={12}>
                     <Form.Label className="small fw-bold text-muted">Entry Date</Form.Label>
                     <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-muted"><FiCalendar/></InputGroup.Text>
                       <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} className="border-start-0 bg-light" required />
                     </InputGroup>
                   </Col>
                   <Col md={12}>
                     <Form.Label className="small fw-bold text-muted">Warehouse Location</Form.Label>
                     <InputGroup>
                       <InputGroup.Text className="bg-light border-end-0 text-muted"><FiMapPin/></InputGroup.Text>
                       <Form.Select name="location" value={formData.location} onChange={handleChange} className="border-start-0 bg-light fw-bold" required disabled={locations.length === 0}>
                         {locations.length === 0 ? <option>No Locations Found</option> : null}
                         {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                       </Form.Select>
                     </InputGroup>
                   </Col>
                </Row>

                <hr className="my-4 text-muted opacity-25"/>

                {/* Production Inputs */}
                <div className="mb-2">
                   <p className="small fw-bold text-dark mb-3 d-flex align-items-center"><FiBox className="me-2"/> Production Details</p>
                   <Row className="g-3">
                      <Col xs={6}>
                        <Form.FloatingLabel label="Trays (30s)">
                           <Form.Control type="number" placeholder="0" name="inTray" value={formData.inTray} onChange={handleChange} className="fw-bold" />
                        </Form.FloatingLabel>
                      </Col>
                      <Col xs={6}>
                        <Form.FloatingLabel label="Pack-30">
                           <Form.Control type="number" placeholder="0" name="pack30" value={formData.pack30} onChange={handleChange} />
                        </Form.FloatingLabel>
                      </Col>
                      <Col xs={6}>
                        <Form.FloatingLabel label="Pack-10">
                           <Form.Control type="number" placeholder="0" name="pack10" value={formData.pack10} onChange={handleChange} />
                        </Form.FloatingLabel>
                      </Col>
                      <Col xs={6}>
                        <Form.FloatingLabel label="Pack-06">
                           <Form.Control type="number" placeholder="0" name="pack06" value={formData.pack06} onChange={handleChange} />
                        </Form.FloatingLabel>
                      </Col>
                   </Row>
                </div>

                {/* Total Counter Card */}
                <div className="mt-4 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25 text-center">
                   <small className="text-primary fw-bold text-uppercase ls-1">Calculated Total</small>
                   <h2 className="text-primary fw-bold mb-0 mt-1">{totalEggs.toLocaleString()} <span className="fs-6 text-muted">eggs</span></h2>
                </div>

                <div className="mt-4">
                  <Button type="submit" variant="primary" className="w-100 py-2 fw-bold shadow-sm" disabled={submitLoading || locations.length === 0}>
                     {submitLoading ? 'Saving...' : <><FiCheckCircle className="me-2"/> Save Record</>}
                  </Button>
                </div>

              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* --- RIGHT COLUMN: STOCK LIST (SCROLLABLE) --- */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
               <h6 className="fw-bold text-dark mb-0"><FiLayers className="me-2"/> Inventory Log</h6>
               <InputGroup style={{ maxWidth: '250px' }} size="sm">
                  <InputGroup.Text className="bg-light border-end-0"><FiSearch className="text-muted"/></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search logs..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="border-start-0 bg-light"
                  />
               </InputGroup>
            </Card.Header>
            {/* ADDED SCROLL STYLE HERE */}
            <Card.Body className="p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
               <Table hover responsive className="mb-0 align-middle">
                 {/* ADDED STICKY HEADER STYLE */}
                 <thead className="bg-light text-muted small" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                   <tr>
                     <th className="ps-4 py-3">Date & Location</th>
                     <th className="text-center">Trays</th>
                     <th className="text-center">P-30</th>
                     <th className="text-center">P-10</th>
                     <th className="text-center">P-06</th>
                     <th className="text-end pe-4">Total Qty</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredList.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">No records found</p></td></tr>
                   ) : (
                      filteredList.map((item) => (
                        <tr key={item.id} style={{ fontSize: '0.95rem' }}>
                          <td className="ps-4">
                             <div className="fw-bold text-dark">{item.date}</div>
                             <Badge bg="light" text="dark" className="border fw-normal mt-1 text-muted"><FiMapPin className="me-1"/>{item.location}</Badge>
                          </td>
                          <td className="text-center text-muted">{item.inTray || '-'}</td>
                          <td className="text-center text-muted">{item.pack30 || '-'}</td>
                          <td className="text-center text-muted">{item.pack10 || '-'}</td>
                          <td className="text-center text-muted">{item.pack06 || '-'}</td>
                          <td className="text-end pe-4">
                             <span className="fw-bold text-primary bg-primary bg-opacity-10 px-2 py-1 rounded">
                               {Number(item.totalEggs).toLocaleString()}
                             </span>
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

export default EggInventory;