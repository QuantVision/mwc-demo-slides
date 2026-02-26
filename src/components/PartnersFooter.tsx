import React from 'react';

const druidLogo = '/assets/Druid-logo.png';
const firecellLogo = '/assets/FireCell Logo.png';
const benetelLogo = '/assets/Benetel-Logo.png';
const ericssonLogo = '/assets/ericsson_logo.svg';
const accelleranLogo = '/assets/Accelleran_NewLogo_NoBaseline.svg';

const PartnersFooter: React.FC = () => {
  return (
    <div className="partners-footer">
      <span className="partners-label">Collaborating Partners:</span>
      <div className="partners-logos">
        <img src={druidLogo} alt="Druid" className="partner-logo druid" />
        <img src={firecellLogo} alt="firecell" className="partner-logo firecell" />
        <img src={ericssonLogo} alt="Ericsson" className="partner-logo ericsson" />
        <img src={benetelLogo} alt="Benetel" className="partner-logo benetel" />
        <img src={accelleranLogo} alt="Accelleran" className="partner-logo accelleran" />
      </div>
    </div>
  );
};

export default PartnersFooter;
