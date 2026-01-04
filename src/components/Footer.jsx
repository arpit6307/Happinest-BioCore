import React from 'react';
import { Container } from 'react-bootstrap';
import { FiGithub, FiLinkedin, FiGlobe, FiCpu, FiActivity, FiCode, FiInstagram, FiFacebook } from "react-icons/fi";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  // Company Logo (Directly using the one you provided)
  const companyLogo = "https://i.postimg.cc/xdGCBkdK/Whats-App-Image-2025-12-18-at-1-03-46-PM.jpg";

  return (
    <footer className="glass-footer mt-auto">
      <Container fluid className="px-4">
        <div className="footer-content-wrapper">
          
          {/* LEFT: BRAND & VERSION */}
          <div className="footer-left">
            <div className="brand-pill">
              <img src={companyLogo} alt="Logo" className="footer-mini-logo" />
              <span className="brand-text">Happinest BioCore</span>
              <span className="version-badge">v2.4 Pro</span>
            </div>
            <span className="copyright-text d-none d-md-inline">
              &copy; {currentYear} All rights reserved.
            </span>
          </div>

          {/* CENTER: DEVELOPER SIGNATURE (The Hero Element) */}
          <div className="footer-center">
            <div className="dev-glass-card">
              <span className="dev-label">Architected by</span>
              <div className="dev-name-wrapper">
                <FiCode className="text-primary me-2" />
                <span className="dev-name">Arpit Singh Yadav</span>
              </div>
            </div>
          </div>

          {/* RIGHT: SYSTEM STATUS & LINKS */}
          <div className="footer-right">
            {/* Status Indicator */}
            <div className="system-status d-none d-md-flex">
              <span className="status-beacon"></span>
              <span className="status-label">System Online</span>
              <FiActivity className="ms-2 text-success opacity-75" />
            </div>

            {/* Divider */}
            <div className="footer-divider d-none d-md-block"></div>

            {/* Social Links */}
            <div className="footer-links">
              <a href="#" className="footer-icon-link" title="Global Website"><FiGlobe /></a>
              <a href="#" className="footer-icon-link" title="GitHub Repo"><FiInstagram /></a>
              <a href="#" className="footer-icon-link" title="LinkedIn Profile"><FiFacebook /></a>
            </div>
          </div>

        </div>
      </Container>
    </footer>
  );
};

export default Footer;