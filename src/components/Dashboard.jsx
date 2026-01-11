import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { 
  FiHome, FiDollarSign, FiShoppingBag, FiTruck, 
  FiBox, FiActivity, FiPieChart, FiTrendingUp, FiClock, FiLayers 
} from "react-icons/fi";
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Loader from './Loader';

const Dashboard = ({ selectedBranch }) => {
  const [loading, setLoading] = useState(true);
  
  // --- REAL TIME STATS STATE ---
  const [stats, setStats] = useState({
    godownEggs: 0, godownTrays: 0,
    cashBalance: 0, totalIncome: 0, totalExpense: 0,
    totalProduced: 0, todayMortality: 0, totalSold: 0,       
    totalDamaged: 0, lastSale: 'No Sales',
    totalMaterialEntries: 0, materialAssets: 0, materialConsumables: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  // --- TELEGRAM NOTIFICATION (Logic Preserved) ---
  const sendTelegramAlert = async (currentStock) => {
    // 🔴🔴🔴 Your Bot Details 🔴🔴🔴
    const botToken = "8356768418:AAHvdzDg08GCatJOm5WYqpHrCpnYqM7BegI"; 
    const chatId = "7490805299";     
    const branchTag = selectedBranch === 'All' ? 'Total' : selectedBranch;
    const message = `⚠️ *Low Stock Alert (${branchTag})* \n\nHello Admin, \nGodown (${branchTag}) mein stock 30,000 se kam ho gaya hai.\n\n📉 *Current Stock:* ${currentStock.toLocaleString()} Eggs\n\nKripya production check karein.`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const storageKey = `lowStockAlertDate_${selectedBranch}`; 
      const lastSentDate = localStorage.getItem(storageKey);

      if (lastSentDate !== todayStr) {
        await fetch(url);
        localStorage.setItem(storageKey, todayStr);
      }
    } catch (error) {
      console.error("❌ Telegram Send Error:", error);
    }
  };

  // --- FETCH DATA (Updated Filter Logic) ---
  useEffect(() => {
    const calculateDashboard = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. PRODUCTION & LOGS
        const qProd = query(collection(db, "egg_inventory"), orderBy("timestamp", "desc")); 
        const prodSnap = await getDocs(qProd);
        let totalProducedCalc = 0;
        let todayMort = 0;
        const recentLogs = [];

        prodSnap.docs.forEach((doc) => {
            const data = doc.data();
            const itemBranch = data.branch || 'Delhi'; 
            if (selectedBranch !== 'All' && itemBranch !== selectedBranch) return;

            totalProducedCalc += Number(data.totalEggs || 0);
            if(data.date === today) todayMort += (Number(data.mortality || 0) + Number(data.culls || 0));
            if (recentLogs.length < 5) recentLogs.push({ id: doc.id, ...data });
        });

        // 2. SALES
        const qSale = query(collection(db, "sale_book"), orderBy("timestamp", "desc"));
        const saleSnap = await getDocs(qSale);
        let totalSoldCalc = 0;
        let lastParty = 'No Sales Yet';
        let saleFound = false;

        saleSnap.docs.forEach((doc) => {
            const data = doc.data();
            const itemBranch = data.branch || 'Delhi';
            if (selectedBranch !== 'All' && itemBranch !== selectedBranch) return;

            totalSoldCalc += Number(data.grandTotalOrder || 0);
            if (!saleFound && data.deliveries?.length > 0) {
                lastParty = data.deliveries[0].destinationLocation;
                saleFound = true;
            }
        });

        // 3. DAMAGE
        const qDamage = query(collection(db, "egg_damage"));
        const dmgSnap = await getDocs(qDamage);
        let totalDamagedCalc = 0;
        dmgSnap.docs.forEach(doc => {
            const d = doc.data();
            if (selectedBranch !== 'All' && (d.branch || 'Delhi') !== selectedBranch) return;
            totalDamagedCalc += Number(d.totalEggs || 0);
        });

        // 4. CASHBOOK
        const qCash = query(collection(db, "cashbook"));
        const cashSnap = await getDocs(qCash);
        let inc = 0, exp = 0;
        cashSnap.docs.forEach(doc => {
            const d = doc.data();
            if (selectedBranch !== 'All' && (d.branch || 'Delhi') !== selectedBranch) return;
            if(d.type === 'Income') inc += Number(d.amount || 0);
            else exp += Number(d.amount || 0);
        });

        // 5. MATERIAL
        const qMat = query(collection(db, "material_inventory"));
        const matSnap = await getDocs(qMat);
        let matAssets = 0, matConsumables = 0, totalMatEntries = 0;
        matSnap.docs.forEach(doc => {
            const d = doc.data();
            if (selectedBranch !== 'All' && (d.branch || 'Delhi') !== selectedBranch) return;
            totalMatEntries++;
            if(d.category === 'Asset') matAssets++;
            else matConsumables++;
        });

        const currentStock = totalProducedCalc - (totalSoldCalc + totalDamagedCalc);
        const currentTrays = (currentStock / 30).toFixed(1);

        // Alert Check
        if (currentStock < 30000) sendTelegramAlert(currentStock);
        else localStorage.removeItem(`lowStockAlertDate_${selectedBranch}`);

        setStats({
            godownEggs: currentStock > 0 ? currentStock : 0,
            godownTrays: currentTrays > 0 ? currentTrays : 0,
            cashBalance: inc - exp, totalIncome: inc, totalExpense: exp,
            totalProduced: totalProducedCalc, todayMortality: todayMort,
            totalMaterialEntries: totalMatEntries, materialAssets: matAssets, materialConsumables: matConsumables,
            totalSold: totalSoldCalc, totalDamaged: totalDamagedCalc, lastSale: lastParty
        });
        setRecentActivity(recentLogs);
        setLoading(false);

      } catch (err) { console.error("Error:", err); setLoading(false); }
    };
    calculateDashboard();
  }, [selectedBranch]);

  if (loading) return <Loader text={`Analyzing ${selectedBranch === 'All' ? 'Data' : selectedBranch}...`} />;

  const formatRupee = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

  // --- CHART GRADIENTS ---
  const totalPie = stats.godownEggs + stats.totalSold + stats.totalDamaged;
  const pStock = totalPie > 0 ? (stats.godownEggs / totalPie) * 100 : 0;
  const pSold = totalPie > 0 ? (stats.totalSold / totalPie) * 100 : 0;
  const eggPieGradient = `conic-gradient(#f59e0b 0% ${pStock}%, #10b981 ${pStock}% ${pStock + pSold}%, #ef4444 ${pStock + pSold}% 100%)`;

  const totalFin = stats.totalIncome + stats.totalExpense;
  const pInc = totalFin > 0 ? (stats.totalIncome / totalFin) * 100 : 0;
  const cashPieGradient = `conic-gradient(#10b981 0% ${pInc}%, #ef4444 ${pInc}% 100%)`;

  // --- ✅ UPDATED STYLES FOR SMOOTH RESIZING ---
  const s = {
    page: { 
        maxWidth: '100%', 
        margin: '0 auto', 
        paddingBottom: '50px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // Smooth Page Resize
    },
    
    heroCard: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px', padding: '30px', color: 'white',
        boxShadow: '0 15px 40px -10px rgba(15, 23, 42, 0.4)',
        position: 'relative', overflow: 'hidden', border: 'none', marginBottom: '30px',
        transition: 'all 0.3s ease-in-out' // Smooth Card Resize
    },
    
    featureCard: (color) => ({
        borderRadius: '20px', padding: '25px', color: 'white', position: 'relative', overflow: 'hidden', border: 'none',
        background: color === 'green' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                    color === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                    color === 'orange' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                    'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', 
        height: '100%', // Ensures Equal Height
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, width 0.3s ease'
    }),
    
    chartCard: {
        backgroundColor: 'white', borderRadius: '24px', padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', 
        height: '100%', // Full Height for Alignment
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transition: 'all 0.3s ease-in-out'
    },

    label: { fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 },
    valueMed: { fontSize: '1.8rem', fontWeight: '800', margin: 0 },
    pieCircle: (gradient) => ({
        width: '160px', height: '160px', borderRadius: '50%', background: gradient,
        margin: '0 auto', position: 'relative', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
    }),
    pieHole: {
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
    },
    bgIcon: { position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '6rem', opacity: 0.1, transform: 'rotate(-10deg)' }
  };

  return (
    <div className="fade-in" style={s.page}>
      
      {/* 1. HERO CARD */}
      <Card style={s.heroCard}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center position-relative" style={{zIndex:1}}>
              <div className="mb-3 mb-md-0">
                  <p style={s.label} className="text-warning mb-2"><FiHome className="me-2"/> Godown Stock ({selectedBranch === 'All' ? 'Total' : selectedBranch})</p>
                  <div className="d-flex align-items-baseline gap-3">
                      <h1 style={{fontSize:'3rem', fontWeight:'800', lineHeight:1}}>{stats.godownEggs.toLocaleString()}</h1>
                      <div className="text-white-50">Eggs</div>
                  </div>
                  <div className="mt-2 text-warning fw-bold fs-5">
                      {Number(stats.godownTrays).toLocaleString()} <span className="text-white-50 fs-6 fw-normal">Trays (Approx)</span>
                  </div>
              </div>
              <div className="text-end">
                  <div className="p-3 rounded-3" style={{background: 'rgba(255,255,255,0.1)'}}>
                      <small className="text-white-50 fw-bold d-block mb-1">LAST DISPATCH</small>
                      <h5 className="fw-bold mb-0 text-white">{stats.lastSale}</h5>
                  </div>
              </div>
          </div>
          <FiBox style={{...s.bgIcon, fontSize:'10rem', opacity:0.05}} />
      </Card>

      {/* 2. KPI CARDS (Responsive Grid) */}
      <Row className="g-4 mb-4">
          <Col xs={12} sm={6} lg={3}>
              <Card style={s.featureCard('green')}>
                  <div className="position-relative" style={{zIndex:1}}>
                      <p style={s.label}>Cash Balance</p>
                      <h3 style={s.valueMed}>{formatRupee(stats.cashBalance)}</h3>
                      <div className="mt-3 border-top border-white border-opacity-25 pt-2">
                          <small>Inc: {formatRupee(stats.totalIncome)}</small>
                      </div>
                  </div>
                  <FiDollarSign style={s.bgIcon}/>
              </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
              <Card style={s.featureCard('orange')}>
                  <div className="position-relative" style={{zIndex:1}}>
                      <p style={s.label}>Total Sent</p>
                      <h3 style={s.valueMed}>{stats.totalSold.toLocaleString()}</h3>
                      <div className="mt-3 border-top border-white border-opacity-25 pt-2">
                          <small className="fw-bold"><FiTruck className="me-1"/> Lifetime Dispatches</small>
                      </div>
                  </div>
                  <FiTruck style={s.bgIcon}/>
              </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
              <Card style={s.featureCard('blue')}>
                  <div className="position-relative" style={{zIndex:1}}>
                      <p style={s.label}>Material Inventory</p>
                      <h3 style={s.valueMed}>{stats.totalMaterialEntries} <span className="fs-6 fw-normal">Items</span></h3>
                      <div className="mt-3 border-top border-white border-opacity-25 pt-2 d-flex justify-content-between">
                          <small><strong>{stats.materialAssets}</strong> Assets</small>
                          <small><strong>{stats.materialConsumables}</strong> Materials</small>
                      </div>
                  </div>
                  <FiShoppingBag style={s.bgIcon}/>
              </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
              <Card style={s.featureCard('purple')}>
                  <div className="position-relative" style={{zIndex:1}}>
                      <p style={s.label}>Total Production</p>
                      <h3 style={s.valueMed}>{stats.totalProduced.toLocaleString()}</h3>
                      <div className="mt-3 border-top border-white border-opacity-25 pt-2">
                          <small className="fw-bold d-block" style={{fontSize: '0.9rem'}}>
                             <FiLayers className="me-1"/> 
                             {(stats.totalProduced / 30).toFixed(1)} Trays
                          </small>
                      </div>
                  </div>
                  <FiActivity style={s.bgIcon}/>
              </Card>
          </Col>
      </Row>

      {/* 3. CHARTS ROW (Equal Height & Flex Layout) */}
      <Row className="g-4">
          <Col xs={12} lg={4}>
              <div style={s.chartCard}>
                  <h5 className="fw-bold text-dark mb-4"><FiPieChart className="me-2 text-primary"/> Egg Statistics</h5>
                  <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1">
                      <div style={s.pieCircle(eggPieGradient)}>
                          <div style={s.pieHole}>
                              <span className="fw-bold fs-4 text-dark">Total</span>
                              <span className="small text-muted">Stock</span>
                          </div>
                      </div>
                      <div className="w-100 mt-4">
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                              <span className="small fw-bold text-muted">In Stock</span>
                              <span className="text-warning fw-bold">{stats.godownEggs.toLocaleString()}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                              <span className="small fw-bold text-muted">Total Sold</span>
                              <span className="text-success fw-bold">{stats.totalSold.toLocaleString()}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                              <span className="small fw-bold text-muted">Total Damaged</span>
                              <span className="text-danger fw-bold">{stats.totalDamaged.toLocaleString()}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </Col>

          <Col xs={12} lg={4}>
              <div style={s.chartCard}>
                 <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-dark mb-0"><FiClock className="me-2 text-warning"/> Recent Activity</h5>
                    <Badge bg="light" text="dark" className="border">Last 5 Entries</Badge>
                 </div>
                 
                 <div className="d-flex flex-column gap-3 flex-grow-1 justify-content-start">
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-4 text-muted small my-auto">No recent entries found for {selectedBranch}.</div>
                    ) : (
                        recentActivity.map((log) => (
                            <div key={log.id} className="d-flex align-items-center justify-content-between p-2 border-bottom">
                                <div>
                                    <div className="fw-bold text-dark" style={{fontSize:'0.9rem'}}>{log.date}</div>
                                    <small className="text-muted">{log.location}</small>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold text-success">+{Number(log.totalEggs).toLocaleString()}</div>
                                    <small className="text-muted">Eggs</small>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
              </div>
          </Col>

          <Col xs={12} lg={4}>
              <div style={s.chartCard}>
                  <h5 className="fw-bold text-dark mb-4"><FiTrendingUp className="me-2 text-success"/> Cash Flow</h5>
                  <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1">
                      <div style={s.pieCircle(cashPieGradient)}>
                          <div style={s.pieHole}>
                              <span className="fw-bold fs-4 text-dark">₹</span>
                              <span className="small text-muted">Finance</span>
                          </div>
                      </div>
                      
                      <div className="w-100 mt-4">
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                              <span className="small fw-bold text-muted">Income</span>
                              <span className="text-success fw-bold">{formatRupee(stats.totalIncome)}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                              <span className="small fw-bold text-muted">Expense</span>
                              <span className="text-danger fw-bold">{formatRupee(stats.totalExpense)}</span>
                          </div>
                          <div className="text-center mt-2">
                              <small className="text-muted text-uppercase fw-bold" style={{fontSize:'0.7rem'}}>Net Profit</small>
                              <div className={`fw-bold fs-5 ${stats.cashBalance >= 0 ? 'text-primary' : 'text-danger'}`}>
                                {formatRupee(stats.cashBalance)}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </Col>
      </Row>
    </div>
  );
};

export default Dashboard;