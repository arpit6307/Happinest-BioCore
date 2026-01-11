import React from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { FiShield, FiCode, FiActivity } from "react-icons/fi";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // --- STYLES (Professional Enterprise Theme) ---
  const s = {
    footerContainer: {
      backgroundColor: '#0f172a', // Deep Enterprise Navy/Black
      color: '#94a3b8', // Muted Slate Text (Easy on eyes)
      padding: '20px 0',
      marginTop: 'auto',
      borderTop: '3px solid #1e293b', // Subtle top border separator
      fontSize: '0.85rem',
      fontWeight: '500',
      letterSpacing: '0.4px'
    },
    companyName: {
      color: '#f8fafc', // Bright White for Brand
      fontWeight: '600'
    },
    devLabel: {
      fontSize: '0.75rem',
      opacity: 0.8,
      marginRight: '6px'
    },
    devName: {
      color: '#e2e8f0', // Soft White for Developer
      fontWeight: '600',
      borderBottom: '1px dotted #475569', // Subtle professional underline
      paddingBottom: '1px'
    },
    statusDot: {
      display: 'inline-block',
      width: '6px',
      height: '6px',
      backgroundColor: '#10b981', // Emerald Green
      borderRadius: '50%',
      marginRight: '6px',
      boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
    }
  };

  return (
    <footer className="fade-in" style={s.footerContainer}>
      <Container fluid style={{ maxWidth: '1400px' }}>
        <Row className="g-3 align-items-center text-center text-md-start">
          
          {/* LEFT: Company Branding */}
          <Col md={4} className="text-md-start">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2">
              <FiShield size={16} className="text-primary"/> 
              <span>
                &copy; {currentYear} <span style={s.companyName}>Happinest Poultry Products.</span>
              </span>
            </div>
          </Col>

          {/* CENTER: System Status (Very Enterprise Feature) */}
          <Col md={4} className="text-center">
            <div className="d-inline-flex align-items-center bg-white bg-opacity-10 px-3 py-1 rounded-pill border border-secondary border-opacity-25">
              <span style={s.statusDot}></span>
              <span style={{fontSize:'0.75rem', color:'#cbd5e1'}}>BioCore ERP v2.0 • Online</span>
            </div>
          </Col>

          {/* RIGHT: Developer Credit (Professional Style) */}
          <Col md={4} className="text-md-end">
            <div className="d-flex align-items-center justify-content-center justify-content-md-end">
              <FiCode size={14} className="me-2 opacity-50"/>
              <span style={s.devLabel}>Designed & Developed by</span>
              <span style={s.devName}>Arpit Singh Yadav</span>
            </div>
          </Col>

        </Row>
      </Container>
    </footer>
  );
};

export default Footer;