import React from 'react';
import type { SimulationStep } from '../types';
import type { WorkflowCopy } from '../caseStudies/config';

type NodeState = 'neutral' | 'active' | 'visited';

interface WorkflowPaneProps {
  currentStep: SimulationStep;
  copy: WorkflowCopy;
}

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

const WorkflowPane: React.FC<WorkflowPaneProps> = ({ currentStep, copy }) => {
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
    <section className="dashboard-pane workflow-pane">
      <header className="pane-header">
        <h3 className="pane-title">{copy.paneTitle}</h3>
      </header>

      <div className="pane-body workflow-pane-body">
        <svg
          className="workflow-diagram"
          viewBox="-5 0 470 940"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <marker id="wf-arrow-head" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>

          {/* Connector lines */}
          <line x1="166" y1="78" x2="166" y2="118" className={linkClass(enrichState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="182" x2="166" y2="224" className={linkClass(enrichState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="288" x2="166" y2="330" className={linkClass(rcaState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="394" x2="166" y2="436" className={linkClass(recoState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="500" x2="166" y2="524" className={linkClass(decisionState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="608" x2="166" y2="650" className={linkClass(actionState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="714" x2="166" y2="756" className={linkClass(validateState)} markerEnd="url(#wf-arrow-head)" />
          <line x1="166" y1="820" x2="166" y2="856" className={linkClass(endState)} markerEnd="url(#wf-arrow-head)" />
          <path d="M 278 566 H 304" className={linkClass(escalateState)} markerEnd="url(#wf-arrow-head)" />

          <text x="170" y="634" className="wf-link-label">Yes</text>
          <text x="292" y="554" className="wf-link-label">No</text>

          {/* 1. Anomaly Detector rApp */}
          <g className={shapeClass('wf-terminal', detectState)}>
            <rect x="56" y="20" width="220" height="58" rx="29" />
            <text x="166" y="44" textAnchor="middle" className="wf-node-title">{copy.detectTitle}</text>
            <text x="166" y="67" textAnchor="middle" className="wf-node-sub">{copy.detectSub}</text>
          </g>

          {/* 2. rApp Enrichment */}
          <g className={shapeClass('wf-process', enrichState)}>
            <rect x="56" y="118" width="220" height="64" rx="8" />
            <text x="166" y="145" textAnchor="middle" className="wf-node-title">{copy.enrichTitle}</text>
            <text x="166" y="168" textAnchor="middle" className="wf-node-sub">{copy.enrichSub}</text>
          </g>

          {/* 3. Call VISMON AI */}
          <g className={shapeClass('wf-process', rcaState)}>
            <rect x="56" y="224" width="220" height="64" rx="8" />
            <text x="166" y="250" textAnchor="middle" className="wf-node-title">{copy.callTitle}</text>
            <text x="166" y="273" textAnchor="middle" className="wf-node-sub">{copy.callSub}</text>
          </g>

          {/* 4. VISMON RCA Engine */}
          <g className={shapeClass('wf-process', rcaState)}>
            <rect x="56" y="330" width="220" height="64" rx="8" />
            <text x="166" y="356" textAnchor="middle" className="wf-node-title">{copy.rcaTitle}</text>
            <text x="166" y="379" textAnchor="middle" className="wf-node-sub">{copy.rcaSub}</text>
          </g>

          {/* 5. Recommendation */}
          <g className={shapeClass('wf-process', recoState)}>
            <rect x="56" y="436" width="220" height="64" rx="8" />
            <text x="166" y="462" textAnchor="middle" className="wf-node-title">{copy.recommendationTitle}</text>
            <text x="166" y="485" textAnchor="middle" className="wf-node-sub">{copy.recommendationSub}</text>
          </g>

          {/* Decision diamond */}
          <g className={shapeClass('wf-decision', decisionState)}>
            <polygon points="166,524 278,566 166,608 54,566" />
            <text x="166" y="560" textAnchor="middle" className="wf-node-title">{copy.decisionLine1}</text>
            <text x="166" y="582" textAnchor="middle" className="wf-node-title">{copy.decisionLine2}</text>
          </g>

          {/* 6. Network Operations rApp */}
          <g className={shapeClass('wf-process', actionState)}>
            <rect x="56" y="650" width="220" height="64" rx="8" />
            <text x="166" y="676" textAnchor="middle" className="wf-node-title">{copy.actionTitle}</text>
            <text x="166" y="699" textAnchor="middle" className="wf-node-sub">{copy.actionSub}</text>
          </g>

          {/* 7. Validation */}
          <g className={shapeClass('wf-process', validateState)}>
            <rect x="56" y="756" width="220" height="64" rx="8" />
            <text x="166" y="779" textAnchor="middle" className="wf-node-title">{copy.validateTitle}</text>
            <text x="166" y="802" textAnchor="middle" className="wf-node-sub">{copy.validateSub}</text>
            <text x="155" y="823" textAnchor="middle" className="wf-node-sub" style={{ fontSize: '10px', fill: '#9ad0ea' }}>yes (loop)</text>
            <text x="185" y="823" textAnchor="middle" className="wf-node-sub" style={{ fontSize: '10px', fill: '#bed3e5' }}>no</text>
          </g>

          {/* End: Closed-loop stabilized */}
          <g className={shapeClass('wf-terminal wf-end', endState)}>
            <rect x="56" y="856" width="220" height="58" rx="29" />
            <text x="166" y="881" textAnchor="middle" className="wf-node-title">{copy.endTitle}</text>
            <text x="166" y="903" textAnchor="middle" className="wf-node-sub">{copy.endSub}</text>
          </g>

          {/* Escalate: VISMON AI Prompt */}
          <g className={shapeClass('wf-terminal wf-open-loop', escalateState)}>
            <rect x="316" y="530" width="140" height="76" rx="16" />
            <text x="386" y="556" textAnchor="middle" className="wf-node-title">{copy.escalateTitle}</text>
            <text x="386" y="578" textAnchor="middle" className="wf-node-title">{copy.escalateSub}</text>
            <text x="386" y="600" textAnchor="middle" className="wf-node-sub">{copy.escalateDetail}</text>
          </g>
        </svg>
      </div>
    </section>
  );
};

export default WorkflowPane;
