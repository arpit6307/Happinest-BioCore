import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="loader-fullscreen-overlay">
      <div className="loader-content">
        
        {/* Advanced 3D Animation Wrapper */}
        <div className="premium-loader-wrapper">
           {/* Rotating Tech Ring */}
           <div className="tech-ring"></div>
           
           {/* Floating Golden Egg */}
           <div className="golden-egg">
              <div className="egg-shine"></div>
           </div>
           
           {/* Shadow */}
           <div className="egg-shadow"></div>
        </div>

        {/* Text Section */}
        <div className="loader-text-section">
           <span className="company-text">Happinest BioCore</span>
           <div className="status-text-wrapper">
             <span className="status-text">{text}</span>
             <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Loader;