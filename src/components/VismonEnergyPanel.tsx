import React, { useEffect, useRef } from 'react';
import type { TopologySnapshot } from '../types';
import type { CaseStudyId } from '../caseStudies/config';

interface VismonEnergyPanelProps {
  snapshot: TopologySnapshot;
  now: number;
  caseStudyId: CaseStudyId;
}

interface DataPoint {
  ts: number;
  server1: number; // orange – CU+DU
  server2: number; // green – Core
  radio: number;   // blue – Radio_5G
}

const Y_MIN = 60;
const Y_MAX = 240;
const MAX_POINTS = 120;
const SAMPLE_INTERVAL_MS = 1000;

function prbToServer1(prb: number): number {
  // Cell-B/C DU+CU server: 160–210W
  return 160 + (prb / 100) * 50 + (Math.random() - 0.5) * 4;
}

function prbToServer2(prb: number): number {
  // Cell-B/C Core server: 88–108W
  return 88 + (prb / 100) * 20 + (Math.random() - 0.5) * 3;
}

function prbToRadio(prb: number): number {
  // Radio_5G RU: 80–140W (idle baseline 80W, full load 140W)
  return 80 + (prb / 100) * 60 + (Math.random() - 0.5) * 3;
}

const SITE_NAME = 'ORAN-Demo';

const VismonEnergyPanel: React.FC<VismonEnergyPanelProps> = ({ snapshot, now, caseStudyId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<DataPoint[]>([]);
  const lastSampleRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear chart history when switching UCs so stale data doesn't persist
  useEffect(() => {
    bufferRef.current = [];
    lastSampleRef.current = 0;
  }, [caseStudyId]);

  // Sample data from snapshot at ~1s intervals
  // CS4 = energy UC (Cell-B/C standby) → use cell_b PRB
  // CS1/2/3 = integrity UCs focused on Cell-A → use cell_a PRB
  const prb = caseStudyId === 'CS4' ? snapshot.cell_b_prb_used : snapshot.cell_a_prb_used;
  useEffect(() => {
    if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    const point: DataPoint = {
      ts: now,
      server1: prbToServer1(prb),
      server2: prbToServer2(prb),
      radio: prbToRadio(prb),
    };

    bufferRef.current = [...bufferRef.current, point].slice(-MAX_POINTS);
  }, [now, prb]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const PAD_LEFT = 28;
    const PAD_RIGHT = 8;
    const PAD_TOP = 6;
    const PAD_BOTTOM = 8;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;

    const toX = (i: number, total: number) =>
      PAD_LEFT + (i / Math.max(total - 1, 1)) * chartW;
    const toY = (val: number) =>
      PAD_TOP + chartH - ((val - Y_MIN) / (Y_MAX - Y_MIN)) * chartH;

    // Grid lines
    const gridVals = [80, 120, 160, 200];
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    gridVals.forEach((v) => {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + chartW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${Math.max(5, Math.min(9, H * 0.09))}px monospace`;
    ctx.textAlign = 'right';
    gridVals.forEach((v) => {
      ctx.fillText(String(v), PAD_LEFT - 2, toY(v) + 3);
    });

    const pts = bufferRef.current;
    if (pts.length < 2) return;

    const series: Array<{ key: keyof Omit<DataPoint, 'ts'>; color: string }> = [
      { key: 'server1', color: '#e07820' },
      { key: 'server2', color: '#22c55e' },
      { key: 'radio',   color: '#3b82f6' },
    ];

    series.forEach(({ key, color }) => {
      // Thin connecting line
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = toX(i, pts.length);
        const y = toY(p[key] as number);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Scatter dots
      ctx.fillStyle = color;
      pts.forEach((p, i) => {
        const x = toX(i, pts.length);
        const y = toY(p[key] as number);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }, [now, prb]);

  // ResizeObserver to re-trigger paint when container resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      // trigger redraw on next frame — just force re-render via state would cause loop;
      // instead the canvas draw is triggered by now/snapshot changes which are continuous
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="vep-root">
      {/* Top bar */}
      <div className="vep-topbar">
        <span className="vep-brand-vismon">VISMON</span>
        <span className="vep-topbar-icons">
          <span className="vep-topbar-icon">☰</span>
          <span className="vep-topbar-label">ANALYTICS</span>
          <span className="vep-topbar-sep">🔔</span>
          <span className="vep-avatar">MC</span>
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="vep-breadcrumb">
        ▲ / ANALYTICS / GLOBAL / <strong>RANENERGYMEASUREMENTS</strong>
      </div>

      {/* Filter bar */}
      <div className="vep-filterbar">
        <div className="vep-filter-group">
          <span className="vep-filter-label">Site</span>
          <span className="vep-filter-value">{SITE_NAME} ▾</span>
        </div>
        <div className="vep-filter-group">
          <span className="vep-filter-label">Sensor</span>
          <span className="vep-filter-value">(All) ▾</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="vep-chart-wrap" ref={containerRef}>
        <canvas ref={canvasRef} className="vep-canvas" />
        {/* Y-axis label */}
        <span className="vep-y-label">Pwr [W]</span>
        {/* Legend */}
        <div className="vep-legend">
          <span className="vep-legend-item"><span className="vep-dot" style={{ background: '#3b82f6' }} /> Radio_5G</span>
          <span className="vep-legend-item"><span className="vep-dot" style={{ background: '#e07820' }} /> Server1 (CU+DU)</span>
          <span className="vep-legend-item"><span className="vep-dot" style={{ background: '#22c55e' }} /> Server2 (Core)</span>
        </div>
      </div>
    </div>
  );
};

export default VismonEnergyPanel;
