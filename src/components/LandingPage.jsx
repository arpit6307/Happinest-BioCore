import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { 
  FiArrowRight, FiActivity, FiBox, FiTrendingUp, FiShield, 
  FiLayers, FiPieChart, FiCheckCircle, FiHexagon, FiTruck, 
  FiDollarSign, FiCpu, FiGrid, FiCommand, FiZap 
} from "react-icons/fi";

const LandingPage = ({ onLoginClick }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- STYLES ---
  const s = {
    wrapper: {
      minHeight: '100vh',
      background: '#030712', // Deep Dark Blue/Black
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      overflowX: 'hidden',
      position: 'relative'
    },
    // Animated Background Glows
    glow1: {
      position: 'absolute', top: '-10%', left: '20%', width: '600px', height: '600px',
      background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(0,0,0,0) 70%)',
      filter: 'blur(80px)', zIndex: 0, animation: 'pulse 10s infinite'
    },
    glow2: {
      position: 'absolute', top: '40%', right: '-10%', width: '800px', height: '800px',
      background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(0,0,0,0) 70%)',
      filter: 'blur(100px)', zIndex: 0
    },
    
    // Navbar
    nav: {
      padding: '20px 0', position: 'sticky', top: 0, zIndex: 100,
      background: scrollY > 50 ? 'rgba(3, 7, 18, 0.8)' : 'transparent',
      backdropFilter: 'blur(20px)',
      borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.1)' : 'none',
      transition: 'all 0.3s ease'
    },
    
    // Hero
    hero: {
      padding: '120px 0 100px 0', position: 'relative', zIndex: 1,
      textAlign: 'center'
    },
    heroBadge: {
      background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)',
      color: '#38bdf8', padding: '8px 16px', borderRadius: '30px', 
      fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', marginBottom: '30px'
    },
    heroTitle: {
      fontSize: '4.5rem', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-0.02em',
      background: 'linear-gradient(to right, #ffffff 20%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      marginBottom: '24px'
    },
    heroSub: {
      fontSize: '1.25rem', color: '#94a3b8', maxWidth: '700px', margin: '0 auto 50px auto', lineHeight: '1.6'
    },
    
    // Buttons
    primaryBtn: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: 'none', padding: '16px 40px', borderRadius: '12px',
      fontSize: '1.1rem', fontWeight: '600', color: 'white',
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
      transition: 'all 0.3s ease'
    },
    glassBtn: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '16px 40px', borderRadius: '12px',
      fontSize: '1.1rem', fontWeight: '600', color: 'white',
      backdropFilter: 'blur(10px)', transition: 'all 0.3s ease'
    },

    // Feature Grid
    gridSection: { padding: '80px 0', position: 'relative', zIndex: 1 },
    gridCard: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '24px', padding: '40px', height: '100%',
      backdropFilter: 'blur(10px)', transition: 'all 0.4s ease',
      overflow: 'hidden', position: 'relative'
    },
    gridIcon: {
      width: '60px', height: '60px', borderRadius: '16px',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.8rem', color: '#38bdf8', marginBottom: '25px'
    },
    
    // Stats Strip
    statsStrip: {
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
      padding: '60px 0', marginTop: '40px'
    },

    // Mockup Box (CSS made UI)
    mockupBox: {
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)', marginTop: '30px', opacity: 0.8
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.glow1}></div>
      <div style={s.glow2}></div>

      {/* 1. NAVBAR */}
      <div style={s.nav}>
        <Container className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div style={{width:'36px', height:'36px', background:'#3b82f6', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>
               <FiHexagon size={20} color="white"/>
            </div>
            <span className="fw-bold fs-5 tracking-wide">BIOCORE <span style={{color:'#3b82f6'}}>PRO</span></span>
          </div>
          <Button variant="link" className="text-white text-decoration-none fw-bold me-3 opacity-75 hover-opacity-100" onClick={onLoginClick}>Docs</Button>
          <button style={{...s.primaryBtn, padding:'10px 24px', fontSize:'0.9rem'}} onClick={onLoginClick}>Sign In</button>
        </Container>
      </div>

      {/* 2. HERO SECTION */}
      <Container style={s.hero}>
         <div className="fade-in-up">
            <span style={s.heroBadge}><FiZap className="me-2"/> The Future of Poultry ERP is Here</span>
         </div>
         <h1 style={s.heroTitle} className="fade-in-up delay-1">
            Precision Farming. <br/>
            <span style={{color:'#3b82f6'}}>Infinite Scalability.</span>
         </h1>
         <p style={s.heroSub} className="fade-in-up delay-2">
            BioCore OS transforms your poultry business into a data-driven powerhouse. 
            Automate production tracking, logistics, and finance in one unified ecosystem.
         </p>
         <div className="d-flex justify-content-center gap-3 fade-in-up delay-3">
            <button style={s.primaryBtn} onClick={onLoginClick} className="hover-glow">
               Get Started Now <FiArrowRight className="ms-2"/>
            </button>
            <button style={s.glassBtn} onClick={onLoginClick} className="hover-light">
               View Live Demo
            </button>
         </div>
         
         {/* Hero Dashboard Preview (Abstract) */}
         <div className="mt-5 fade-in-up delay-4" style={{
            position:'relative', maxWidth:'900px', margin:'80px auto 0', 
            borderRadius:'20px 20px 0 0', border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none',
            background:'rgba(15, 23, 42, 0.6)', backdropFilter:'blur(20px)', padding:'20px',
            boxShadow:'0 -20px 60px rgba(59, 130, 246, 0.15)'
         }}>
             <div className="d-flex gap-2 mb-4">
                <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#ef4444'}}></div>
                <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#f59e0b'}}></div>
                <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#10b981'}}></div>
             </div>
             <Row className="g-4">
                <Col md={4}><div style={{height:'120px', background:'#1e293b', borderRadius:'12px', opacity:0.5}}></div></Col>
                <Col md={4}><div style={{height:'120px', background:'#1e293b', borderRadius:'12px', opacity:0.5}}></div></Col>
                <Col md={4}><div style={{height:'120px', background:'#1e293b', borderRadius:'12px', opacity:0.5}}></div></Col>
                <Col md={8}><div style={{height:'200px', background:'#1e293b', borderRadius:'12px', opacity:0.3}}></div></Col>
                <Col md={4}><div style={{height:'200px', background:'#1e293b', borderRadius:'12px', opacity:0.3}}></div></Col>
             </Row>
         </div>
      </Container>

      {/* 3. STATS STRIP */}
      <div style={s.statsStrip}>
         <Container>
            <Row className="text-center g-4">
               <Col md={3} className="border-end border-dark">
                  <h2 className="fw-bold text-white mb-0">50K+</h2>
                  <p className="text-secondary small mb-0">Daily Egg Production</p>
               </Col>
               <Col md={3} className="border-end border-dark">
                  <h2 className="fw-bold text-white mb-0">99.9%</h2>
                  <p className="text-secondary small mb-0">Data Accuracy</p>
               </Col>
               <Col md={3} className="border-end border-dark">
                  <h2 className="fw-bold text-white mb-0">₹10M+</h2>
                  <p className="text-secondary small mb-0">Managed Revenue</p>
               </Col>
               <Col md={3}>
                  <h2 className="fw-bold text-white mb-0">24/7</h2>
                  <p className="text-secondary small mb-0">Cloud Uptime</p>
               </Col>
            </Row>
         </Container>
      </div>

      {/* 4. FEATURE GRID (Dark Glass Style) */}
      <Container style={s.gridSection}>
         <Row className="mb-5 text-center">
            <Col lg={8} className="mx-auto">
               <span style={{color:'#3b82f6', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase'}}>Ecosystem</span>
               <h2 style={{fontSize:'3rem', fontWeight:'800', marginTop:'10px'}}>Total Control Over Operations</h2>
            </Col>
         </Row>
         
         <Row className="g-4">
            {/* Inventory */}
            <Col lg={4} md={6}>
               <div style={s.gridCard} className="hover-card">
                  <div style={s.gridIcon}><FiBox/></div>
                  <h3 className="fw-bold h4">Intelligent Inventory</h3>
                  <p className="text-secondary">
                     Automated stock deduction. Real-time tracking of <strong>Trays, Boxes, and Raw Materials</strong>. Never run out of feed or packing material again.
                  </p>
                  <div style={s.mockupBox}>
                     <div className="d-flex justify-content-between text-secondary small mb-2"><span>Egg Stock</span><span className="text-success">Live</span></div>
                     <div style={{height:'6px', width:'100%', background:'#334155', borderRadius:'3px'}}><div style={{width:'70%', height:'100%', background:'#3b82f6', borderRadius:'3px'}}></div></div>
                  </div>
               </div>
            </Col>

            {/* Logistics */}
            <Col lg={4} md={6}>
               <div style={s.gridCard} className="hover-card">
                  <div style={{...s.gridIcon, color:'#a855f7'}}><FiTruck/></div>
                  <h3 className="fw-bold h4">Logistics & Dispatch</h3>
                  <p className="text-secondary">
                     End-to-end dispatch tracking. Monitor <strong>Source to Destination</strong> routes, manage returns (D/F/N), and calculate shortages instantly.
                  </p>
                  <div className="mt-4 d-flex gap-2">
                     <Badge bg="dark" className="border border-secondary">Route Planning</Badge>
                     <Badge bg="dark" className="border border-secondary">Return Logic</Badge>
                  </div>
               </div>
            </Col>

            {/* Finance */}
            <Col lg={4} md={6}>
               <div style={s.gridCard} className="hover-card">
                  <div style={{...s.gridIcon, color:'#10b981'}}><FiDollarSign/></div>
                  <h3 className="fw-bold h4">Financial Command</h3>
                  <p className="text-secondary">
                     A complete <strong>Cashbook Ledger</strong> integrated with operations. Track Income vs Expense and generate P&L statements in real-time.
                  </p>
               </div>
            </Col>

            {/* Reports */}
            <Col lg={8}>
               <div style={s.gridCard} className="hover-card d-flex flex-column flex-md-row align-items-center gap-4">
                  <div className="flex-grow-1">
                     <div style={{...s.gridIcon, color:'#f59e0b'}}><FiCommand/></div>
                     <h3 className="fw-bold h4">One-Click Reporting Engine</h3>
                     <p className="text-secondary mb-4">
                        Generate comprehensive PDF reports for Management, Audits, or WhatsApp sharing. Daily Sales, Stock, and Damage reports ready in seconds.
                     </p>
                     <Button variant="outline-light" className="rounded-pill px-4" onClick={onLoginClick}>Generate Sample Report</Button>
                  </div>
                  <div style={{minWidth:'250px', height:'180px', background:'#1e293b', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <FiPieChart size={60} className="text-secondary opacity-50"/>
                  </div>
               </div>
            </Col>

            {/* Security */}
            <Col lg={4}>
               <div style={s.gridCard} className="hover-card">
                  <div style={{...s.gridIcon, color:'#f43f5e'}}><FiShield/></div>
                  <h3 className="fw-bold h4">Enterprise Security</h3>
                  <p className="text-secondary">
                     Role-based access control, encrypted data transmission, and automated cloud backups.
                  </p>
               </div>
            </Col>
         </Row>
      </Container>

      {/* 5. FOOTER */}
      <footer style={{borderTop:'1px solid rgba(255,255,255,0.05)', padding:'80px 0 40px', background:'#020617'}}>
         <Container>
            <Row className="g-5 mb-5">
               <Col md={4}>
                  <h4 className="fw-bold mb-4">BioCore</h4>
                  <p className="text-secondary">Empowering poultry businesses with next-generation technology. Simple, Fast, Secure.</p>
               </Col>
               <Col md={2}>
                  <h6 className="fw-bold text-white mb-3">Product</h6>
                  <ul className="list-unstyled text-secondary d-flex flex-column gap-2">
                     <li>Inventory</li>
                     <li>Logistics</li>
                     <li>Finance</li>
                     <li>Reporting</li>
                  </ul>
               </Col>
               <Col md={2}>
                  <h6 className="fw-bold text-white mb-3">Company</h6>
                  <ul className="list-unstyled text-secondary d-flex flex-column gap-2">
                     <li>About</li>
                     <li>Careers</li>
                     <li>Contact</li>
                     <li>Privacy</li>
                  </ul>
               </Col>
               <Col md={4}>
                  <h6 className="fw-bold text-white mb-3">Get Started</h6>
                  <p className="text-secondary">Ready to modernize your farm?</p>
                  <Button variant="primary" className="w-100 py-2 fw-bold" onClick={onLoginClick}>Access Workspace</Button>
               </Col>
            </Row>
            <div className="text-center pt-4 border-top border-secondary border-opacity-25">
               <p className="text-secondary small mb-0">&copy; {new Date().getFullYear()} Happinest BioCore ERP. Architected for Excellence.</p>
            </div>
         </Container>
      </footer>

      {/* CSS ANIMATIONS */}
      <style>
        {`
          .hover-glow:hover { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6) !important; transform: translateY(-2px); }
          .hover-light:hover { background: rgba(255,255,255,0.1) !important; color: white !important; }
          .hover-card:hover { 
             transform: translateY(-10px); 
             background: rgba(255, 255, 255, 0.05) !important;
             border-color: rgba(255,255,255,0.2) !important;
             box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
          }
          
          .fade-in-up { opacity: 0; transform: translateY(30px); animation: fadeInUp 0.8s forwards; }
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
          .delay-4 { animation-delay: 0.4s; }
          
          @keyframes fadeInUp {
             to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
             0% { opacity: 0.4; } 50% { opacity: 0.7; } 100% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  );
};

export default LandingPage;