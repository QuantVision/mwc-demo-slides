import React from 'react';
import type { TopologyEvent, SimulationStep, TopologySnapshot, PolicySnapshot } from '../types';
import { MSG_TYPE_COLOR, MSG_TYPE_LABEL } from '../topology/paths';

interface EventTimelineProps {
  events: TopologyEvent[];
  currentStep: SimulationStep;
  snapshot: TopologySnapshot;
  policy: PolicySnapshot;
  narrative: string;
}

interface WorkflowDiagramProps {
  currentStep: SimulationStep;
}

type NodeState = 'neutral' | 'active' | 'visited';

const STATUS_ICON: Record<string, string> = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
};

const STATUS_COLOR: Record<string, string> = {
  ok: '#43C38F',
  warn: '#E0A840',
  fail: '#E05050',
};

function buildVisitedSteps(currentStep: SimulationStep): Set<SimulationStep> {
  const visited = new Set<SimulationStep>();
  if (currentStep === 'IDLE') return visited;

  const progression: SimulationStep[] = ['DETECT', 'ENRICH', 'RCA', 'RECOMMEND', 'ACT', 'VALIDATE'];
  const currentIndex = progression.indexOf(currentStep);

  if (currentIndex >= 0) {
    progression.slice(0, currentIndex).forEach((step) => visited.add(step));
    return visited;
  }

  if (currentStep === 'ESCALATE') {
    ['DETECT', 'ENRICH', 'RCA', 'RECOMMEND'].forEach((step) => visited.add(step as SimulationStep));
  }

  return visited;
}

function stateFor(step: SimulationStep, currentStep: SimulationStep, visited: Set<SimulationStep>): NodeState {
  if (currentStep === step) return 'active';
  if (visited.has(step)) return 'visited';
  return 'neutral';
}

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ currentStep }) => {
  const visited = buildVisitedSteps(currentStep);

  const detectState = stateFor('DETECT', currentStep, visited);
  const enrichState = stateFor('ENRICH', currentStep, visited);
  const rcaState = stateFor('RCA', currentStep, visited);
  const recoState = stateFor('RECOMMEND', currentStep, visited);
  const actionState = stateFor('ACT', currentStep, visited);
  const validateState = stateFor('VALIDATE', currentStep, visited);
  const escalateState: NodeState = currentStep === 'ESCALATE' ? 'active' : 'neutral';

  const decisionState: NodeState =
    currentStep === 'RECOMMEND'
      ? 'active'
      : currentStep === 'ACT' || currentStep === 'VALIDATE' || currentStep === 'ESCALATE'
        ? 'visited'
        : 'neutral';

  const endState: NodeState = currentStep === 'VALIDATE' ? 'active' : currentStep === 'IDLE' ? 'neutral' : 'visited';

  const linkClass = (state: NodeState) => `wf-link ${state === 'active' ? 'active' : state === 'visited' ? 'visited' : ''}`;
  const shapeClass = (base: string, state: NodeState) =>
    `wf-shape ${base} ${state === 'active' ? 'active' : state === 'visited' ? 'visited' : ''}`;

  return (
    <svg className="workflow-diagram" viewBox="0 0 430 930" preserveAspectRatio="xMidYMin meet">
      <defs>
        <marker id="wf-arrow-head" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
        </marker>
      </defs>

      <line x1="166" y1="78" x2="166" y2="118" className={linkClass(enrichState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="182" x2="166" y2="224" className={linkClass(enrichState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="288" x2="166" y2="330" className={linkClass(rcaState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="394" x2="166" y2="436" className={linkClass(recoState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="500" x2="166" y2="524" className={linkClass(decisionState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="608" x2="166" y2="650" className={linkClass(actionState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="714" x2="166" y2="756" className={linkClass(validateState)} markerEnd="url(#wf-arrow-head)" />
      <line x1="166" y1="820" x2="166" y2="856" className={linkClass(endState)} markerEnd="url(#wf-arrow-head)" />
      <path d="M 278 566 H 296" className={linkClass(escalateState)} markerEnd="url(#wf-arrow-head)" />

      <text x="170" y="634" className="wf-link-label">Yes</text>
      <text x="282" y="554" className="wf-link-label">No</text>

      <g className={shapeClass('wf-terminal', detectState)}>
        <rect x="56" y="20" width="220" height="58" rx="29" />
        <text x="166" y="45" textAnchor="middle" className="wf-node-title">1. Anomaly Detector</text>
        <text x="166" y="62" textAnchor="middle" className="wf-node-sub">UE1 degradation on Cell A</text>
      </g>

      <g className={shapeClass('wf-process', enrichState)}>
        <rect x="56" y="118" width="220" height="64" rx="8" />
        <text x="166" y="145" textAnchor="middle" className="wf-node-title">2. Enrichment rApp</text>
        <text x="166" y="162" textAnchor="middle" className="wf-node-sub">Adds PRB, slice, and UE context</text>
      </g>

      <g className={shapeClass('wf-process', rcaState)}>
        <rect x="56" y="224" width="220" height="64" rx="8" />
        <text x="166" y="250" textAnchor="middle" className="wf-node-title">3. Send to VISMON AI</text>
        <text x="166" y="267" textAnchor="middle" className="wf-node-sub">REST/gRPC enriched payload</text>
      </g>

      <g className={shapeClass('wf-process', rcaState)}>
        <rect x="56" y="330" width="220" height="64" rx="8" />
        <text x="166" y="356" textAnchor="middle" className="wf-node-title">4. VISMON AI RCA</text>
        <text x="166" y="373" textAnchor="middle" className="wf-node-sub">Root cause over 360 topology</text>
      </g>

      <g className={shapeClass('wf-process', recoState)}>
        <rect x="56" y="436" width="220" height="64" rx="8" />
        <text x="166" y="462" textAnchor="middle" className="wf-node-title">5. Recommendation</text>
        <text x="166" y="479" textAnchor="middle" className="wf-node-sub">Notify NOC + policy guardrails</text>
      </g>

      <g className={shapeClass('wf-decision', decisionState)}>
        <polygon points="166,524 278,566 166,608 54,566" />
        <text x="166" y="563" textAnchor="middle" className="wf-node-title">Engineer applies policy?</text>
        <text x="166" y="580" textAnchor="middle" className="wf-node-sub">Open vs closed loop</text>
      </g>

      <g className={shapeClass('wf-process', actionState)}>
        <rect x="56" y="650" width="220" height="64" rx="8" />
        <text x="166" y="676" textAnchor="middle" className="wf-node-title">6. Network Ops rApp</text>
        <text x="166" y="693" textAnchor="middle" className="wf-node-sub">Apply DU/CU/RU policy action</text>
      </g>

      <g className={shapeClass('wf-process', validateState)}>
        <rect x="56" y="756" width="220" height="64" rx="8" />
        <text x="166" y="782" textAnchor="middle" className="wf-node-title">7. Validation</text>
        <text x="166" y="799" textAnchor="middle" className="wf-node-sub">Confirm KPI recovery for UE1</text>
      </g>

      <g className={shapeClass('wf-terminal wf-end', endState)}>
        <rect x="56" y="856" width="220" height="58" rx="29" />
        <text x="166" y="881" textAnchor="middle" className="wf-node-title">Closed-loop stabilized</text>
        <text x="166" y="898" textAnchor="middle" className="wf-node-sub">Monitoring resumes</text>
      </g>

      <g className={shapeClass('wf-terminal wf-open-loop', escalateState)}>
        <rect x="296" y="534" width="124" height="64" rx="30" />
        <text x="358" y="560" textAnchor="middle" className="wf-node-title">Escalated</text>
        <text x="358" y="578" textAnchor="middle" className="wf-node-sub">VISMON prompt</text>
      </g>
    </svg>
  );
};

const EventTimeline: React.FC<EventTimelineProps> = ({ events, currentStep, snapshot, policy, narrative }) => {
  const cellAFree = Math.max(0, snapshot.cell_a_prb_total - snapshot.cell_a_prb_used);
  const cellBFree = Math.max(0, snapshot.cell_b_prb_total - snapshot.cell_b_prb_used);
  const isClosedLoop = policy.mode === 'closed-loop';

  return (
    <div className="right-panel">
      <section className="scenario-card">
        <div className="scenario-header">
          <div>
            <div className="panel-label">LIVE CASE STUDY NARRATIVE</div>
            <div className="scenario-title">UE1/UE2 Contention and Recovery</div>
          </div>
          <div className="scenario-badges">
            <span className={`mode-pill ${isClosedLoop ? 'active' : ''}`}>
              {isClosedLoop ? 'Closed Loop' : 'Open Loop'}
            </span>
            <span className="step-pill">{currentStep === 'IDLE' ? 'Monitoring' : currentStep}</span>
          </div>
        </div>
        <p className="scenario-text">{narrative}</p>
        <div className="scenario-grid">
          <div className="metric-card">
            <div className="metric-title">UE1</div>
            <div className="metric-line">Cell {snapshot.ue1.cell} · {snapshot.ue1.slice}</div>
            <div className="metric-line">PRB {snapshot.ue1.prb_pct}% · {snapshot.ue1.throughput_mbps} Mbps</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">UE2</div>
            <div className="metric-line">Cell {snapshot.ue2.cell} · {snapshot.ue2.slice}</div>
            <div className="metric-line">PRB {snapshot.ue2.prb_pct}% · {snapshot.ue2.throughput_mbps} Mbps</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Cell PRB Pool</div>
            <div className="metric-line">Cell A used {snapshot.cell_a_prb_used}% · free {cellAFree}%</div>
            <div className="metric-line">Cell B used {snapshot.cell_b_prb_used}% · free {cellBFree}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Policy / Decision</div>
            <div className="metric-line">UE1 min {policy.ue1_min_prb_pct}% · UE2 cap {policy.ue2_cap_prb_pct}%</div>
            <div className="metric-line">State: {policy.decision.replace('-', ' ')}</div>
          </div>
        </div>
      </section>

      <div className="right-lower-grid">
        <section className="workflow-card">
          <div className="workflow-header">
            <div className="panel-label">CASE STUDY 1 WORKFLOW</div>
            <span className="workflow-step-state">Current: {currentStep === 'IDLE' ? 'Monitoring' : currentStep}</span>
          </div>
          <div className="mode-row">
            <span className="mode-pill">Mode 1 · DU Centric</span>
            <span className="mode-pill">Mode 2 · UE Centric</span>
          </div>

          <div className="workflow-flow">
            <WorkflowDiagram currentStep={currentStep} />
          </div>
        </section>

        <section className="events-card compact">
          <div className="events-header">
            <div className="panel-label">LIVE EVENTS</div>
            <span>{events.length} / 50</span>
          </div>
          <div className="events-list">
            {events.length === 0 && <div className="events-empty">Waiting for telemetry events...</div>}
            {events.map((event, i) => {
              const isAnomalyWarning = event.msg_type === 'ANOMALY';
              return (
                <div
                  key={`${event.trace_id}-${event.msg_type}-${event.ts}-${i}`}
                  className={`event-row ${isAnomalyWarning ? 'warning' : ''}`}
                >
                  <div className="event-top">
                    <span className="event-time">{new Date(event.ts).toTimeString().slice(0, 8)}</span>
                    <span className="event-type" style={{ color: MSG_TYPE_COLOR[event.msg_type] }}>
                      {event.msg_type}
                    </span>
                    <span className="event-status" style={{ color: STATUS_COLOR[event.status] }}>
                      {STATUS_ICON[event.status]}
                    </span>
                  </div>
                  <div className="event-mid">
                    <span>{MSG_TYPE_LABEL[event.msg_type]}</span>
                    <span>
                      {event.from} → {event.to}
                    </span>
                  </div>
                  <div className="event-bottom">
                    <span>{event.trace_id}</span>
                    {event.details.cell && <span>Cell {event.details.cell}</span>}
                    {event.details.ue && <span>{event.details.ue}</span>}
                    {event.details.kpi?.prb_drop !== undefined && <span>PRB↓{event.details.kpi.prb_drop}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EventTimeline;
