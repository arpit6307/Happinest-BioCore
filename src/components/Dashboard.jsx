import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { 
  FiTrendingUp, FiTruck, FiPackage, FiActivity, 
  FiDollarSign, FiBox, FiSun, FiMoon, FiVolume2, FiPieChart, FiBarChart2, FiTarget 
} from "react-icons/fi";
import { collection, query, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { format, subDays } from 'date-fns';
import Loader from './Loader';

const Dashboard = () => {
  // --- STATES ---
  const [stats, setStats] = useState({ 
    totalEggs: 0, totalMaterials: 0, totalSales: 0, cashBalance: 0 
  });
  const [prodGraphData, setProdGraphData] = useState([]);
  const [salesGraphData, setSalesGraphData] = useState([]);
  
  const [cashChartData, setCashChartData] = useState([]);
  const [materialChartData, setMaterialChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [efficiencyScore, setEfficiencyScore] = useState(0);

  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState({ title: '', icon: null, quote: '' });

  // COLORS
  const PIE_COLORS = ['#198754', '#dc3545']; 
  const BAR_COLORS = ['#0d6efd', '#6610f2', '#0dcaf0', '#ffc107', '#d63384'];

  const quotes = [
    "Quality means doing it right when no one is looking.",
    "Your warehouse is the heart of your business.",
    "Focus on being productive instead of busy.",
    "Small steps in the right direction can turn out to be the biggest step."
  ];

  // --- 1. GREETING LOGIC ---
  useEffect(() => {
    const hour = new Date().getHours();
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    let title = "Good Morning", icon = <FiSun className="text-warning" size={28} />;
    
    if (hour >= 12 && hour < 17) { title = "Good Afternoon"; icon = <FiSun className="text-warning" size={28} />; } 
    else if (hour >= 17) { title = "Good Evening"; icon = <FiMoon className="text-primary" size={28} />; }

    setGreeting({ title, icon, quote: randomQuote });
    
    // Voice Greeting
    setTimeout(() => {
        if ('speechSynthesis' in window) {
          const user = auth.currentUser;
          const msg = new SpeechSynthesisUtterance();
          const name = user?.email?.includes('admin') ? "Arpit" : "Manager";
          msg.text = `${title}, ${name}. Dashboard Updated.`;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(msg);
        }
    }, 1000);
  }, []);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. PRODUCTION DATA (Eggs)
        const eggSnapshot = await getDocs(query(collection(db, "egg_inventory"), orderBy("timestamp", "desc")));
        const eggData = eggSnapshot.docs.map(doc => doc.data());
        const totalEggs = eggData.reduce((acc, curr) => acc + (Number(curr.totalEggs) || 0), 0);

        // B. SALES DATA (New Feature)
        const saleSnapshot = await getDocs(query(collection(db, "sale_book"), orderBy("date", "desc")));
        const saleData = saleSnapshot.docs.map(doc => doc.data());
        const totalSales = saleData.reduce((acc, curr) => acc + (Number(curr.grandTotalOrder) || 0), 0);

        // Graph Data Processing (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
        
        // Production Graph
        const prodChart = last7Days.map(date => {
            const dayTotal = eggData.filter(item => item.date === date).reduce((acc, curr) => acc + (Number(curr.totalEggs) || 0), 0);
            return { name: format(new Date(date), 'dd MMM'), eggs: dayTotal };
        });

        // Sales Graph
        const salesChart = last7Days.map(date => {
            const dayTotal = saleData.filter(item => item.date === date).reduce((acc, curr) => acc + (Number(curr.grandTotalOrder) || 0), 0);
            return { name: format(new Date(date), 'dd MMM'), sales: dayTotal };
        });

        // C. MATERIALS
        const matSnapshot = await getDocs(collection(db, "material_inventory"));
        const matData = matSnapshot.docs.map(doc => doc.data());
        // Top 5 Materials
        const sortedMats = [...matData].sort((a,b) => Number(b.quantity) - Number(a.quantity)).slice(0, 5);
        const matChart = sortedMats.map(m => ({ name: m.itemName.split(' ')[0], qty: Number(m.quantity) }));

        // D. CASHBOOK
        const cashSnapshot = await getDocs(collection(db, "cashbook"));
        let income = 0, expense = 0;
        cashSnapshot.docs.forEach(doc => {
            const d = doc.data();
            if (d.type === 'Income') income += Number(d.amount);
            else expense += Number(d.amount);
        });

        // E. EFFICIENCY SCORE
        let score = 60;
        if (income > expense) score += 20;
        if (totalSales > 0) score += 10;
        if (totalEggs > totalSales) score += 10; // Stock buffer
        setEfficiencyScore(Math.min(score, 100));

        setStats({ totalEggs, totalMaterials: matData.length, totalSales, cashBalance: income - expense });
        setProdGraphData(prodChart);
        setSalesGraphData(salesChart);
        setCashChartData([{ name: 'Income', value: income }, { name: 'Expense', value: expense }]);
        setMaterialChartData(matChart);
        setRecentActivity(eggData.slice(0, 5)); // Logs from egg inventory for now
        setLoading(false);

      } catch (error) { console.error("Error:", error); setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Loader text="Updating Dashboard..." />;

  return (
    <div className="fade-in">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm border">
        <div className="d-flex align-items-center gap-3">
            <div className="bg-light p-3 rounded-circle border">{greeting.icon}</div>
            <div>
                <h3 className="fw-bold text-dark mb-0">{greeting.title}</h3>
                <small className="text-muted fst-italic">"{greeting.quote}"</small>
            </div>
        </div>
        <div className="text-end d-none d-lg-block border-start ps-3">
            <span className="d-block fw-bold text-dark">{new Date().toLocaleDateString('en-GB', {weekday: 'long'})}</span>
            <span className="text-muted small">{new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
        </div>
      </div>

      {/* ROW 1: KPI CARDS (Replaced Alerts with Sales) */}
      <Row className="g-4 mb-4">
        {/* Production */}
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon-bg bg-primary-subtle text-primary"><FiBox size={24} /></div>
            <div><p className="stat-label">Total Production</p><h3 className="stat-value">{stats.totalEggs.toLocaleString()}</h3><small className="text-success fw-bold font-xs"><FiTrendingUp/> +12% this week</small></div>
          </div>
        </Col>

        {/* Cash */}
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon-bg bg-success-subtle text-success"><FiDollarSign size={24} /></div>
            <div><p className="stat-label">Cash In Hand</p><h3 className="stat-value">₹ {stats.cashBalance.toLocaleString()}</h3><small className="text-muted font-xs">Updated just now</small></div>
          </div>
        </Col>

        {/* Materials */}
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon-bg bg-info-subtle text-info"><FiPackage size={24} /></div>
            <div><p className="stat-label">Inventory Items</p><h3 className="stat-value">{stats.totalMaterials}</h3><small className="text-muted font-xs">Active SKUs</small></div>
          </div>
        </Col>

        {/* NEW: SALES CARD (Replaces Alerts) */}
        <Col md={3}>
          <div className="stat-card border-warning-subtle">
            <div className="stat-icon-bg bg-warning-subtle text-dark"><FiTruck size={24} /></div>
            <div>
                <p className="stat-label">Total Dispatch</p>
                <h3 className="stat-value text-dark">{stats.totalSales.toLocaleString()}</h3>
                <small className="text-warning fw-bold font-xs">Eggs Sold</small>
            </div>
          </div>
        </Col>
      </Row>

      {/* ROW 2: PRODUCTION GRAPH & SALES GRAPH (SIDE BY SIDE) */}
      <Row className="g-4 mb-4">
        
        {/* Production Graph */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 dash-card">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between">
              <div><h6 className="fw-bold text-dark mb-0">Production Trend</h6><small className="text-muted">Last 7 Days Collection</small></div>
              <FiActivity className="text-primary"/>
            </Card.Header>
            <Card.Body className="px-4 pb-4" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prodGraphData}>
                  <defs><linearGradient id="colorEggs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d6efd" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border:'none', boxShadow:'0 5px 15px rgba(0,0,0,0.1)' }}/>
                  <Area type="monotone" dataKey="eggs" stroke="#0d6efd" strokeWidth={3} fillOpacity={1} fill="url(#colorEggs)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* NEW: SALES GRAPH */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 dash-card">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between">
              <div><h6 className="fw-bold text-dark mb-0">Dispatch Trend (Sales)</h6><small className="text-muted">Last 7 Days Sales</small></div>
              <FiTruck className="text-warning"/>
            </Card.Header>
            <Card.Body className="px-4 pb-4" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesGraphData}>
                  <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffc107" stopOpacity={0.2}/><stop offset="95%" stopColor="#ffc107" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border:'none', boxShadow:'0 5px 15px rgba(0,0,0,0.1)' }}/>
                  <Area type="monotone" dataKey="sales" stroke="#ffc107" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ROW 3: FINANCIAL HEALTH & MATERIALS */}
      <Row className="g-4 mb-4">
        {/* Cash Pie */}
        <Col lg={6}>
            <Card className="border-0 shadow-sm h-100 dash-card">
                <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
                    <h6 className="fw-bold text-dark mb-0"><FiPieChart className="me-2 text-primary"/> Financial Health</h6>
                </Card.Header>
                <Card.Body className="px-4 pb-4 position-relative" style={{ height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={cashChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                {cashChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip/>
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="position-absolute top-50 start-50 translate-middle text-center" style={{marginTop: '-10px'}}>
                         <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>NET</small>
                         <strong className={stats.cashBalance >= 0 ? "text-success" : "text-danger"}>{stats.cashBalance >= 0 ? '+' : ''}{stats.cashBalance.toLocaleString()}</strong>
                    </div>
                </Card.Body>
            </Card>
        </Col>

        {/* Material Bar */}
        <Col lg={6}>
            <Card className="border-0 shadow-sm h-100 dash-card">
                <Card.Header className="bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between">
                    <h6 className="fw-bold text-dark mb-0"><FiBarChart2 className="me-2 text-info"/> Top Stock</h6>
                    <Badge bg={efficiencyScore > 80 ? 'success' : 'primary'}><FiTarget className="me-1"/> Score: {efficiencyScore}</Badge>
                </Card.Header>
                <Card.Body className="px-4 pb-4" style={{ height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={materialChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="qty" fill="#0d6efd" radius={[5, 5, 0, 0]}>
                                {materialChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card.Body>
            </Card>
        </Col>
      </Row>

      {/* ROW 4: RECENT LOGS (Full Width) */}
      <Row className="g-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm dash-card">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4"><h6 className="fw-bold text-dark mb-0">Recent Production Logs</h6></Card.Header>
            <Card.Body className="p-0">
              <Table hover className="mb-0 align-middle custom-table small">
                <thead className="bg-light text-muted"><tr><th className="ps-4">Date/Location</th><th className="text-end pe-4">Qty Added</th></tr></thead>
                <tbody>
                  {recentActivity.map((item, index) => (
                    <tr key={index}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div className="icon-square bg-light text-dark rounded me-3"><FiActivity /></div>
                          <div><span className="d-block fw-bold text-dark">{item.location}</span><small className="text-muted">{item.date}</small></div>
                        </div>
                      </td>
                      <td className="text-end pe-4"><span className="fw-bold text-primary">+{Number(item.totalEggs).toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </div>
  );
};

export default Dashboard;