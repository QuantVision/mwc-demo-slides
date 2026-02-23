import layoutSpec from '../layout/mockup.caseStudy1.json';
import type { MsgType } from '../types';

export interface PathDef {
  id: string;
  msg_type: MsgType;
  from_node: string;
  to_node: string;
  d: string;
  color: string;
  label: string;
  description: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const spec = layoutSpec as any;
const topoBounds = spec.topology.bounds;
const topo = spec.topology.components;

function localRect(rect: Rect): Rect {
  return {
    x: rect.x - topoBounds.x,
    y: rect.y - topoBounds.y,
    w: rect.w,
    h: rect.h,
  };
}

function cx(rect: Rect): number {
  return rect.x + rect.w / 2;
}

function cy(rect: Rect): number {
  return rect.y + rect.h / 2;
}

const ricsmo = localRect(topo.ricsmo);
const gnb = localRect(topo.gnb);
const vismonAi = localRect(topo.vismonAi);

const ricsmoRightX = ricsmo.x + ricsmo.w;
const ricsmoBottomY = ricsmo.y + ricsmo.h;
const gnbTopY = gnb.y;
const gnbBottomY = gnb.y + gnb.h;
const vismonLeftX = vismonAi.x;

function fmt(value: number): string {
  return value.toFixed(1);
}

function d(points: string[]): string {
  return points.join(' ');
}

export const PATHS: PathDef[] = [
  {
    id: 'kpi-du-b-ric',
    msg_type: 'KPI',
    from_node: 'du-b',
    to_node: 'nonrt-ric',
    d: d([
      `M ${fmt(cx(gnb) + 14)} ${fmt(gnbTopY + 6)}`,
      `V ${fmt(ricsmoBottomY + 48)}`,
      `H ${fmt(cx(ricsmo) + 54)}`,
      `V ${fmt(ricsmoBottomY - 2)}`,
    ]),
    color: '#4DA3D9',
    label: 'KPI Stream',
    description: 'Continuous KPI telemetry from gNB DU/CU to SMO+rApp.',
  },
  {
    id: 'anomaly-ric-vismon',
    msg_type: 'ANOMALY',
    from_node: 'nonrt-ric',
    to_node: 'vismon-ai',
    d: d([
      `M ${fmt(ricsmoRightX)} ${fmt(cy(ricsmo))}`,
      `H ${fmt(vismonLeftX + 8)}`,
    ]),
    color: '#E0A840',
    label: 'Anomaly Event',
    description: 'Anomaly event pushed from rApp to VISMON AI.',
  },
  {
    id: 'enrich-loop',
    msg_type: 'ENRICH',
    from_node: 'nonrt-ric',
    to_node: 'nonrt-ric',
    d: d([
      `M ${fmt(cx(ricsmo) - 56)} ${fmt(ricsmo.y + 2)}`,
      `H ${fmt(cx(ricsmo) + 56)}`,
      `V ${fmt(ricsmo.y + 18)}`,
      `H ${fmt(cx(ricsmo) - 56)}`,
      `Z`,
    ]),
    color: '#7A9BBF',
    label: 'Enrichment',
    description: 'Enrichment rApp augments KPI event with context.',
  },
  {
    id: 'rca-req-inference',
    msg_type: 'RCA_REQ',
    from_node: 'vismon-ai',
    to_node: 'vismon-ai',
    d: d([
      `M ${fmt(vismonAi.x + 48)} ${fmt(vismonAi.y + 62)}`,
      `H ${fmt(vismonAi.x + vismonAi.w - 40)}`,
      `V ${fmt(vismonAi.y + vismonAi.h - 30)}`,
      `H ${fmt(vismonAi.x + 48)}`,
      `V ${fmt(vismonAi.y + 62)}`,
    ]),
    color: '#00A6A6',
    label: 'RCA Processing',
    description: 'VISMON AI executes RCA over enriched context.',
  },
  {
    id: 'rca-resp-vismon-ric',
    msg_type: 'RCA_RESP',
    from_node: 'vismon-ai',
    to_node: 'nonrt-ric',
    d: d([
      `M ${fmt(vismonLeftX + 8)} ${fmt(cy(vismonAi) + 22)}`,
      `H ${fmt(ricsmoRightX + 4)}`,
    ]),
    color: '#00D1B2',
    label: 'RCA Response',
    description: 'VISMON AI returns RCA result back to rApp.',
  },
  {
    id: 'reco-vismon-ric',
    msg_type: 'RECO',
    from_node: 'vismon-ai',
    to_node: 'nonrt-ric',
    d: d([
      `M ${fmt(vismonLeftX + 8)} ${fmt(cy(vismonAi) - 22)}`,
      `H ${fmt(ricsmoRightX + 4)}`,
    ]),
    color: '#00CCD9',
    label: 'Recommendation',
    description: 'VISMON AI recommendation sent to rApp.',
  },
  {
    id: 'action-ric-du-b',
    msg_type: 'ACTION',
    from_node: 'nonrt-ric',
    to_node: 'du-b',
    d: d([
      `M ${fmt(cx(ricsmo) + 14)} ${fmt(ricsmoBottomY)}`,
      `V ${fmt(gnbTopY - 40)}`,
      `H ${fmt(cx(gnb) + 12)}`,
      `V ${fmt(gnbTopY + 6)}`,
    ]),
    color: '#9B7CE3',
    label: 'Closed-Loop Action',
    description: 'Policy action pushed from rApp to DU/CU controller.',
  },
  {
    id: 'validation-du-b-ric',
    msg_type: 'VALIDATION',
    from_node: 'du-b',
    to_node: 'nonrt-ric',
    d: d([
      `M ${fmt(cx(gnb) - 30)} ${fmt(gnbTopY + 4)}`,
      `V ${fmt(ricsmoBottomY + 24)}`,
      `H ${fmt(cx(ricsmo) - 34)}`,
      `V ${fmt(ricsmoBottomY - 2)}`,
    ]),
    color: '#43C38F',
    label: 'Validation',
    description: 'Validation feedback from DU/CU telemetry.',
  },
  {
    id: 'ticket-escalation',
    msg_type: 'TICKET',
    from_node: 'nonrt-ric',
    to_node: 'noc-prompt',
    d: d([
      `M ${fmt(ricsmoRightX)} ${fmt(cy(ricsmo) + 14)}`,
      `H ${fmt(vismonLeftX + vismonAi.w - 6)}`,
      `V ${fmt(cy(vismonAi) + 18)}`,
    ]),
    color: '#E05050',
    label: 'NOC Notification',
    description: 'Escalation ticket/notification toward NOC prompt.',
  },
];

export const PATH_MAP: Record<string, PathDef> = Object.fromEntries(PATHS.map((p) => [p.id, p]));

export const MSG_TYPE_COLOR: Record<MsgType, string> = {
  KPI: '#4DA3D9',
  ANOMALY: '#E0A840',
  ENRICH: '#7A9BBF',
  RCA_REQ: '#00A6A6',
  RCA_RESP: '#00D1B2',
  RECO: '#00CCD9',
  ACTION: '#9B7CE3',
  VALIDATION: '#43C38F',
  TICKET: '#E05050',
};

export const MSG_TYPE_LABEL: Record<MsgType, string> = {
  KPI: 'KPI Stream',
  ANOMALY: 'Anomaly Event',
  ENRICH: 'Context Enrichment',
  RCA_REQ: 'RCA Processing',
  RCA_RESP: 'RCA Response',
  RECO: 'Recommendation',
  ACTION: 'Closed-Loop Action',
  VALIDATION: 'Validation',
  TICKET: 'NOC Engineer Alert',
};

export const MSG_TYPE_PATH: Record<MsgType, string> = {
  KPI: 'kpi-du-b-ric',
  ANOMALY: 'anomaly-ric-vismon',
  ENRICH: 'enrich-loop',
  RCA_REQ: 'rca-req-inference',
  RCA_RESP: 'rca-resp-vismon-ric',
  RECO: 'reco-vismon-ric',
  ACTION: 'action-ric-du-b',
  VALIDATION: 'validation-du-b-ric',
  TICKET: 'ticket-escalation',
};
