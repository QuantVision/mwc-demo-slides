import React from 'react';
import type { SimulationStep } from '../types';

interface NarrativePanelProps {
  title?: string;
  narrative: string;
  currentStep: SimulationStep;
}

function badgeForStep(step: SimulationStep): string {
  if (step === 'DETECT') return 'ANOMALY';
  return step;
}

const NarrativePanel: React.FC<NarrativePanelProps> = ({ title = 'Case Study Narrative', narrative, currentStep }) => {
  const stepLabel = badgeForStep(currentStep);
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });

  return (
    <section className="narrative-panel">
      <div className="narrative-panel-header">
        <h2 className="narrative-panel-title">{title}</h2>
        <span className="narrative-step-badge">{stepLabel}</span>
      </div>
      <div className="narrative-log">
        <p className="narrative-log-line">[{timestamp}] NOW: {stepLabel}</p>
        <p className="narrative-log-line info">{narrative}</p>
      </div>
    </section>
  );
};

export default NarrativePanel;
