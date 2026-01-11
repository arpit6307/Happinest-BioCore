import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiCheckCircle, FiActivity } from "react-icons/fi";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => { setAnimate(true); }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful - App.jsx handles redirection
    } catch (err) {
      console.error("Login Error:", err);
      // User-friendly Error Mapping
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Account not found or invalid credentials.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Failed to sign in. Please contact Admin.');
      }
    }
    setLoading(false);
  };

  // --- STYLES (Kept Exact) ---
  const s = {
    wrapper: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 20%, rgb(242, 246, 252) 0%, rgb(228, 233, 242) 90%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden'
    },
    // Floating Blobs for Background
    blob1: {
      position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px',
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, zIndex: 0
    },
    blob2: {
      position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px',
      background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
      borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, zIndex: 0
    },
    
    // Main Card
    card: {
      width: '100%', maxWidth: '1000px',
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.8)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      zIndex: 1,
      transform: animate ? 'translateY(0)' : 'translateY(20px)',
      opacity: animate ? 1 : 0,
      transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
    },
    
    // Left Branding Side
    brandSide: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '60px 40px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      color: 'white', position: 'relative', overflow: 'hidden'
    },
    brandDecoration: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0%, transparent 40%)',
      pointerEvents: 'none'
    },
    
    // Right Form Side
    formSide: { padding: '60px 40px' },
    
    // Inputs
    inputGroup: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '4px',
      transition: 'all 0.2s',
      boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
    },
    input: { border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: '500' },
    iconBox: { background: 'transparent', border: 'none', color: '#94a3b8' },
    
    // Button
    btn: {
      background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
      border: 'none', padding: '14px', borderRadius: '12px',
      fontSize: '1rem', fontWeight: '600', letterSpacing: '0.5px',
      transition: 'transform 0.2s', width: '100%',
      boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)'
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Background Blobs */}
      <div style={s.blob1}></div>
      <div style={s.blob2}></div>

      <div style={s.card}>
        <Row className="g-0">
          
          {/* LEFT: BRANDING */}
          <Col lg={5} style={s.brandSide} className="d-none d-lg-flex">
             <div style={s.brandDecoration}></div>
             
             <div>
                <div className="d-flex align-items-center gap-3 mb-4">
                   <img 
                     src="https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg" 
                     alt="Logo" 
                     style={{width:'50px', height:'50px', borderRadius:'12px', boxShadow:'0 4px 15px rgba(0,0,0,0.3)'}}
                   />
                   <div style={{lineHeight: 1.2}}>
                      <h4 className="fw-bold mb-0">BioCore</h4>
                      <small className="opacity-75" style={{fontSize:'0.75rem', letterSpacing:'1px'}}>ENTERPRISE ERP</small>
                   </div>
                </div>
                <h2 className="fw-bold display-6 mb-3">Manage Your Poultry Business <br/><span className="text-primary-light" style={{color:'#93c5fd'}}>Effortlessly.</span></h2>
                <p className="opacity-75 lead" style={{fontSize:'1rem'}}>Real-time inventory, financial tracking, and production analytics all in one secure workspace.</p>
             </div>

             <div className="d-flex align-items-center gap-3 opacity-50 small">
                <span>&copy; {new Date().getFullYear()} Happinest</span>
                <span>•</span>
                <span>v2.5.0 (Stable)</span>
             </div>
          </Col>

          {/* RIGHT: LOGIN FORM */}
          <Col lg={7} style={s.formSide}>
             <div className="w-100 mx-auto" style={{maxWidth:'420px'}}>
                
                <div className="mb-4">
                   <h3 className="fw-bold text-dark mb-1">Welcome Back!</h3>
                   <p className="text-muted">Enter your credentials to access the dashboard.</p>
                </div>

                {error && (
                   <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 text-danger mb-4 py-2 px-3 rounded-3 d-flex align-items-center small">
                     <FiShield className="me-2 flex-shrink-0"/> {error}
                   </Alert>
                )}

                <Form onSubmit={handleLogin}>
                   <Form.Group className="mb-3">
                      <Form.Label className="small fw-bold text-muted ms-1">Work Email</Form.Label>
                      <InputGroup style={s.inputGroup} className="focus-ring-group">
                         <InputGroup.Text style={s.iconBox}><FiMail size={18}/></InputGroup.Text>
                         <Form.Control 
                           type="email" 
                           placeholder="manager@happinest.com" 
                           value={email} onChange={(e)=>setEmail(e.target.value)} 
                           style={s.input} className="shadow-none" required
                         />
                      </InputGroup>
                   </Form.Group>

                   <Form.Group className="mb-4">
                      <div className="d-flex justify-content-between">
                         <Form.Label className="small fw-bold text-muted ms-1">Password</Form.Label>
                         <a href="#" className="small text-decoration-none text-primary fw-bold" onClick={(e) => { e.preventDefault(); alert("Contact Admin to reset."); }}>Forgot?</a>
                      </div>
                      <InputGroup style={s.inputGroup} className="focus-ring-group">
                         <InputGroup.Text style={s.iconBox}><FiLock size={18}/></InputGroup.Text>
                         <Form.Control 
                           type={showPassword ? "text" : "password"} 
                           placeholder="••••••••" 
                           value={password} onChange={(e)=>setPassword(e.target.value)} 
                           style={s.input} className="shadow-none" required
                         />
                         <InputGroup.Text 
                           style={{...s.iconBox, cursor:'pointer'}} 
                           onClick={()=>setShowPassword(!showPassword)}
                         >
                           {showPassword ? <FiEyeOff/> : <FiEye/>}
                         </InputGroup.Text>
                      </InputGroup>
                   </Form.Group>

                   <Button type="submit" style={s.btn} disabled={loading} className="hover-lift">
                      {loading ? <Spinner size="sm" animation="border" /> : <><FiActivity className="me-2"/> Sign In to Workspace</>}
                   </Button>
                </Form>

                <div className="mt-4 pt-4 border-top text-center">
                   <small className="text-muted d-flex align-items-center justify-content-center gap-2">
                      <FiCheckCircle className="text-success"/> SSL Secured Connection
                   </small>
                </div>

             </div>
          </Col>
        </Row>
      </div>
      
      {/* CSS for Focus and Hover Effects */}
      <style>
        {`
          .focus-ring-group:focus-within {
             border-color: #3b82f6 !important;
             box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          }
          .hover-lift:hover {
             transform: translateY(-2px);
             box-shadow: 0 10px 25px rgba(15, 23, 42, 0.4) !important;
          }
        `}
      </style>
    </div>
  );
};

export default Login;