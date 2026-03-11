// ─── Legacy types (kept for backward compat) ─────────────────────────────────
export type WorkflowId = 'anomaly-rca' | 'network-assurance' | 'pci-clash' | 'intelligent-energy';
export type EventStatus = 'ok' | 'fail' | 'warn';

export interface WorkflowEvent {
  ts: number;
  workflow_id: WorkflowId;
  trace_id: string;
  from_node: string;
  to_node: string;
  status: EventStatus;
  latency_ms: number;
  payload_type: string;
}

export interface NodeDef {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rapp' | 'ai' | 'netops' | 'noc' | 'kpi' | 'decision' | 'validation';
}

export interface EdgeDef {
  id: string;
  from: string;
  to: string;
  label?: string;
  waypoints?: Array<{ x: number; y: number }>;
  style?: 'solid' | 'dashed';
}

export interface WorkflowDef {
  id: WorkflowId;
  name: string;
  shortName: string;
  nodes: NodeDef[];
  edges: EdgeDef[];
  eventSequence: Array<{
    from: string;
    to: string;
    payload_type: string;
    baseLatency: number;
    failRate: number;
  }>;
}

export interface Token {
  id: string;
  trace_id: string;
  workflow_id: WorkflowId;
  from_node: string;
  to_node: string;
  status: EventStatus;
  progress: number;
  startTime: number;
  duration: number;
}

export interface NodeStats {
  in_flight: number;
  success: number;
  fail: number;
  warn: number;
}

export interface AppState {
  playing: boolean;
  speed: number;
  mode: 'demo' | 'live';
  activeWorkflow: WorkflowId;
  tokens: Token[];
  nodeStats: Record<string, NodeStats>;
  events: WorkflowEvent[];
  highlightedNodes: Record<string, number>;
  seenEvents: Set<string>;
}

export type AppAction =
  | { type: 'SET_WORKFLOW'; payload: WorkflowId }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_MODE'; payload: 'demo' | 'live' }
  | { type: 'RESET' }
  | { type: 'ADD_EVENT'; payload: WorkflowEvent }
  | { type: 'TICK'; payload: { now: number } }
  | { type: 'HIGHLIGHT_NODE'; payload: { nodeId: string; ts: number } };

// ─── Topology types (Case Study 1) ───────────────────────────────────────────
export type MsgType =
  | 'KPI'
  | 'ANOMALY'
  | 'ENRICH'
  | 'RCA_REQ'
  | 'RCA_RESP'
  | 'RECO'
  | 'ACTION'
  | 'VALIDATION'
  | 'TICKET';

export interface UeServiceSnapshot {
  cell: 'A' | 'B';
  prb_pct: number;
  throughput_mbps: number;
  sinr_db: number;
  slice: string;
}

export interface PolicySnapshot {
  mode: 'closed-loop' | 'open-loop';
  decision:
    | 'monitoring'
    | 'pending-approval'
    | 'approved'
    | 'held'
    | 'applied'
    | 'validated'
    | 'escalated';
  intent: string;
  ue1_min_prb_pct: number;
  ue2_cap_prb_pct: number;
}

export interface TopologySnapshot {
  ue1: UeServiceSnapshot;
  ue2: UeServiceSnapshot;
  cpe: UeServiceSnapshot;
  cell_a_pci: number;
  cell_b_pci: number;
  pci_clash: boolean;
  ru_b_restarting: boolean;
  ru_b_standby: boolean;
  cell_a_prb_total: number;
  cell_a_prb_used: number;
  cell_b_prb_total: number;
  cell_b_prb_used: number;
  contention: boolean;
  phase: 'steady' | 'contention' | 'enrich' | 'rca' | 'recommend' | 'action' | 'validate' | 'escalate';
}

export interface TopologyEvent {
  ts: number;
  trace_id: string;
  msg_type: MsgType;
  step: SimulationStep;
  from: string;
  to: string;
  status: 'ok' | 'warn' | 'fail';
  details: {
    cell?: 'A' | 'B';
    ue?: string;
    kpi?: { prb_drop?: number; rsrp_delta?: number };
    recommendation?: string;
    snapshot?: TopologySnapshot;
    policy?: PolicySnapshot;
    note?: string;
  };
}

export interface TopologyNode {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'device' | 'radio' | 'cpe' | 'server' | 'cloud' | 'endpoint' | 'prompt';
  layer: 'management' | 'ran' | 'ue' | 'noc';
}

export type SimulationStep =
  | 'IDLE'
  | 'DETECT'
  | 'ENRICH'
  | 'RCA'
  | 'RECOMMEND'
  | 'ACT'
  | 'VALIDATE'
  | 'ESCALATE';

export interface TopologyToken {
  id: string;
  trace_id: string;
  msg_type: MsgType;
  path_id: string;
  progress: number; // 0–1
  startTime: number;
  duration: number; // ms
  status: 'ok' | 'warn' | 'fail';
}

export interface TopologyState {
  playing: boolean;
  speed: number;
  closedLoop: boolean;
  tokens: TopologyToken[];
  events: TopologyEvent[];
  highlightedNodes: Record<string, number>; // nodeId → timestamp
  seenKeys: Set<string>;
}
