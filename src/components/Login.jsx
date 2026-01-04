import React, { useState } from 'react';
import { Form, Button, InputGroup, Spinner, Alert, Container, Row, Col } from 'react-bootstrap';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiCheckCircle } from "react-icons/fi";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Incorrect email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="corporate-login-wrapper">
      <Container fluid className="h-100 p-0">
        <Row className="h-100 g-0">
          
          {/* ==========================
              LEFT SIDE: BRANDING
          ========================== */}
          <Col lg={5} className="d-none d-lg-flex brand-column flex-column justify-content-between p-5">
            <div className="brand-header">
               <div className="brand-logo-container mb-3">
                  <img src="https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg" alt="Logo" className="brand-img"/>
               </div>
               <h2 className="text-white fw-bold">Happinest BioCore</h2>
               <p className="text-white opacity-75 lead">Enterprise Inventory & Financial Management System</p>
            </div>

            <div className="brand-footer text-white opacity-50 small">
              <p className="mb-0">&copy; {new Date().getFullYear()} Happinest Poultry Products Pvt. Ltd.</p>
              <p>System Architect: Arpit Singh Yadav</p>
            </div>
          </Col>

          {/* ==========================
              RIGHT SIDE: LOGIN FORM
          ========================== */}
          <Col lg={7} className="form-column d-flex align-items-center justify-content-center bg-white">
            <div className="login-form-container w-100" style={{ maxWidth: '480px', padding: '40px' }}>
              
              <div className="mb-5">
                <h3 className="fw-bold text-dark mb-2">Welcome Back</h3>
                <p className="text-muted">Please enter your details to access your workspace.</p>
              </div>

              {error && (
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 text-danger mb-4 d-flex align-items-center small">
                  <FiShield className="me-2"/> {error}
                </Alert>
              )}

              <Form onSubmit={handleLogin}>
                
                {/* Email Input */}
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-dark">Email Address</Form.Label>
                  <InputGroup className="corp-input-group">
                    <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                      <FiMail size={18}/>
                    </InputGroup.Text>
                    <Form.Control 
                      type="email" 
                      placeholder="manager@happinest.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="border-start-0 py-2 ps-2 shadow-none text-dark"
                    />
                  </InputGroup>
                </Form.Group>

                {/* Password Input */}
                <Form.Group className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                     <Form.Label className="small fw-bold text-dark mb-1">Password</Form.Label>
                  </div>
                  <InputGroup className="corp-input-group">
                    <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                      <FiLock size={18}/>
                    </InputGroup.Text>
                    <Form.Control 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="border-start-0 border-end-0 py-2 ps-2 shadow-none text-dark"
                    />
                    <InputGroup.Text 
                      className="bg-white border-start-0 text-muted pe-3 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ cursor: 'pointer' }}
                    >
                      {showPassword ? <FiEyeOff/> : <FiEye/>}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                {/* Remember Me & Forgot Password */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Form.Check 
                    type="checkbox" 
                    label="Remember for 30 days" 
                    className="small text-muted"
                    id="remember-me"
                  />
                  <a href="#" className="small text-decoration-none text-primary fw-bold">Forgot password?</a>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-100 py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center corp-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" /> Signing in...
                    </>
                  ) : (
                    <>
                      Sign In <FiArrowRight className="ms-2" />
                    </>
                  )}
                </Button>

              </Form>

              {/* Security Footer */}
              <div className="mt-5 text-center">
                 <small className="text-muted d-flex align-items-center justify-content-center gap-2">
                    <FiCheckCircle className="text-success"/> Secure SSL Connection
                 </small>
              </div>

            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;