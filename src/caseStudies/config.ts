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
      detect: 'UE2 and CPE moved into Cell A and UE1 throughput degraded under PRB contention.',
      enrich: 'Additional UE, cell-load, and capacity context is being collected for diagnosis.',
      rca: 'VISMON AI is analyzing topology and historical behavior for RCA.',
      recommend: 'VISMON AI recommends handing over UE1 to adjacent Cell B with more capacity.',
      actClosedLoop: 'Network Operations is executing UE1 handover from Cell A to Cell B.',
      actOpenLoop: 'NOC approved UE1 handover to Cell B and execution has started.',
      validate: 'Service restoration for UE1 on Cell B is being validated.',
      escalate: 'The assurance case was escalated with guided next actions.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'Network Anomaly Detector',
      detectSub: 'detects UE1 service degradation',
      enrichTitle: 'Assurance Enrichment',
      enrichSub: 'collects load + UE context',
      callTitle: 'Call VISMON AI',
      callSub: 'submit enriched assurance payload',
      rcaTitle: 'VISMON AI RCA',
      rcaSub: 'root-cause + handover proposal',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'move UE1 to Cell B',
      decisionLine1: 'apply assurance',
      decisionLine2: 'action now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'executes UE1 handover to Cell B',
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
      idle: 'Both cells start with a PCI clash and low SINR; all devices are impacted by interference.',
      detect: 'rApp detected PCI clash indicators from SINR and performance degradation.',
      enrich: 'Cell PCI map, SINR trends, and neighbor metrics were enriched for VISMON AI.',
      rca: 'VISMON AI confirmed PCI clash and computed the best replacement PCI.',
      recommend: 'A PCI reassignment plan is ready: soft-handover, lock RU, change PCI, reboot.',
      actClosedLoop: 'Network Operations executed soft-handover, RU lock, PCI change, and reboot.',
      actOpenLoop: 'Engineer approved PCI reassignment; execution is now in progress.',
      validate: 'Validation confirms SINR recovery and throughput normalization after PCI update.',
      escalate: 'The PCI conflict was escalated for manual optimization.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'PCI Clash Detector',
      detectSub: 'senses PCI + SINR conflicts',
      enrichTitle: 'Topology Enrichment',
      enrichSub: 'adds PCI map + SINR context',
      callTitle: 'Call VISMON AI',
      callSub: 'request optimal PCI candidate',
      rcaTitle: 'VISMON AI Optimizer',
      rcaSub: 'computes best replacement PCI',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'soft-HO + lock + change + reboot',
      decisionLine1: 'apply new PCI',
      decisionLine2: 'to cell now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'soft-HO, reconfigure PCI, reboot RU',
      validateTitle: 'Validation',
      validateSub: 'verify SINR and KPI recovery',
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
