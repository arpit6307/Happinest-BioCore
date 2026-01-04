import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, InputGroup, Alert } from 'react-bootstrap';
import { 
  FiPlus, FiSearch, FiDownload, FiPackage, FiTool, FiCalendar, 
  FiLayers, FiTrash2, FiSave, FiFilter, FiBriefcase, FiArchive, FiX 
} from "react-icons/fi";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';

const MaterialInventory = () => {
  const [itemOptions, setItemOptions] = useState([]); 
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // --- NEW BATCH STATE ---
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchList, setBatchList] = useState([]); // List of items to be saved
  const [currentEntry, setCurrentEntry] = useState({ 
    itemName: '', variant: '', category: 'Consumable', quantity: '', unit: 'Nos' 
  });
  const [currentVariants, setCurrentVariants] = useState([]); // Stores variants for selected item

  // --- 1. FETCH DATA ---
  useEffect(() => {
    // Fetch Settings Items
    const fetchItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "settings_items"));
        const items = querySnapshot.docs.map(doc => doc.data());
        setItemOptions(items);
      } catch (err) { console.error(err); }
    };
    fetchItems();

    // Fetch Inventory
    const q = query(collection(db, "material_inventory"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInventoryList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setLoading(false));
    return () => unsubscribe();
  }, []);

  // --- 2. HANDLERS ---
  const handleItemSelect = (e) => {
    const selectedName = e.target.value;
    const itemData = itemOptions.find(i => i.name === selectedName);
    
    // Auto-fill and check for variants
    if (itemData) {
        setCurrentEntry({ 
            ...currentEntry, 
            itemName: selectedName, 
            category: itemData.category || 'Consumable', 
            unit: itemData.unit || 'Nos',
            variant: '' // Reset variant
        });
        // Set variants if available
        setCurrentVariants(itemData.variants || []);
    } else {
        setCurrentEntry({ ...currentEntry, itemName: selectedName, variant: '' });
        setCurrentVariants([]);
    }
  };
  
  const handleEntryChange = (e) => setCurrentEntry({ ...currentEntry, [e.target.name]: e.target.value });
  
  // ADD TO BATCH LIST (Local)
  const addToBatch = (e) => {
      e.preventDefault();
      if (!currentEntry.itemName) return alert("Please select an Item Name.");
      if (!currentEntry.quantity) return alert("Please enter Quantity.");

      const newItem = { ...currentEntry, id: Date.now() }; // Temp ID
      setBatchList([...batchList, newItem]);
      
      // Reset only item fields, keep other logical defaults
      setCurrentEntry(prev => ({ ...prev, itemName: '', variant: '', quantity: '' }));
      setCurrentVariants([]);
  };

  // REMOVE FROM BATCH LIST
  const removeFromBatch = (id) => {
      setBatchList(batchList.filter(item => item.id !== id));
  };

  // FINAL SAVE TO FIREBASE
  const handleFinalSubmit = async () => {
    if (batchList.length === 0) return alert("No items to save. Please add items to the list first.");
    
    setSubmitLoading(true);
    try {
        // Loop and save all
        const promises = batchList.map(item => {
             // Create display name: Label (Small)
             const finalName = item.variant ? `${item.itemName} (${item.variant})` : item.itemName;
             return addDoc(collection(db, "material_inventory"), { 
                 date: batchDate,
                 itemName: finalName,
                 category: item.category,
                 quantity: item.quantity,
                 unit: item.unit,
                 timestamp: serverTimestamp() 
             });
        });

        await Promise.all(promises);
        
        setBatchList([]); // Clear Batch
        alert("All items saved successfully!");
    } catch(err) { alert("Error saving data"); }
    setSubmitLoading(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to remove this record?")) await deleteDoc(doc(db, "material_inventory", id));
  };

  // --- 3. PROFESSIONAL EXPORT ---
  const filteredList = inventoryList.filter(item => 
    (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportPDF = async () => {
    const doc = new jsPDF();

    // Helper to load logo
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

    // Header
    if(imgData) doc.addImage(imgData, 'JPEG', 14, 10, 20, 20);
    doc.setFontSize(16);
    doc.setTextColor(13, 110, 253);
    doc.text("Happinest Poultry Products Pvt. Ltd.", 40, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Assets & Material Inventory Statement", 40, 24);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 40, 29);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    // Summary
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 40, 182, 18, 2, 2, 'F');
    const assetCount = filteredList.filter(i => i.category === 'Asset').length;
    const materialCount = filteredList.filter(i => i.category === 'Consumable').length;
    
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("Total Materials:", 20, 52);
    doc.setFont("helvetica", "bold");
    doc.text(`${materialCount}`, 50, 52);
    
    doc.setFont("helvetica", "normal");
    doc.text("Fixed Assets:", 90, 52);
    doc.setFont("helvetica", "bold");
    doc.text(`${assetCount}`, 115, 52);

    // Table
    const rows = filteredList.map(item => [item.date, item.itemName, item.category, item.quantity, item.unit]);
    autoTable(doc, { 
        startY: 65,
        head: [["Date", "Item Name", "Category", "Qty", "Unit"]], 
        body: rows, 
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Confidential | System Generated by BioCore | Page ${data.pageNumber} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }
    });
    doc.save(`Material_Report.pdf`);
  };

  if (loading) return <Loader text="Loading Inventory..." />;

  return (
    <div className="fade-in">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 className="fw-bold text-dark mb-1">Asset & Material Control</h4>
           <p className="text-muted small mb-0">Track fixed assets, machinery, and daily consumables.</p>
        </div>
        <Button variant="outline-primary" size="sm" onClick={exportPDF}>
           <FiDownload className="me-2"/> Export Data
        </Button>
      </div>

      <Row className="g-4">
        
        {/* --- LEFT: ADD NEW ITEM (BATCH MODE) --- */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
               <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                 <FiPlus className="me-2 text-primary"/> New Stock Entry
               </h6>
            </Card.Header>
            <Card.Body className="d-flex flex-column">
              {itemOptions.length === 0 && (
                 <Alert variant="warning" className="small py-2"><FiFilter className="me-2"/> Warning: No Items in Settings.</Alert>
              )}

              {/* 1. DATE SELECTION (GLOBAL) */}
              <div className="mb-3 p-3 bg-light rounded border">
                    <Form.Label className="small fw-bold text-muted mb-1">Entry Date (For All Items)</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-white border-end-0 text-muted"><FiCalendar/></InputGroup.Text>
                        <Form.Control type="date" value={batchDate} onChange={(e)=>setBatchDate(e.target.value)} className="border-start-0 fw-bold" required />
                    </InputGroup>
              </div>

              {/* 2. ITEM FORM */}
              <Form onSubmit={addToBatch}>
                <div className="mb-3">
                    <Form.Label className="small fw-bold text-muted">Select Item</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted"><FiPackage/></InputGroup.Text>
                        <Form.Select name="itemName" value={currentEntry.itemName} onChange={handleItemSelect} className="border-start-0 bg-light fw-bold" required>
                            <option value="">-- Choose Item --</option>
                            {itemOptions.map((opt, idx) => <option key={idx} value={opt.name}>{opt.name}</option>)}
                            <option value="Other">Other (Manual Entry)</option>
                        </Form.Select>
                    </InputGroup>
                </div>

                {/* SHOW VARIANT DROPDOWN IF AVAILABLE */}
                {currentVariants.length > 0 && (
                    <div className="mb-3 animation-fade-in">
                        <Form.Label className="small fw-bold text-primary">Item Type / Variant</Form.Label>
                        <Form.Select name="variant" value={currentEntry.variant} onChange={handleEntryChange} className="bg-primary bg-opacity-10 border-primary">
                            <option value="">-- Select Type --</option>
                            {currentVariants.map((v, i) => <option key={i} value={v}>{v}</option>)}
                        </Form.Select>
                    </div>
                )}

                <Row className="g-2 mb-3">
                    <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted">Category</Form.Label>
                        <Form.Select name="category" value={currentEntry.category} onChange={handleEntryChange} className="bg-light">
                            <option value="Consumable">Material</option>
                            <option value="Asset">Fixed Asset</option>
                        </Form.Select>
                    </Col>
                    <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted">Unit</Form.Label>
                        <Form.Select name="unit" value={currentEntry.unit} onChange={handleEntryChange} className="bg-light">
                            <option value="Nos">Nos</option><option value="Bdl">Bdl</option><option value="Kg">Kg</option><option value="Box">Box</option><option value="Ltr">Ltr</option>
                        </Form.Select>
                    </Col>
                </Row>

                <div className="mb-3">
                    <Form.Label className="small fw-bold text-muted">Quantity</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" name="quantity" value={currentEntry.quantity} onChange={handleEntryChange} placeholder="Qty" className="fw-bold" />
                        <Button type="submit" variant="outline-primary" style={{minWidth: '80px'}} title="Add to List">
                             <FiPlus size={20}/>
                        </Button>
                    </div>
                </div>
              </Form>
              
              <hr className="my-2"/>

              {/* 3. BATCH LIST PREVIEW */}
              <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: '200px' }}>
                 {batchList.length > 0 ? (
                    <Table size="sm" className="mb-0 small" borderless>
                        <thead className="text-muted bg-light"><tr><th>Item</th><th>Qty</th><th></th></tr></thead>
                        <tbody>
                            {batchList.map((item) => (
                                <tr key={item.id} className="border-bottom">
                                    <td className="align-middle">
                                        <div className="fw-bold text-dark">{item.itemName}</div>
                                        {item.variant && <Badge bg="light" text="dark" className="border px-1">{item.variant}</Badge>}
                                    </td>
                                    <td className="align-middle fw-bold">{item.quantity} {item.unit}</td>
                                    <td className="text-end"><FiX className="text-danger cursor-pointer" onClick={()=>removeFromBatch(item.id)}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                 ) : (
                    <div className="text-center text-muted py-3 small fst-italic">Items added will appear here...</div>
                 )}
              </div>

              <Button onClick={handleFinalSubmit} variant="primary" className="w-100 py-2 fw-bold mt-auto" disabled={submitLoading || batchList.length === 0}>
                  {submitLoading ? 'Saving...' : <><FiSave className="me-2"/> Save All to Inventory</>}
              </Button>

            </Card.Body>
          </Card>
        </Col>

        {/* --- RIGHT: INVENTORY LIST (WITH SCROLL) --- */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
             <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
               <h6 className="fw-bold text-dark mb-0"><FiLayers className="me-2"/> Current Stock Log</h6>
               <InputGroup style={{ maxWidth: '250px' }} size="sm">
                  <InputGroup.Text className="bg-light border-end-0"><FiSearch className="text-muted"/></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search items..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="border-start-0 bg-light"
                  />
               </InputGroup>
            </Card.Header>
            {/* ADDED SCROLL STYLE HERE */}
            <Card.Body className="p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
               <Table hover responsive className="mb-0 align-middle">
                 <thead className="bg-light text-muted small" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                   <tr>
                     <th className="ps-4 py-3">Date</th>
                     <th>Item Details</th>
                     <th>Type</th>
                     <th className="text-center">Qty</th>
                     <th className="text-end pe-4">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                    {filteredList.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted"><FiArchive size={30} className="mb-2 opacity-50"/><p className="mb-0">Inventory is empty</p></td></tr>
                    ) : (
                        filteredList.map((item) => (
                            <tr key={item.id} style={{ fontSize: '0.95rem' }}>
                                <td className="ps-4 text-muted small">{item.date}</td>
                                <td>
                                    <div className="fw-bold text-dark">{item.itemName}</div>
                                </td>
                                <td>
                                    {item.category === 'Asset' ? 
                                        <Badge bg="info" text="dark" className="d-inline-flex align-items-center"><FiTool className="me-1"/> Asset</Badge> : 
                                        <Badge bg="warning" text="dark" className="d-inline-flex align-items-center"><FiPackage className="me-1"/> Material</Badge>
                                    }
                                </td>
                                <td className="text-center">
                                    <span className="fw-bold fs-6">{item.quantity}</span> <span className="text-muted small">{item.unit}</span>
                                </td>
                                <td className="text-end pe-4">
                                    <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(item.id)}>
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

export default MaterialInventory;