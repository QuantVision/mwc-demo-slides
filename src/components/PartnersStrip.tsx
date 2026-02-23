import React from 'react';

const PartnersStrip: React.FC = () => {
  return (
    <div className="partners-strip">
      <span className="partners-label">Collaborating Partners:</span>
      <img src="/assets/Druid Logo.png" alt="Druid" className="partner-logo" />
      <img src="/assets/FireCell Logo.png" alt="FireCell" className="partner-logo" />
      <img src="/assets/Benetel-Logo.png" alt="Benetel" className="partner-logo" />
    </div>
  );
};

export default PartnersStrip;
