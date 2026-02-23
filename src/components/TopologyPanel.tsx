import React from 'react';
import layoutSpec from '../layout/mockup.caseStudy1.json';
import TokenLayer from './TokenLayer';
import type { TopologySnapshot, TopologyToken } from '../types';

interface TopologyPanelProps {
  highlightedNodes: Record<string, number>;
  now: number;
  promptMessage: string;
  snapshot: TopologySnapshot;
  tokens: TopologyToken[];
  onTokenArrived: (token: TopologyToken) => void;
  onTokenExpired: (tokenId: string) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RawItem extends Rect {
  id: string;
  text?: string;
}

const spec = layoutSpec as any;
const bounds: Rect = spec.topology.bounds;
const raw: RawItem[] = spec.raw;
const textBoxes: RawItem[] = spec.textBoxes;

const rawById = new Map<string, RawItem>(raw.map((item) => [item.id, item]));
const textById = new Map<string, RawItem>(textBoxes.map((item) => [item.id, item]));

function toLocal(item: RawItem | null): Rect {
  if (!item) return { x: 0, y: 0, w: 0, h: 0 };
  return {
    x: item.x - bounds.x,
    y: item.y - bounds.y,
    w: item.w,
    h: item.h,
  };
}

function rect(id: string): Rect {
  return toLocal(rawById.get(id) ?? null);
}

function textRect(id: string): Rect & { text: string } {
  const item = textById.get(id) ?? { id, x: 0, y: 0, w: 0, h: 0, text: '' };
  const local = toLocal(item);
  return { ...local, text: (item.text ?? '').replace(/\n/g, ' ') };
}

function shapeHot(highlightedNodes: Record<string, number>, now: number, ids: string[]): boolean {
  return ids.some((id) => {
    const ts = highlightedNodes[id];
    return ts !== undefined && now - ts <= 800;
  });
}

function stripTags(input: string, max = 120): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}...`;
}

function buildEnergyPath(now: number, area: Rect, stressed: boolean): string {
  const points: string[] = [];
  const count = 30;
  const t = now / 1000;

  for (let i = 0; i < count; i += 1) {
    const f = i / (count - 1);
    const x = area.x + f * area.w;
    const base = 0.45 + Math.sin(t * 0.8 + f * 8.8) * 0.12 + Math.cos(t * 0.4 + f * 5.4) * 0.08;
    const dip = stressed ? Math.max(0, 0.18 - Math.abs(f - 0.62) * 1.4) : 0;
    const y = area.y + area.h * (1 - (base - dip));
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return points.join(' ');
}

const NOC_RIC = rect('1068');
const SMO = rect('1092');
const GNB = rect('1105');
const CORE = rect('1110');
const CORE_INNER = rect('1111');
const ORU1 = rect('1122');
const ORU2 = rect('1115');
const VISMON_AI = rect('20');
const VISMON_ENERGY = rect('1062');
const NOC_PANEL = rect('30');
const AI_BADGE = rect('22');
const ENERGY_BADGE = rect('1064');
const COVERAGE_LEFT = rect('1025');
const COVERAGE_RIGHT = rect('1125');
const HANDOFF_RING = rect('1175');

const TOP_CHIPS = ['1069', '1070', '1071', '1072'].map(rect);
const SMO_CHIPS = ['1093', '1094', '1095', '1096', '1097', '1098', '1099'].map(rect);
const GNB_CHIPS = ['1106', '1107', '1109'].map(rect);
const ORU_CHIPS = ['1123', '1117'].map(rect);

const TOP_DASH = rect('1141');
const DASH_UP = rect('1140');
const DASH_MID = rect('1136');
const DASH_CORE = rect('1133');
const DASH_LEFT = rect('1130');
const DASH_RIGHT = rect('1129');
const ELBOW = rect('1177');

const UE_BOXES = (spec.topology.components.ueIcons as RawItem[])
  .map((item) => toLocal(item))
  .sort((a, b) => a.x - b.x || a.y - b.y);

const CPE_BOXES = (spec.topology.components.cpeIcons as RawItem[])
  .map((item) => toLocal(item))
  .sort((a, b) => a.x - b.x || a.y - b.y);

const TXT_NOC_RIC = textRect('1090');
const TXT_SMO = textRect('1102');
const TXT_SMO_FOOT = textRect('1101');
const TXT_GNB = textRect('1108');
const TXT_CORE = textRect('1112');
const TXT_ORU1 = textRect('1124');
const TXT_ORU2 = textRect('1119');

const TXT_NOC = textRect('23');
const TXT_OPS = textRect('27');
const TXT_FIELD = textRect('29');

const PICTURE_NOC = rect('11');
const PICTURE_OPS = rect('26');
const PICTURE_FIELD = rect('28');

const TopologyPanel: React.FC<TopologyPanelProps> = ({
  highlightedNodes,
  now,
  promptMessage,
  snapshot,
  tokens,
  onTokenArrived,
  onTokenExpired,
}) => {
  const ricHot = shapeHot(highlightedNodes, now, ['nonrt-ric']);
  const gnbHot = shapeHot(highlightedNodes, now, ['cu', 'du-a', 'du-b']);
  const coreHot = shapeHot(highlightedNodes, now, ['core']);
  const oru1Hot = shapeHot(highlightedNodes, now, ['ru-a']);
  const oru2Hot = shapeHot(highlightedNodes, now, ['ru-b']);
  const vismonHot = shapeHot(highlightedNodes, now, ['vismon-ai', 'noc-prompt']);

  const hotStroke = '#00d8e8';
  const panelStroke = '#123a52';
  const mainNodeFill = '#1db1eb';
  const chipFill = '#30701f';
  const orangeFill = '#c75714';

  const aiInner: Rect = {
    x: VISMON_AI.x + 18,
    y: VISMON_AI.y + 46,
    w: VISMON_AI.w - 36,
    h: VISMON_AI.h - 78,
  };

  const energyInner: Rect = {
    x: VISMON_ENERGY.x + 18,
    y: VISMON_ENERGY.y + 46,
    w: VISMON_ENERGY.w - 36,
    h: VISMON_ENERGY.h - 78,
  };

  const energyChart: Rect = {
    x: energyInner.x + 12,
    y: energyInner.y + 20,
    w: energyInner.w - 24,
    h: energyInner.h - 34,
  };

  const energyPath = buildEnergyPath(now, energyChart, snapshot.phase === 'action' || snapshot.phase === 'validate');

  const aiPromptBody =
    snapshot.phase === 'steady'
      ? 'Standing by. Monitoring KPI streams and policy guardrails.'
      : stripTags(promptMessage, 96);

  return (
    <section className="topology-panel">
      <div className="topology-panel-inner">
        <svg viewBox={`0 0 ${bounds.w} ${bounds.h}`} preserveAspectRatio="none" className="topology-svg">
          <rect x={0} y={0} width={bounds.w} height={bounds.h} fill="#2c67a3" />

          <ellipse
            cx={COVERAGE_LEFT.x + COVERAGE_LEFT.w / 2}
            cy={COVERAGE_LEFT.y + COVERAGE_LEFT.h / 2}
            rx={COVERAGE_LEFT.w / 2}
            ry={COVERAGE_LEFT.h / 2}
            fill="rgba(0, 166, 166, 0.28)"
          />
          <ellipse
            cx={COVERAGE_RIGHT.x + COVERAGE_RIGHT.w / 2}
            cy={COVERAGE_RIGHT.y + COVERAGE_RIGHT.h / 2}
            rx={COVERAGE_RIGHT.w / 2}
            ry={COVERAGE_RIGHT.h / 2}
            fill="rgba(0, 166, 166, 0.26)"
          />

          <line x1={TOP_DASH.x} y1={TOP_DASH.y} x2={TOP_DASH.x + TOP_DASH.w} y2={TOP_DASH.y} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />
          <line x1={DASH_UP.x} y1={DASH_UP.y} x2={DASH_UP.x} y2={DASH_UP.y + DASH_UP.h} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />
          <line x1={DASH_MID.x} y1={DASH_MID.y} x2={DASH_MID.x} y2={DASH_MID.y + DASH_MID.h} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />
          <line x1={DASH_CORE.x} y1={DASH_CORE.y} x2={DASH_CORE.x + DASH_CORE.w} y2={DASH_CORE.y} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />
          <line x1={DASH_LEFT.x + DASH_LEFT.w} y1={DASH_LEFT.y} x2={DASH_LEFT.x} y2={DASH_LEFT.y + DASH_LEFT.h} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />
          <line x1={DASH_RIGHT.x} y1={DASH_RIGHT.y} x2={DASH_RIGHT.x + DASH_RIGHT.w} y2={DASH_RIGHT.y + DASH_RIGHT.h} stroke="#d4d8dc" strokeWidth={2.6} strokeDasharray="8 4" />

          <ellipse
            cx={HANDOFF_RING.x + HANDOFF_RING.w / 2}
            cy={HANDOFF_RING.y + HANDOFF_RING.h / 2}
            rx={HANDOFF_RING.w / 2}
            ry={HANDOFF_RING.h / 2}
            fill="none"
            stroke="#071625"
            strokeWidth={3}
            strokeDasharray="8 6"
          />

          <path
            d={`M ${(HANDOFF_RING.x + HANDOFF_RING.w).toFixed(2)} ${(HANDOFF_RING.y + HANDOFF_RING.h / 2).toFixed(2)} H ${(ELBOW.x + ELBOW.w).toFixed(2)} V ${ELBOW.y.toFixed(2)}`}
            fill="none"
            stroke="#071625"
            strokeWidth={3}
          />

          <rect
            x={NOC_RIC.x}
            y={NOC_RIC.y}
            width={NOC_RIC.w}
            height={NOC_RIC.h}
            rx={8}
            fill={mainNodeFill}
            stroke={ricHot ? hotStroke : panelStroke}
            strokeWidth={ricHot ? 3 : 1.8}
          />
          <text x={TXT_NOC_RIC.x + TXT_NOC_RIC.w / 2} y={TXT_NOC_RIC.y + TXT_NOC_RIC.h * 0.78} textAnchor="middle" fill="#eef8ff" fontSize={12} fontWeight={700}>
            {TXT_NOC_RIC.text}
          </text>

          {TOP_CHIPS.map((chip, idx) => {
            const labels = ['FM', 'IM', 'PM', 'CM'];
            return (
              <g key={`top-chip-${idx}`}>
                <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={5} fill={chipFill} />
                <text x={chip.x + chip.w / 2} y={chip.y + chip.h * 0.68} textAnchor="middle" fill="#eff8e4" fontSize={9} fontWeight={700}>
                  {labels[idx]}
                </text>
              </g>
            );
          })}

          <rect
            x={SMO.x}
            y={SMO.y}
            width={SMO.w}
            height={SMO.h}
            rx={10}
            fill={mainNodeFill}
            stroke={ricHot ? hotStroke : panelStroke}
            strokeWidth={ricHot ? 3 : 1.8}
          />
          <text x={TXT_SMO.x + TXT_SMO.w / 2} y={TXT_SMO.y + TXT_SMO.h * 0.78} textAnchor="middle" fill="#eef8ff" fontSize={12} fontWeight={700}>
            {TXT_SMO.text}
          </text>

          {SMO_CHIPS.map((chip, idx) => {
            const labels = ['FM', 'IM', 'PM', 'CM', 'CM', 'CM', 'CM'];
            return (
              <g key={`smo-chip-${idx}`}>
                <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={5} fill={chipFill} />
                <text x={chip.x + chip.w / 2} y={chip.y + chip.h * 0.68} textAnchor="middle" fill="#eff8e4" fontSize={9} fontWeight={700}>
                  {labels[idx]}
                </text>
              </g>
            );
          })}

          <text x={TXT_SMO_FOOT.x + 8} y={TXT_SMO_FOOT.y + TXT_SMO_FOOT.h * 0.72} fill="#d7ebf7" fontSize={7.1} fontWeight={700}>
            {TXT_SMO_FOOT.text}
          </text>

          <rect
            x={GNB.x}
            y={GNB.y}
            width={GNB.w}
            height={GNB.h}
            rx={10}
            fill={mainNodeFill}
            stroke={gnbHot ? hotStroke : panelStroke}
            strokeWidth={gnbHot ? 3 : 1.8}
          />
          <text x={TXT_GNB.x + TXT_GNB.w / 2} y={TXT_GNB.y + TXT_GNB.h * 0.78} textAnchor="middle" fill="#eef8ff" fontSize={12} fontWeight={700}>
            {TXT_GNB.text}
          </text>

          {GNB_CHIPS.map((chip, idx) => {
            const labels = ['CU', 'DU1', 'DU2'];
            return (
              <g key={`gnb-chip-${idx}`}>
                <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={5} fill={chipFill} />
                <text x={chip.x + chip.w / 2} y={chip.y + chip.h * 0.68} textAnchor="middle" fill="#eff8e4" fontSize={10} fontWeight={700}>
                  {labels[idx]}
                </text>
              </g>
            );
          })}

          <rect
            x={CORE.x}
            y={CORE.y}
            width={CORE.w}
            height={CORE.h}
            rx={10}
            fill={mainNodeFill}
            stroke={coreHot ? hotStroke : panelStroke}
            strokeWidth={coreHot ? 3 : 1.8}
          />
          <text x={TXT_CORE.x + TXT_CORE.w / 2} y={TXT_CORE.y + TXT_CORE.h * 0.76} textAnchor="middle" fill="#eef8ff" fontSize={12} fontWeight={700}>
            {TXT_CORE.text}
          </text>
          <rect x={CORE_INNER.x} y={CORE_INNER.y} width={CORE_INNER.w} height={CORE_INNER.h} rx={12} fill={chipFill} />
          <text x={CORE_INNER.x + CORE_INNER.w / 2} y={CORE_INNER.y + 31} textAnchor="middle" fill="#eff8e4" fontSize={10} fontWeight={700}>Druid</text>
          <text x={CORE_INNER.x + CORE_INNER.w / 2} y={CORE_INNER.y + 56} textAnchor="middle" fill="#eff8e4" fontSize={10} fontWeight={700}>RAEMIS</text>
          <text x={CORE_INNER.x + CORE_INNER.w / 2} y={CORE_INNER.y + 78} textAnchor="middle" fill="#eff8e4" fontSize={10} fontWeight={700}>REST API</text>

          <rect
            x={ORU1.x}
            y={ORU1.y}
            width={ORU1.w}
            height={ORU1.h}
            rx={8}
            fill={mainNodeFill}
            stroke={oru1Hot ? hotStroke : panelStroke}
            strokeWidth={oru1Hot ? 3 : 1.8}
          />
          <text x={TXT_ORU1.x + TXT_ORU1.w / 2} y={TXT_ORU1.y + TXT_ORU1.h * 0.76} textAnchor="middle" fill="#eef8ff" fontSize={10} fontWeight={700}>{TXT_ORU1.text}</text>

          <rect
            x={ORU2.x}
            y={ORU2.y}
            width={ORU2.w}
            height={ORU2.h}
            rx={8}
            fill={mainNodeFill}
            stroke={oru2Hot ? hotStroke : panelStroke}
            strokeWidth={oru2Hot ? 3 : 1.8}
          />
          <text x={TXT_ORU2.x + TXT_ORU2.w / 2} y={TXT_ORU2.y + TXT_ORU2.h * 0.76} textAnchor="middle" fill="#eef8ff" fontSize={10} fontWeight={700}>{TXT_ORU2.text}</text>

          {ORU_CHIPS.map((chip, idx) => (
            <g key={`oru-chip-${idx}`}>
              <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={5} fill={chipFill} />
              <text x={chip.x + chip.w / 2} y={chip.y + chip.h * 0.7} textAnchor="middle" fill="#eff8e4" fontSize={9} fontWeight={700}>
                {idx === 0 ? 'Benetel 550' : 'Benetel 6/550'}
              </text>
            </g>
          ))}

          <rect
            x={aiInner.x}
            y={aiInner.y}
            width={aiInner.w}
            height={aiInner.h}
            rx={8}
            fill="#020a14"
            stroke="#0f2538"
            strokeWidth={1.4}
          />
          <text x={aiInner.x + 10} y={aiInner.y + 14} fill="#9ec1d8" fontSize={5.5}>Network Diagnostic Agent</text>
          <text x={aiInner.x + 10} y={aiInner.y + 24} fill="#5f7f97" fontSize={4.8}>Monitoring Alert Summary</text>
          <rect x={aiInner.x + 9} y={aiInner.y + 30} width={aiInner.w - 18} height={31} rx={4} fill="#121f30" />
          <text x={aiInner.x + 14} y={aiInner.y + 41} fill="#d8e8f4" fontSize={5.1}>Detected PRB contention affecting UE1.</text>
          <text x={aiInner.x + 14} y={aiInner.y + 49} fill="#d8e8f4" fontSize={5.1}>{stripTags(aiPromptBody, 58)}</text>
          <text x={aiInner.x + 14} y={aiInner.y + 57} fill="#8fb6cf" fontSize={4.8}>RCA Confidence: 0.82 | Suggestion: QoS cap UE2</text>

          <rect
            x={energyInner.x}
            y={energyInner.y}
            width={energyInner.w}
            height={energyInner.h}
            rx={8}
            fill="#e4edf3"
            stroke="#aebdca"
            strokeWidth={1.2}
          />
          <rect x={energyChart.x} y={energyChart.y} width={energyChart.w} height={energyChart.h} rx={5} fill="#f5f8fb" />
          <line x1={energyChart.x} y1={energyChart.y + energyChart.h * 0.5} x2={energyChart.x + energyChart.w} y2={energyChart.y + energyChart.h * 0.5} stroke="#c8d4de" strokeDasharray="4 3" />
          <path d={energyPath} fill="none" stroke="#e3a141" strokeWidth={2} />

          <image
            href="/assets/vismon_ai_frame.png"
            x={VISMON_AI.x}
            y={VISMON_AI.y}
            width={VISMON_AI.w}
            height={VISMON_AI.h}
            preserveAspectRatio="none"
          />
          <image
            href="/assets/vismon_energy_frame.png"
            x={VISMON_ENERGY.x}
            y={VISMON_ENERGY.y}
            width={VISMON_ENERGY.w}
            height={VISMON_ENERGY.h}
            preserveAspectRatio="none"
          />

          {vismonHot && (
            <g>
              <rect x={VISMON_AI.x + 3} y={VISMON_AI.y + 3} width={VISMON_AI.w - 6} height={VISMON_AI.h - 6} rx={12} fill="none" stroke={hotStroke} strokeWidth={2.8} opacity={0.9} />
              <rect x={VISMON_ENERGY.x + 3} y={VISMON_ENERGY.y + 3} width={VISMON_ENERGY.w - 6} height={VISMON_ENERGY.h - 6} rx={12} fill="none" stroke={hotStroke} strokeWidth={2.4} opacity={0.72} />
            </g>
          )}

          <rect x={NOC_PANEL.x} y={NOC_PANEL.y} width={NOC_PANEL.w} height={NOC_PANEL.h} rx={12} fill="none" stroke="#123a52" strokeWidth={1.6} />

          {[
            { icon: PICTURE_NOC, text: TXT_NOC.text, y: TXT_NOC.y, hot: false },
            { icon: PICTURE_OPS, text: TXT_OPS.text, y: TXT_OPS.y, hot: false },
            { icon: PICTURE_FIELD, text: TXT_FIELD.text, y: TXT_FIELD.y, hot: shapeHot(highlightedNodes, now, ['noc-prompt']) },
          ].map((item, idx) => (
            <g key={`side-role-${idx}`}>
              <circle cx={item.icon.x + item.icon.w * 0.5} cy={item.icon.y + item.icon.h * 0.34} r={item.icon.w * 0.15} fill="#c9dbe7" />
              <path
                d={`M ${item.icon.x + item.icon.w * 0.2} ${item.icon.y + item.icon.h * 0.76} C ${item.icon.x + item.icon.w * 0.32} ${item.icon.y + item.icon.h * 0.52}, ${item.icon.x + item.icon.w * 0.68} ${item.icon.y + item.icon.h * 0.52}, ${item.icon.x + item.icon.w * 0.8} ${item.icon.y + item.icon.h * 0.76} Z`}
                fill="#c9dbe7"
              />
              <text x={TXT_NOC.x} y={item.y + TXT_NOC.h * 0.72} fill={item.hot ? '#f8d58a' : '#d2e5f2'} fontSize={10} fontWeight={700}>{item.text}</text>
            </g>
          ))}

          <rect x={AI_BADGE.x} y={AI_BADGE.y} width={AI_BADGE.w} height={AI_BADGE.h} rx={13} fill={orangeFill} stroke="#6b3310" strokeWidth={1.2} />
          <text x={AI_BADGE.x + AI_BADGE.w / 2} y={AI_BADGE.y + AI_BADGE.h * 0.72} textAnchor="middle" fill="#f5e9df" fontSize={10} fontWeight={800} letterSpacing="0.18em">AI</text>

          <rect x={ENERGY_BADGE.x} y={ENERGY_BADGE.y} width={ENERGY_BADGE.w} height={ENERGY_BADGE.h} rx={13} fill={orangeFill} stroke="#6b3310" strokeWidth={1.2} />
          <text x={ENERGY_BADGE.x + ENERGY_BADGE.w / 2} y={ENERGY_BADGE.y + ENERGY_BADGE.h * 0.72} textAnchor="middle" fill="#f5e9df" fontSize={10} fontWeight={800} letterSpacing="0.18em">ENERGY</text>

          {UE_BOXES.map((ue: Rect, idx: number) => {
            const label = idx === 0 ? 'UE\n1' : idx === 3 ? 'UE\n2' : 'UE';
            const fill = idx === 0 ? '#f3a06f' : idx === 3 ? '#9de18c' : '#f2f2f2';
            return (
              <g key={`ue-${idx}`}>
                <rect x={ue.x} y={ue.y} width={ue.w} height={ue.h} rx={3} fill={fill} stroke="#2a3643" strokeWidth={1.3} />
                {label.includes('\n') ? (
                  <>
                    <text x={ue.x + ue.w / 2} y={ue.y + ue.h * 0.38} textAnchor="middle" fill="#10202c" fontSize={7} fontWeight={700}>UE</text>
                    <text x={ue.x + ue.w / 2} y={ue.y + ue.h * 0.75} textAnchor="middle" fill="#10202c" fontSize={11} fontWeight={700}>{label.split('\n')[1]}</text>
                  </>
                ) : (
                  <text x={ue.x + ue.w / 2} y={ue.y + ue.h * 0.67} textAnchor="middle" fill="#10202c" fontSize={11} fontWeight={700}>{label}</text>
                )}
              </g>
            );
          })}

          {CPE_BOXES.map((cpe: Rect, idx: number) => (
            <image
              key={`cpe-${idx}`}
              href="/assets/CPE Icon.png"
              x={cpe.x}
              y={cpe.y}
              width={cpe.w}
              height={cpe.h}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}

          <TokenLayer tokens={tokens} onTokenArrived={onTokenArrived} onTokenExpired={onTokenExpired} />
        </svg>
      </div>
    </section>
  );
};

export default TopologyPanel;
