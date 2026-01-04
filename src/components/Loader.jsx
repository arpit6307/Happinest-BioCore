import React from 'react';
// CSS is handled globally in App.css

const Loader = ({ fullScreen = false, text = "Loading..." }) => {
  
  const content = (
    <div className="loader-content">
      {/* Outer Glowing Ring */}
      <div className="egg-glow-ring"></div>

      {/* The 3D Golden Egg */}
      <div className="egg-wrapper">
        <div className="egg-shine"></div>
        <div className="egg-base"></div>
      </div>

      {/* Shadow */}
      <div className="egg-shadow"></div>

      {/* Text Section */}
      <div className="loader-text-section">
        <span className="company-text">Happinest</span>
        <div className="status-text">
          {text}
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loader-fullscreen-overlay">
        {content}
      </div>
    );
  }

  return (
    <div className="loader-inline-container">
      {content}
    </div>
  );
};

export default Loader;