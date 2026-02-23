import React, { memo } from 'react';
import {
  TOPOLOGY_NODES,
  SCHEMATIC_LINKS,
  CELL_A,
  CELL_B,
  VIEWBOX_W,
  VIEWBOX_H,
  LAYER_COLORS,
  type LinkKind,
} from '../topology/nodes';
import type { TopologyNode, TopologySnapshot } from '../types';

const C = {
  bg: '#0B1A2B',
  text: '#F9FAFB',
  sub: '#C9D8E6',
  frame: '#1E3A5F',
};

const FONT_FAMILY = "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif";

interface NodePalette {
  fill: string;
  stroke: string;
  accent: string;
  text: string;
  sub: string;
  strip: string;
}

const NODE_PALETTE: Record<string, NodePalette> = {
  'nonrt-ric': {
    fill: '#091F35',
    stroke: '#00B4CC',
    accent: '#00D8EC',
    text: '#F3FAFF',
    sub: '#BED8EA',
    strip: '#0D2E48',
  },
  cu: {
    fill: '#0E2215',
    stroke: '#2E8A3A',
    accent: '#44CC66',
    text: '#EFFFEE',
    sub: '#B8DFC2',
    strip: '#162E1C',
  },
  'du-a': {
    fill: '#0C1E14',
    stroke: '#2A8040',
    accent: '#3ABE5C',
    text: '#EBFFF2',
    sub: '#BBDFC2',
    strip: '#142A1C',
  },
  'du-b': {
    fill: '#0A1C2E',
    stroke: '#2070B0',
    accent: '#38A8E0',
    text: '#EAF9FF',
    sub: '#B7D8E2',
    strip: '#102436',
  },
  core: {
    fill: '#10163A',
    stroke: '#3A5ACC',
    accent: '#5C7EFF',
    text: '#EFF6FF',
    sub: '#C2D6F5',
    strip: '#181E44',
  },
  'ru-a': {
    fill: '#111E10',
    stroke: '#2E8838',
    accent: '#44BE55',
    text: '#EBFFF2',
    sub: '#B8DFC2',
    strip: '#182618',
  },
  'ru-b': {
    fill: '#0E1430',
    stroke: '#3050C0',
    accent: '#4A70EE',
    text: '#EEF4FF',
    sub: '#BFD0F5',
    strip: '#141C3C',
  },
  'noc-prompt': {
    fill: '#1A0E28',
    stroke: '#7040A8',
    accent: '#9A64CC',
    text: '#FFF0FA',
    sub: '#E7CFE1',
    strip: '#220E34',
  },
};

function paletteForNode(node: TopologyNode): NodePalette {
  const byId = NODE_PALETTE[node.id];
  if (byId) return byId;

  const accent = LAYER_COLORS[node.layer];
  return {
    fill: '#10243D',
    stroke: '#35567B',
    accent,
    text: C.text,
    sub: C.sub,
    strip: '#1D3957',
  };
}

function nodeRect(node: TopologyNode) {
  return {
    x: node.x - node.width / 2,
    y: node.y - node.height / 2,
    w: node.width,
    h: node.height,
  };
}

function truncate(text: string, max = 84): string {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function ue2Shift(snapshot: TopologySnapshot): number {
  if (snapshot.ue2.cell === 'B') return 0;
  switch (snapshot.phase) {
    case 'contention':
      return 0.58;
    case 'enrich':
      return 0.72;
    case 'rca':
      return 0.82;
    default:
      return 0.92;
  }
}

function animatedNode(node: TopologyNode, now: number, snapshot: TopologySnapshot): TopologyNode {
  const t = now / 1000;

  if (node.id === 'ue-1') {
    return {
      ...node,
      x: CELL_A.cx - 96 + Math.cos(t * 0.34 + 0.4) * 14 + Math.sin(t * 0.16 + 0.9) * 5,
      y: CELL_A.cy + 42 + Math.sin(t * 0.29 + 1.1) * 10 + Math.cos(t * 0.13 + 0.5) * 4,
    };
  }

  if (node.id === 'ue-2') {
    const shift = ue2Shift(snapshot);
    const anchorX = CELL_B.cx * (1 - shift) + CELL_A.cx * shift;
    const anchorY = CELL_B.cy * (1 - shift) + CELL_A.cy * shift;
    return {
      ...node,
      x: anchorX + 96 + Math.cos(t * 0.31 + 2.1) * 14 + Math.sin(t * 0.17 + 1.2) * 4,
      y: anchorY + 45 + Math.sin(t * 0.27 + 0.8) * 9 + Math.cos(t * 0.12 + 0.4) * 3,
    };
  }

  if (node.id === 'cpe-1') {
    return {
      ...node,
      x: CELL_A.cx + 108 + Math.cos(t * 0.1 + 1.7) * 3,
      y: CELL_A.cy + 36 + Math.sin(t * 0.12 + 0.6) * 2,
    };
  }

  return node;
}

const InterfaceBands = memo(() => (
  <g fontFamily={FONT_FAMILY}>
    <rect x={0} y={72} width={VIEWBOX_W} height={174} fill="#112B44" opacity={0.2} />
    <rect x={0} y={246} width={VIEWBOX_W} height={170} fill="#10273E" opacity={0.17} />
    <rect x={0} y={416} width={VIEWBOX_W} height={170} fill="#102236" opacity={0.16} />
    <rect x={0} y={586} width={VIEWBOX_W} height={190} fill="#0E1D30" opacity={0.17} />

    {[
      { y: 246, label: 'CORE / CENTRALIZED RAN' },
      { y: 416, label: 'DISTRIBUTED RAN' },
      { y: 584, label: 'ACCESS / RADIO' },
    ].map((band) => (
      <g key={band.label}>
        <line x1={16} y1={band.y} x2={VIEWBOX_W - 16} y2={band.y} stroke="#3A6A8A" strokeWidth={1.2} opacity={0.9} />
        <text x={24} y={band.y - 8} fill="#A8CCE0" fontSize={11.4} letterSpacing="0.08em">
          {band.label}
        </text>
      </g>
    ))}

    <text x={24} y={106} fill="#A8CCE0" fontSize={11.4} letterSpacing="0.08em">
      MANAGEMENT / ORCHESTRATION
    </text>
  </g>
));
InterfaceBands.displayName = 'InterfaceBands';

const CellCoverage: React.FC<{ snapshot: TopologySnapshot }> = memo(({ snapshot }) => (
  <g>
    <ellipse
      cx={CELL_A.cx}
      cy={CELL_A.cy}
      rx={CELL_A.rx}
      ry={CELL_A.ry}
      fill={snapshot.contention ? '#E0A8401F' : '#00A6A614'}
      stroke={snapshot.contention ? '#E0A840' : '#00A6A6'}
      strokeDasharray="7 6"
      strokeWidth={snapshot.contention ? 2 : 1.4}
    />
    <ellipse
      cx={CELL_B.cx}
      cy={CELL_B.cy}
      rx={CELL_B.rx}
      ry={CELL_B.ry}
      fill="#00A6A614"
      stroke="#00A6A6"
      strokeDasharray="7 6"
      strokeWidth={1.4}
    />

    <text x={CELL_A.cx - CELL_A.rx + 18} y={CELL_A.cy - CELL_A.ry + 18} fill="#00CCD9" fontSize={13} fontFamily={FONT_FAMILY} fontWeight={700}>
      Cell A  PRB {snapshot.cell_a_prb_used}%
    </text>
    <text x={CELL_B.cx + CELL_B.rx - 164} y={CELL_B.cy - CELL_B.ry + 18} fill="#00CCD9" fontSize={13} fontFamily={FONT_FAMILY} fontWeight={700}>
      Cell B  PRB {snapshot.cell_b_prb_used}%
    </text>
  </g>
));
CellCoverage.displayName = 'CellCoverage';

const LINK_STYLE: Record<LinkKind, { stroke: string; width: number; dash?: string }> = {
  midhaul: { stroke: '#6FAFD8', width: 2.6 },
  fronthaul: { stroke: '#00A6A6', width: 3.2 },
  telemetry: { stroke: '#98B8D3', width: 1.5, dash: '6 5' },
  api: { stroke: '#00CCD9', width: 2 },
  backhaul: { stroke: '#7BA3C2', width: 2.2 },
  noc: { stroke: '#E79A4A', width: 1.8, dash: '7 5' },
};

const Links: React.FC<{ now: number }> = memo(({ now }) => (
  <g fontFamily={FONT_FAMILY}>
    {SCHEMATIC_LINKS.map((link) => {
      const style = LINK_STYLE[link.kind];
      const labelWidth = Math.round(link.label.length * 6.5) + 16;
      const animatedOffset = style.dash ? (-now / 48) % 220 : undefined;

      return (
        <g key={link.id}>
          <path
            d={link.d}
            fill="none"
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeDasharray={style.dash}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            opacity={0.94}
          />
          <g>
            <rect x={link.labelX - 7} y={link.labelY - 15} width={labelWidth} height={19} rx={6} fill="#081727CC" stroke="#234565" />
            <text x={link.labelX} y={link.labelY - 2} fill="#BED3E5" fontSize={11} fontWeight={700}>
              {link.label}
            </text>
          </g>
        </g>
      );
    })}
  </g>
));
Links.displayName = 'Links';

function flashStyle(highlighted: boolean, highlightAge: number) {
  if (!highlighted || highlightAge > 700) return { stroke: '', width: 1.4 };
  const alpha = Math.max(0.24, 1 - highlightAge / 700);
  return { stroke: `rgba(0, 204, 217, ${alpha})`, width: 2.8 };
}

const NodeGlyph: React.FC<{
  node: TopologyNode;
  highlighted: boolean;
  highlightAge: number;
  promptMessage: string;
  snapshot: TopologySnapshot;
}> = ({ node, highlighted, highlightAge, promptMessage, snapshot }) => {
  const { x, y, w, h } = nodeRect(node);
  const flash = flashStyle(highlighted, highlightAge);
  const palette = paletteForNode(node);
  const stroke = flash.stroke || palette.stroke;

  if (node.id === 'vismon-ai') {
    const idle = snapshot.phase === 'steady';
    const promptBody = idle
      ? 'Standing by. Monitoring KPI streams and policy guardrails.'
      : truncate(promptMessage, 92);
    const footer = idle
      ? 'RCA Confidence: --  |  Suggested Action: --'
      : 'RCA Confidence: 0.82  |  Suggested Action: QoS cap UE2 / protect UE1';

    return (
      <g>
        {/* Outer panel */}
        <rect x={x} y={y} width={w} height={h} rx={12} fill="#102A40" stroke={stroke} strokeWidth={flash.width || 1.6} />
        {/* Header strip */}
        <rect x={x} y={y} width={w} height={32} rx={12} fill="#143653" />
        <rect x={x} y={y + 22} width={w} height={10} fill="#143653" />
        {/* VISMON logo image in header */}
        <image
          href="/assets/VISMON Logo - 0725-1.png"
          x={x + 8}
          y={y + 5}
          width={84}
          height={22}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* "AI CO-WORKER" amber banner */}
        <rect x={x} y={y + 32} width={w} height={20} fill="#C88000" opacity={0.9} />
        <text
          x={x + w / 2}
          y={y + 46}
          textAnchor="middle"
          fill="#1A0A00"
          fontSize={10}
          fontWeight={800}
          letterSpacing="0.12em"
          fontFamily={FONT_FAMILY}
        >
          AI CO-WORKER
        </text>

        {/* Console display area */}
        <rect x={x + 14} y={y + 58} width={w - 28} height={h - 74} rx={10} fill="#1B3348" stroke="#3D6485" />
        <text x={x + 24} y={y + 76} fill="#E3F3FF" fontSize={11.3} fontWeight={700} fontFamily={FONT_FAMILY}>
          VISMON AI
        </text>
        <text x={x + 24} y={y + 96} fill="#BED6E8" fontSize={10.2} fontFamily={FONT_FAMILY}>
          {promptBody}
        </text>
        <text x={x + 24} y={y + h - 12} fill="#8ED9E0" fontSize={9.8} fontFamily={FONT_FAMILY}>
          {truncate(footer, 74)}
        </text>
      </g>
    );
  }

  if (node.shape === 'prompt') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={10} fill={palette.fill} stroke={stroke} strokeWidth={flash.width || 1.4} />
        {/* Header accent bar */}
        <rect x={x} y={y} width={w} height={5} rx={3} fill={palette.accent} opacity={0.95} />
        <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} rx={8} fill="#2A1040" stroke="#7A4A9A" />
        {/* NOC chip */}
        <rect x={x + 16} y={y + 16} width={36} height={14} rx={7} fill={palette.accent} opacity={0.25} />
        <text x={x + 34} y={y + 27} textAnchor="middle" fill={palette.accent} fontSize={9} fontWeight={700} fontFamily={FONT_FAMILY}>
          NOC
        </text>
        <text x={x + 16} y={y + 43} fill="#F2E2EF" fontSize={10.8} fontWeight={700} fontFamily={FONT_FAMILY}>
          NOC Prompt
        </text>
        <text x={x + 16} y={y + 58} fill="#E5C8DB" fontSize={9.4} fontFamily={FONT_FAMILY}>
          Engineer decision interface
        </text>
      </g>
    );
  }

  if (node.shape === 'server' || node.shape === 'endpoint') {
    const isRic = node.id === 'nonrt-ric';
    const rapps = ['Anomaly', 'Enrichment', 'NetOps'];
    const phase = snapshot.phase;
    const activeTab =
      phase === 'steady'
        ? -1
        : phase === 'contention'
          ? 0
          : phase === 'enrich' || phase === 'rca'
            ? 1
            : phase === 'action' || phase === 'validate'
              ? 2
              : 1;

    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={9} fill={palette.fill} stroke={stroke} strokeWidth={flash.width || 1.6} />
        {/* Top accent bar — thick, bright */}
        <rect x={x} y={y} width={w} height={6} rx={3} fill={palette.accent} opacity={0.98} />
        <rect x={x + 12} y={y + h - 18} width={w - 24} height={5} rx={2} fill={palette.strip} />

        <text x={node.x} y={y + 36} textAnchor="middle" fill={palette.text} fontSize={13} fontWeight={700} fontFamily={FONT_FAMILY}>
          {node.label}
        </text>
        {node.sublabel && (
          <text x={node.x} y={y + 52} textAnchor="middle" fill={palette.sub} fontSize={10.2} fontFamily={FONT_FAMILY}>
            {node.sublabel}
          </text>
        )}

        {isRic && (
          <g>
            {/* FM / IM / PM / CM sub-chips */}
            {['FM', 'IM', 'PM', 'CM'].map((chip, ci) => {
              const chipW = 34;
              const chipGap = 6;
              const totalChipW = chipW * 4 + chipGap * 3;
              const cx2 = node.x - totalChipW / 2 + ci * (chipW + chipGap);
              const cy2 = y + 62;
              return (
                <g key={chip}>
                  <rect x={cx2} y={cy2} width={chipW} height={14} rx={7} fill="#1A4060" stroke="#2E6888" strokeWidth={0.8} />
                  <text x={cx2 + chipW / 2} y={cy2 + 10} textAnchor="middle" fill="#8FD0E8" fontSize={9} fontWeight={700} fontFamily={FONT_FAMILY}>
                    {chip}
                  </text>
                </g>
              );
            })}

            {/* rApp tabs */}
            {rapps.map((label, index) => {
              const tabW = 82;
              const tabGap = 7;
              const totalW = tabW * rapps.length + tabGap * (rapps.length - 1);
              const tx = node.x - totalW / 2 + index * (tabW + tabGap);
              const ty = y + h - 8;
              const active = index === activeTab;
              return (
                <g key={label}>
                  <rect
                    x={tx}
                    y={ty}
                    width={tabW}
                    height={18}
                    rx={9}
                    fill={active ? '#00A6A64A' : '#1B3F5A'}
                    stroke={active ? '#00D8E8' : '#3F6687'}
                  />
                  <text x={tx + tabW / 2} y={ty + 12.2} textAnchor="middle" fill={active ? '#E8FDFF' : '#B9D2E4'} fontSize={9.2} fontFamily={FONT_FAMILY}>
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  }

  if (node.shape === 'radio') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={8} fill={palette.fill} stroke={stroke} strokeWidth={flash.width || 1.6} />
        {/* Top accent bar */}
        <rect x={x} y={y} width={w} height={5} rx={3} fill={palette.accent} />

        {/* Radio wave icon */}
        <line x1={x + 34} y1={y + 60} x2={x + 34} y2={y + 30} stroke={palette.accent} strokeWidth={2} />
        <path d={`M ${x + 18} ${y + 36} A 16 16 0 0 1 ${x + 50} ${y + 36}`} fill="none" stroke={palette.accent} strokeWidth={1.5} />
        <path d={`M ${x + 24} ${y + 42} A 10 10 0 0 1 ${x + 44} ${y + 42}`} fill="none" stroke={palette.accent} strokeWidth={1.5} />

        {/* Benetel logo image — top-right corner */}
        <image
          href="/assets/Benetel-Logo.png"
          x={x + w - 54}
          y={y + 7}
          width={48}
          height={14}
          preserveAspectRatio="xMidYMid meet"
          opacity={0.92}
        />

        <text x={x + 64} y={y + 34} fill={palette.text} fontSize={12.6} fontWeight={700} fontFamily={FONT_FAMILY}>
          {node.label}
        </text>
        {node.sublabel && (
          <text x={x + 64} y={y + 49} fill={palette.sub} fontSize={9.8} fontFamily={FONT_FAMILY}>
            {node.sublabel}
          </text>
        )}
      </g>
    );
  }

  if (node.shape === 'device') {
    const ue = node.id === 'ue-1' ? snapshot.ue1 : node.id === 'ue-2' ? snapshot.ue2 : null;
    const stressed = node.id === 'ue-1' ? snapshot.ue1.prb_pct < 30 : false;
    const strokeColor = stressed ? '#E0A840' : flash.stroke || '#4F6987';

    return (
      <g>
        {/* UE Icon image — replaces hand-drawn phone */}
        <image
          href="/assets/UE Icon.png"
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid meet"
          opacity={stressed ? 0.8 : 1}
        />
        {/* Stress indicator ring when PRB low */}
        {stressed && (
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={8} fill="none" stroke={strokeColor} strokeWidth={2} opacity={0.8} />
        )}
        <text x={node.x} y={y + h + 13} textAnchor="middle" fill={C.sub} fontSize={10.8} fontWeight={700} fontFamily={FONT_FAMILY}>
          {node.label}
        </text>
        {ue && (
          <text x={node.x} y={y + h + 25} textAnchor="middle" fill="#9FC3DD" fontSize={9.6} fontFamily={FONT_FAMILY}>
            Cell {ue.cell}  PRB {ue.prb_pct}%
          </text>
        )}
      </g>
    );
  }

  if (node.shape === 'cpe') {
    return (
      <g>
        {/* CPE Icon image — replaces hand-drawn router */}
        <image
          href="/assets/CPE Icon.png"
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid meet"
        />
        <text x={node.x} y={y + h + 13} textAnchor="middle" fill={C.sub} fontSize={10.8} fontWeight={700} fontFamily={FONT_FAMILY}>
          {node.label}
        </text>
      </g>
    );
  }

  return null;
};

// ─── VISMON Energy mini-panel ─────────────────────────────────────────────────
const VismonEnergyPanel: React.FC<{ now: number; snapshot: TopologySnapshot }> = memo(({ now, snapshot }) => {
  const px = 958;
  const py = 462;
  const pw = 248;
  const ph = 166; // increased to accommodate ENERGY banner

  const isAction = snapshot.phase === 'action' || snapshot.phase === 'validate';
  const t = now / 1000;

  // Animated sparkline — 28 points across the width
  const chartX0 = px + 14;
  const chartY0 = py + ph - 26;
  const chartW = pw - 28;
  const chartH = 48;
  const pts = Array.from({ length: 28 }, (_, i) => {
    const fx = i / 27;
    const base = Math.sin(t * 0.28 + fx * 5.8) * 0.22 + Math.cos(t * 0.11 + fx * 3.2) * 0.12;
    const dip = isAction ? Math.max(0, 0.24 - Math.abs(fx - 0.62) * 1.8) : 0;
    const norm = 0.5 + base - dip;
    return `${chartX0 + fx * chartW},${chartY0 - norm * chartH}`;
  });
  const sparkPath = `M ${pts.join(' L ')}`;

  const baseKw = 24.6;
  const kw = isAction ? baseKw - 1.4 : baseKw + Math.sin(t * 0.17) * 0.6;
  const eff = isAction ? 94.2 + Math.sin(t * 0.09) * 0.4 : 91.8 + Math.sin(t * 0.19) * 0.9;

  return (
    <g fontFamily={FONT_FAMILY}>
      {/* Panel background */}
      <rect x={px} y={py} width={pw} height={ph} rx={10} fill="#0C2234" stroke="#1E4A6A" strokeWidth={1.2} />
      {/* Header strip */}
      <rect x={px} y={py} width={pw} height={26} rx={10} fill="#113248" />
      <rect x={px} y={py + 16} width={pw} height={10} fill="#113248" />
      {/* VISMON logo dot */}
      <circle cx={px + 14} cy={py + 13} r={5} fill="#00A6A6" opacity={0.9} />
      <text x={px + 24} y={py + 17.5} fill="#A0D8EF" fontSize={11} fontWeight={700} letterSpacing="0.06em">
        VISMON Energy
      </text>

      {/* "ENERGY" amber banner */}
      <rect x={px} y={py + 26} width={pw} height={18} fill="#C88000" opacity={0.88} />
      <text x={px + pw / 2} y={py + 39} textAnchor="middle" fill="#1A0A00" fontSize={10} fontWeight={800} letterSpacing="0.12em">
        ENERGY
      </text>

      {/* Readouts (shifted down 18px for the new banner) */}
      <text x={px + 14} y={py + 60} fill="#E8F6FF" fontSize={11.5} fontWeight={700}>
        Power: <tspan fill="#4DDFC5">{kw.toFixed(1)} kW</tspan>
      </text>
      <text x={px + 14} y={py + 75} fill="#E8F6FF" fontSize={11.5} fontWeight={700}>
        Efficiency: <tspan fill={isAction ? '#43C38F' : '#4DDFC5'}>{eff.toFixed(1)}%</tspan>
      </text>

      {/* Sparkline background */}
      <rect x={chartX0} y={chartY0 - chartH} width={chartW} height={chartH} rx={4} fill="#0a1c2e" />

      {/* Sparkline path */}
      <path d={sparkPath} fill="none" stroke={isAction ? '#43C38F' : '#00CCD9'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

      {/* Horizontal guide line */}
      <line x1={chartX0} y1={chartY0 - chartH * 0.5} x2={chartX0 + chartW} y2={chartY0 - chartH * 0.5} stroke="#1E4A6A" strokeWidth={0.8} strokeDasharray="3 3" />

      {/* Axis label */}
      <text x={chartX0 + chartW - 2} y={chartY0 + 12} textAnchor="end" fill="#5A8BAA" fontSize={9}>now</text>
    </g>
  );
});
VismonEnergyPanel.displayName = 'VismonEnergyPanel';

interface TopologySceneProps {
  highlightedNodes: Record<string, number>;
  now: number;
  promptMessage: string;
  snapshot: TopologySnapshot;
}

const TopologyScene: React.FC<TopologySceneProps> = ({ highlightedNodes, now, promptMessage, snapshot }) => {
  return (
    <g>
      <rect width={VIEWBOX_W} height={VIEWBOX_H} fill={C.bg} />
      <InterfaceBands />
      <CellCoverage snapshot={snapshot} />
      <Links now={now} />

      {TOPOLOGY_NODES.map((rawNode) => {
        const node = animatedNode(rawNode, now, snapshot);
        const hlTs = highlightedNodes[rawNode.id];
        const highlighted = hlTs !== undefined;
        const hlAge = highlighted ? now - hlTs : 9999;

        return (
          <NodeGlyph
            key={rawNode.id}
            node={node}
            highlighted={highlighted}
            highlightAge={hlAge}
            promptMessage={promptMessage}
            snapshot={snapshot}
          />
        );
      })}

      <VismonEnergyPanel now={now} snapshot={snapshot} />
    </g>
  );
};

export default memo(TopologyScene);
export { VIEWBOX_W, VIEWBOX_H };
