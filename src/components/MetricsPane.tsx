import React from 'react';
import RadioResourcesPanel from './RadioResourcesPanel';
import type { RadioResourcesState } from '../hooks/useRadioResources';

interface MetricsPaneProps {
  radio: RadioResourcesState;
  ue1Cell?: 'A' | 'B';
  ue2Cell?: 'A' | 'B';
}

const MetricsPane: React.FC<MetricsPaneProps> = ({ radio, ue1Cell, ue2Cell }) => {
  return (
    <section className="dashboard-pane metrics-pane">
      <header className="pane-header">
        <h3 className="pane-title">Live Performance</h3>
      </header>

      <div className="pane-body metrics-pane-body">
        <RadioResourcesPanel
          radio={radio}
          ue1Cell={ue1Cell}
          ue2Cell={ue2Cell}
          hideTitle
          compact
        />
      </div>
    </section>
  );
};

export default MetricsPane;
