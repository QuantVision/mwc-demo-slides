import React from 'react';
import DeviceResourceCard from './DeviceResourceCard';
import type { RadioResourcesState, EffSePreset, ScsKhz } from '../hooks/useRadioResources';

interface RadioResourcesPanelProps {
  radio: RadioResourcesState;
  ue1Cell?: 'A' | 'B';
  ue2Cell?: 'A' | 'B';
  cpeCell?: 'A' | 'B';
  hideTitle?: boolean;
  compact?: boolean;
}

const SE_PRESETS: Array<{ key: EffSePreset; label: string; value: string }> = [
  { key: 'low', label: 'Low', value: '1.5' },
  { key: 'med', label: 'Med', value: '3.0' },
  { key: 'high', label: 'High', value: '5.0' },
];

const SCS_OPTIONS: ScsKhz[] = [15, 30];

const CARD_ACCENTS = {
  ue1: '#00A6A6',
  ue2: '#E0A840',
  cpe: '#5BA9D7',
};

const RadioResourcesPanel: React.FC<RadioResourcesPanelProps> = ({
  radio,
  ue1Cell,
  ue2Cell,
  cpeCell,
  hideTitle = false,
  compact = false,
}) => {
  return (
    <section className={`radio-panel ${compact ? 'compact' : ''}`}>
      <div className="radio-panel-header">
        {!hideTitle && <h3 className="radio-panel-title">Radio Resources (20 MHz NR)</h3>}

        <div className="radio-assumptions-row" aria-label="Carrier assumptions">
          <div className="assumption-item">
            <span className="assumption-label">Band</span>
            <span className="assumption-value">3800-4200 MHz (n77)</span>
          </div>

          <div className="assumption-item">
            <span className="assumption-label">Slot</span>
            <span className="assumption-value">3990-4010 MHz</span>
          </div>

          <div className="assumption-item">
            <span className="assumption-label">Bandwidth</span>
            <span className="assumption-value">20 MHz</span>
          </div>

          <div className="assumption-item assumption-control">
            <span className="assumption-label">SCS</span>
            <div className="assumption-toggle-group">
              {SCS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`assumption-toggle ${radio.scsKhz === option ? 'active' : ''}`}
                  onClick={() => radio.setScsKhz(option)}
                >
                  {option} kHz
                </button>
              ))}
            </div>
          </div>

          <div className="assumption-item assumption-control">
            <span className="assumption-label">Effective SE</span>
            <div className="assumption-toggle-group">
              {SE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`assumption-toggle ${radio.effSePreset === preset.key ? 'active' : ''}`}
                  onClick={() => radio.setEffSePreset(preset.key)}
                >
                  {preset.label} {preset.value}
                </button>
              ))}
            </div>
          </div>

          <div className="assumption-item assumption-total">
            <span className="assumption-label">Total PRBs</span>
            <span className="assumption-value">{radio.totalPrbs}</span>
          </div>

          <div className="assumption-item">
            <span className="assumption-label">RF Tx</span>
            <span className="assumption-value">≤ 20 dBm</span>
          </div>

          <div className="assumption-item">
            <span className="assumption-label">EIRP</span>
            <span className="assumption-value">≤ 30 dBm</span>
          </div>
        </div>
      </div>

      <div className="device-cards-grid">
        <DeviceResourceCard
          deviceName="UE1"
          subtitle={ue1Cell ? `Cell ${ue1Cell}` : undefined}
          dlMbps={radio.throughputs.ue1.dlMbps}
          ulMbps={radio.throughputs.ue1.ulMbps}
          allocatedPrbs={radio.allocations.ue1.prbs}
          totalPrbs={radio.totalPrbs}
          sharePct={radio.allocations.ue1.sharePct}
          history={radio.history.ue1}
          accentColor={CARD_ACCENTS.ue1}
        />

        <DeviceResourceCard
          deviceName="UE2"
          subtitle={ue2Cell ? `Cell ${ue2Cell}` : undefined}
          dlMbps={radio.throughputs.ue2.dlMbps}
          ulMbps={radio.throughputs.ue2.ulMbps}
          allocatedPrbs={radio.allocations.ue2.prbs}
          totalPrbs={radio.totalPrbs}
          sharePct={radio.allocations.ue2.sharePct}
          history={radio.history.ue2}
          accentColor={CARD_ACCENTS.ue2}
        />

        <DeviceResourceCard
          deviceName="CPE"
          subtitle={cpeCell ? `Cell ${cpeCell}` : undefined}
          dlMbps={radio.throughputs.cpe.dlMbps}
          ulMbps={radio.throughputs.cpe.ulMbps}
          allocatedPrbs={radio.allocations.cpe.prbs}
          totalPrbs={radio.totalPrbs}
          sharePct={radio.allocations.cpe.sharePct}
          history={radio.history.cpe}
          accentColor={CARD_ACCENTS.cpe}
        />
      </div>

      <footer className="radio-panel-footer">
        <span>Used PRBs: {radio.totals.usedPrbs}</span>
        <span>Free PRBs: {radio.totals.freePrbs}</span>
        <span>Utilization: {radio.totals.utilizationPct.toFixed(1)}%</span>
        <span>Total DL: {radio.totals.totalDlMbps.toFixed(1)} Mbps</span>
      </footer>
    </section>
  );
};

export default RadioResourcesPanel;
