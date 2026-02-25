import React from 'react';

interface DeviceResourceCardProps {
  deviceName: string;
  subtitle?: string;
  dlMbps: number;
  ulMbps: number | null;
  sinrDb?: number;
  allocatedPrbs: number;
  totalPrbs: number;
  sharePct: number;
  history: number[];
  accentColor?: string;
}

function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

const DeviceResourceCard: React.FC<DeviceResourceCardProps> = ({
  deviceName,
  subtitle,
  dlMbps,
  ulMbps,
  sinrDb,
  allocatedPrbs,
  totalPrbs,
  sharePct,
  history,
  accentColor = '#00A6A6',
}) => {
  const sparkPath = sparklinePath(history, 220, 36);

  return (
    <article className="device-resource-card">
      <header className="device-resource-header">
        <div className="device-resource-name">{deviceName}</div>
        {subtitle ? <div className="device-resource-subtitle">{subtitle}</div> : <div className="device-resource-subtitle">&nbsp;</div>}
      </header>

      <div className="device-throughput-row">
        <div className="device-throughput-main">{dlMbps.toFixed(1)} Mbps</div>
        <div className="device-throughput-secondary">UL: {ulMbps === null ? '—' : `${ulMbps.toFixed(1)} Mbps`}</div>
        {Number.isFinite(sinrDb) && (
          <div className="device-throughput-secondary">SINR: {(sinrDb as number).toFixed(1)} dB</div>
        )}
        <div className="device-throughput-label">DL / UL Throughput</div>
      </div>

      <div className="device-prb-row">
        <div className="device-prb-line">PRBs: {allocatedPrbs} / {totalPrbs}</div>
        <div className="device-prb-line">Share: {sharePct.toFixed(1)}%</div>
        <div className="device-prb-bar-track">
          <div className="device-prb-bar-fill" style={{ width: `${Math.min(100, Math.max(0, sharePct))}%`, background: accentColor }} />
        </div>
      </div>

      <div className="device-trend-row" aria-label={`${deviceName} trend`}>
        <svg viewBox="0 0 220 36" preserveAspectRatio="none" className="device-trend-sparkline">
          <path d={sparkPath} fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </article>
  );
};

export default DeviceResourceCard;
