import React from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { 
  FiArrowRight, FiActivity, FiShield, FiTrendingUp, 
  FiDatabase, FiCheckCircle, FiCpu, FiLayers 
} from "react-icons/fi";

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="landing-wrapper">
      
      {/* 1. NAVBAR (Transparent Glass) */}
      <nav className="landing-nav">
        <div className="d-flex align-items-center">
          <img 
            src="https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg" 
            alt="Logo" 
            className="landing-logo" 
          />
          <span className="landing-brand">Happinest BioCore</span>
        </div>
        <Button variant="light" className="login-trigger-btn shadow-sm" onClick={onLoginClick}>
           Manager Login <FiArrowRight className="ms-2"/>
        </Button>
      </nav>

      {/* 2. HERO SECTION */}
      <div className="hero-container">
        <Container>
          <Row className="align-items-center">
            <Col lg={7} className="hero-text-col fade-in-up">
              <Badge bg="primary" className="mb-3 px-3 py-2 fw-normal rounded-pill bg-opacity-25 text-primary border border-primary">
                 <FiCpu className="me-2"/> v2.5 Enterprise Edition
              </Badge>
              <h1 className="display-4 fw-bold text-dark mb-3">
                Intelligent Poultry <br/> 
                <span className="text-primary">Management System</span>
              </h1>
              <p className="lead text-muted mb-5" style={{ maxWidth: '90%' }}>
                Streamline your egg production, inventory tracking, and financial ledgers with a 
                military-grade secure platform designed for high-performance farms.
              </p>
              
              <div className="d-flex gap-3">
                <Button size="lg" variant="primary" className="hero-cta-btn shadow-lg" onClick={onLoginClick}>
                   Access Dashboard
                </Button>
                <Button size="lg" variant="outline-dark" className="hero-secondary-btn" onClick={() => alert("Contact Admin for Demo Access")}>
                   Request Demo
                </Button>
              </div>

              <div className="mt-5 d-flex gap-4 text-muted small">
                 <span className="d-flex align-items-center"><FiCheckCircle className="text-success me-2"/> 99.9% Uptime</span>
                 <span className="d-flex align-items-center"><FiShield className="text-primary me-2"/> SSL Encrypted</span>
                 <span className="d-flex align-items-center"><FiDatabase className="text-info me-2"/> Auto-Backup</span>
              </div>
            </Col>

            {/* Right Side Visual (Abstract Dashboard Preview) */}
            <Col lg={5} className="d-none d-lg-block position-relative fade-in-right">
               <div className="hero-visual-card bg-white shadow-lg p-4 rounded-4 border">
                  <div className="d-flex justify-content-between mb-4 border-bottom pb-3">
                     <div className="d-flex gap-2">
                        <div className="visual-dot bg-danger"></div>
                        <div className="visual-dot bg-warning"></div>
                        <div className="visual-dot bg-success"></div>
                     </div>
                     <small className="text-muted fw-bold">LIVE METRICS</small>
                  </div>
                  {/* Mock Stats */}
                  <div className="mb-3 p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                     <div className="d-flex align-items-center">
                        <div className="p-2 bg-white rounded shadow-sm me-3"><FiTrendingUp className="text-success"/></div>
                        <div><small className="d-block text-muted">Daily Production</small><strong>12,500 Eggs</strong></div>
                     </div>
                     <Badge bg="success">+15%</Badge>
                  </div>
                  <div className="mb-3 p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                     <div className="d-flex align-items-center">
                        <div className="p-2 bg-white rounded shadow-sm me-3"><FiActivity className="text-primary"/></div>
                        <div><small className="d-block text-muted">Active Stock</small><strong>Optimal</strong></div>
                     </div>
                     <FiCheckCircle className="text-success"/>
                  </div>
                  <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                     <div className="d-flex align-items-center">
                        <div className="p-2 bg-white rounded shadow-sm me-3"><FiLayers className="text-warning"/></div>
                        <div><small className="d-block text-muted">Feed Inventory</small><strong>24.5 Tons</strong></div>
                     </div>
                     <Badge bg="warning" text="dark">Low</Badge>
                  </div>
               </div>
               {/* Decorative Background Blob */}
               <div className="hero-blob"></div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* 3. FEATURE STRIP */}
      <div className="features-strip bg-white py-5 border-top border-bottom">
         <Container>
            <Row className="g-4 text-center">
               <Col md={4}>
                  <div className="feature-item">
                     <div className="feature-icon-circle text-primary bg-primary bg-opacity-10 mb-3 mx-auto">
                        <FiLayers size={24}/>
                     </div>
                     <h6 className="fw-bold">Inventory Control</h6>
                     <p className="text-muted small">Real-time tracking of feed, medicines, and packaging materials.</p>
                  </div>
               </Col>
               <Col md={4}>
                  <div className="feature-item">
                     <div className="feature-icon-circle text-success bg-success bg-opacity-10 mb-3 mx-auto">
                        <FiTrendingUp size={24}/>
                     </div>
                     <h6 className="fw-bold">Production Analytics</h6>
                     <p className="text-muted small">Daily egg collection reports with automated graph generation.</p>
                  </div>
               </Col>
               <Col md={4}>
                  <div className="feature-item">
                     <div className="feature-icon-circle text-info bg-info bg-opacity-10 mb-3 mx-auto">
                        <FiActivity size={24}/>
                     </div>
                     <h6 className="fw-bold">Financial Health</h6>
                     <p className="text-muted small">Integrated Cash Book to manage operational income & expenses.</p>
                  </div>
               </Col>
            </Row>
         </Container>
      </div>

    </div>
  );
};

export default LandingPage;