import React from 'react';
import Controls from './Controls';

interface HeaderStripProps {
  playing: boolean;
  speed: number;
  closedLoop: boolean;
  isRecording: boolean;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onToggleClosedLoop: () => void;
  onTriggerAnomaly: () => void;
  onReset: () => void;
  onRecord: () => void;
}

const HeaderStrip: React.FC<HeaderStripProps> = ({
  playing,
  speed,
  closedLoop,
  isRecording,
  onTogglePlay,
  onSetSpeed,
  onToggleClosedLoop,
  onTriggerAnomaly,
  onReset,
  onRecord,
}) => {
  return (
    <div className="header-strip-grid">
      <section className="header-info-block">
        <div className="header-logo-row">
          <img src="/assets/CYIENT Logo.png" alt="Cyient" className="header-logo" />
          <div>
            <h1 className="header-title">Case Study 1: Anomaly Detection &amp; Resolution rApp</h1>
            <p className="header-subtitle">Intelligent Network Automation using rApps</p>
          </div>
        </div>
        <p className="header-specs">
          Setup Specs: 5G NR, TDD, Band 3800-4200 MHz, Slot 3990-4010 MHz, 20 MHz, EIRP ≤30 dBm
        </p>
      </section>

      <section className="header-commands-block" aria-label="Control Panel">
        <div className="header-commands-title">Control Panel</div>
        <Controls
          playing={playing}
          speed={speed}
          closedLoop={closedLoop}
          isRecording={isRecording}
          onTogglePlay={onTogglePlay}
          onSetSpeed={onSetSpeed}
          onToggleClosedLoop={onToggleClosedLoop}
          onTriggerAnomaly={onTriggerAnomaly}
          onReset={onReset}
          onRecord={onRecord}
        />
      </section>
    </div>
  );
};

export default HeaderStrip;
