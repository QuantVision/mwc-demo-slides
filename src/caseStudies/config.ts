import type { SimulationStep } from '../types';

export type CaseStudyId = 'CS1' | 'CS2' | 'CS3' | 'CS4';

export interface WorkflowCopy {
  paneTitle: string;
  detectTitle: string;
  detectSub: string;
  enrichTitle: string;
  enrichSub: string;
  callTitle: string;
  callSub: string;
  rcaTitle: string;
  rcaSub: string;
  recommendationTitle: string;
  recommendationSub: string;
  decisionLine1: string;
  decisionLine2: string;
  actionTitle: string;
  actionSub: string;
  validateTitle: string;
  validateSub: string;
  endTitle: string;
  endSub: string;
  escalateTitle: string;
  escalateSub: string;
  escalateDetail: string;
}

export interface NarrativeCopy {
  idle: string;
  detect: string;
  enrich: string;
  rca: string;
  recommend: string;
  actClosedLoop: string;
  actOpenLoop: string;
  validate: string;
  escalate: string;
}

export interface CaseStudyConfig {
  id: CaseStudyId;
  tabLabel: string;
  headerTitle: string;
  narrativeTitle: string;
  narrative: NarrativeCopy;
  workflow: WorkflowCopy;
}

export const CASE_STUDIES: Record<CaseStudyId, CaseStudyConfig> = {
  CS1: {
    id: 'CS1',
    tabLabel: 'CS1: ADR',
    headerTitle: 'Case Study 1: Anomaly Detection & Resolution rApp',
    narrativeTitle: 'Case Study Narrative',
    narrative: {
      idle: 'The network is stable and the demo is monitoring service quality in real time.',
      detect: 'A service anomaly was detected and investigation has started.',
      enrich: 'The enrichment rApp is adding UE, slice, and topology context.',
      rca: 'VISMON AI is running RCA to identify the most likely root cause.',
      recommend: 'A recovery recommendation is ready for operations.',
      actClosedLoop: 'The platform is applying the recommended recovery action automatically.',
      actOpenLoop: 'The engineer approved the recommendation and recovery is being applied.',
      validate: 'The system is validating KPI recovery after the action.',
      escalate: 'The issue was escalated for guided engineer intervention.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'Anomaly Detector rApp',
      detectSub: 'continuously senses resource usage',
      enrichTitle: 'rApp Enrichment',
      enrichSub: 'adds network + UE context',
      callTitle: 'Call VISMON AI',
      callSub: 'REST/gRPC northbound API',
      rcaTitle: 'VISMON RCA Engine',
      rcaSub: 'cross-domain analysis + guidance',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'returned to anomaly detector rApp',
      decisionLine1: 'open loop /',
      decisionLine2: 'NOC decision?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'applies policy/config changes',
      validateTitle: 'Validation',
      validateSub: 'checks KPI improvement on DU/CU',
      endTitle: 'Closed-loop stabilized',
      endSub: 'Monitoring resumes',
      escalateTitle: 'VISMON AI',
      escalateSub: 'Prompt',
      escalateDetail: 'NOC interaction',
    },
  },
  CS2: {
    id: 'CS2',
    tabLabel: 'CS2: Network Assurance',
    headerTitle: 'Case Study 2: Network Assurance rApp',
    narrativeTitle: 'Case Study Narrative',
    narrative: {
      idle: 'Network Assurance rApp is tracking critical service quality and waiting for anomalies.',
      detect: 'A throughput degradation was detected for a high-priority user.',
      enrich: 'Additional UE and network context is being collected for diagnosis.',
      rca: 'VISMON AI is analyzing topology and historical behavior for RCA.',
      recommend: 'A corrective assurance recommendation is ready.',
      actClosedLoop: 'Network Operations is executing the selected assurance action.',
      actOpenLoop: 'NOC approved the recommendation and execution has started.',
      validate: 'Service restoration for the critical user is being validated.',
      escalate: 'The assurance case was escalated with guided next actions.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'Network Anomaly Detector',
      detectSub: 'senses throughput degradation',
      enrichTitle: 'Assurance Enrichment',
      enrichSub: 'collects network + UE metrics',
      callTitle: 'Call VISMON AI',
      callSub: 'submit enriched assurance payload',
      rcaTitle: 'VISMON AI RCA',
      rcaSub: 'root-cause + action recommendation',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'best assurance action proposed',
      decisionLine1: 'apply assurance',
      decisionLine2: 'action now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'applies selected corrective action',
      validateTitle: 'Validation',
      validateSub: 'confirm critical service recovery',
      endTitle: 'Assurance stabilized',
      endSub: 'continuous monitoring',
      escalateTitle: 'NOC',
      escalateSub: 'Escalation',
      escalateDetail: 'guided intervention',
    },
  },
  CS3: {
    id: 'CS3',
    tabLabel: 'CS3: PCI Clash',
    headerTitle: 'Case Study 3: PCI Clash rApp',
    narrativeTitle: 'Case Study Narrative',
    narrative: {
      idle: 'PCI Clash rApp is monitoring neighbor relations and PCI plans.',
      detect: 'A PCI clash condition was detected in the active cell cluster.',
      enrich: 'Cell and neighbor topology context is being enriched.',
      rca: 'VISMON AI is calculating the most suitable replacement PCI.',
      recommend: 'A PCI reassignment plan is ready for execution.',
      actClosedLoop: 'Network Operations is executing handover, PCI change, and restart steps.',
      actOpenLoop: 'The engineer approved the PCI plan and execution is in progress.',
      validate: 'Post-change checks are confirming clash clearance and stability.',
      escalate: 'The PCI conflict was escalated for manual optimization.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'PCI Clash Detector',
      detectSub: 'continuously senses PCI conflicts',
      enrichTitle: 'Topology Enrichment',
      enrichSub: 'adds cell + neighbor context',
      callTitle: 'Call VISMON AI',
      callSub: 'request optimal PCI candidate',
      rcaTitle: 'VISMON AI Optimizer',
      rcaSub: 'computes best replacement PCI',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'target PCI + execution plan',
      decisionLine1: 'apply new PCI',
      decisionLine2: 'to cell now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'handover users + apply PCI plan',
      validateTitle: 'Validation',
      validateSub: 'verify clash removal + KPI health',
      endTitle: 'PCI stabilized',
      endSub: 'continuous monitoring',
      escalateTitle: 'Manual PCI',
      escalateSub: 'Review',
      escalateDetail: 'engineer supervision',
    },
  },
  CS4: {
    id: 'CS4',
    tabLabel: 'CS4: Intelligent Energy',
    headerTitle: 'Case Study 4: Intelligent Energy rApp',
    narrativeTitle: 'Case Study Narrative',
    narrative: {
      idle: 'Intelligent Energy rApp is monitoring load to find safe energy-saving windows.',
      detect: 'Energy-saving criteria were met for candidate cells and RUs.',
      enrich: 'Traffic and QoE context is being prepared before action.',
      rca: 'VISMON Energy is evaluating power optimization against QoE impact.',
      recommend: 'An energy optimization recommendation is ready.',
      actClosedLoop: 'Network Operations is handing over users and locking selected RUs.',
      actOpenLoop: 'The engineer approved the energy plan and execution is running.',
      validate: 'Power savings are being validated while guarding user experience.',
      escalate: 'The energy optimization case was escalated for manual review.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'Energy Saving Detector',
      detectSub: 'monitors traffic and PRB load',
      enrichTitle: 'Candidate Analysis',
      enrichSub: 'identifies switch-off opportunities',
      callTitle: 'Call VISMON Energy',
      callSub: 'request QoE-safe action plan',
      rcaTitle: 'VISMON Energy AI',
      rcaSub: 'power vs QoE impact evaluation',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'energy action with guardrails',
      decisionLine1: 'apply energy',
      decisionLine2: 'action now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'handover users + lock selected RU',
      validateTitle: 'Validation',
      validateSub: 'confirm savings and QoE stability',
      endTitle: 'Energy policy stabilized',
      endSub: 'continuous monitoring',
      escalateTitle: 'Energy Plan',
      escalateSub: 'Escalation',
      escalateDetail: 'manual confirmation',
    },
  },
};

export function narrativeForStep(
  config: CaseStudyConfig,
  step: SimulationStep,
  closedLoop: boolean
): string {
  switch (step) {
    case 'IDLE':
      return config.narrative.idle;
    case 'DETECT':
      return config.narrative.detect;
    case 'ENRICH':
      return config.narrative.enrich;
    case 'RCA':
      return config.narrative.rca;
    case 'RECOMMEND':
      return config.narrative.recommend;
    case 'ACT':
      return closedLoop ? config.narrative.actClosedLoop : config.narrative.actOpenLoop;
    case 'VALIDATE':
      return config.narrative.validate;
    case 'ESCALATE':
      return config.narrative.escalate;
    default:
      return config.narrative.idle;
  }
}
