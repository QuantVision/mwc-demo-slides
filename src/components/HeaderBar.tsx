import React from 'react';
import Controls from './Controls';

interface HeaderBarProps {
  caseStudyTitle?: string;
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

const HeaderBar: React.FC<HeaderBarProps> = ({
  caseStudyTitle = 'Use Case 1: Anomaly Detection & Root Cause Analysis rApp',
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
    <div className="header-bar-root">
      <section className="header-title-block">
        <div className="header-brand-row">
          <img
            src="/assets/CYIENT Logo.png"
            alt="Cyient"
            className="header-cyient-logo"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="header-title-wrap">
            <h1 className="header-main-title">{caseStudyTitle}</h1>
            <p className="header-main-subtitle">Intelligent Network Automation using rApp&apos;s</p>
            <p className="header-main-specs">
              Tech: 5G NR | Type: TDD | Band: 3800-4200 MHz | Slot: 3990-4010 MHz | BW: 20 MHz | EIRP: ≤30 dBm
            </p>
          </div>
        </div>
      </section>

      <section className="header-controls-block">
        <div className="header-controls-title">Control Panel</div>
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

export default HeaderBar;
