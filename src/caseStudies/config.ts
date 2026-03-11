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
    tabLabel: 'UC1: Anomaly & RCA',
    headerTitle: 'Use Case 1: Anomaly Detection & Root Cause Analysis rApp',
    narrativeTitle: 'Use Case Narrative',
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
    tabLabel: 'UC2: Network Assurance',
    headerTitle: 'Use Case 2: Network Assurance rApp',
    narrativeTitle: 'Use Case Narrative',
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
    tabLabel: 'UC3: NW Integrity',
    headerTitle: 'Use Case 3: Configuration and Integrity rApp',
    narrativeTitle: 'Use Case Narrative',
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
    tabLabel: 'UC4: Intelligent Energy',
    headerTitle: 'Use Case 4: Intelligent Energy rApp',
    narrativeTitle: 'Use Case Narrative',
    narrative: {
      idle: 'Intelligent Energy rApp monitoring Cell-B/C load and QoE. Waiting for traffic to drop below the energy-saving threshold.',
      detect: 'Cell-B/C traffic has fallen below the energy-saving threshold. Soft-handover eligibility for all connected and idle devices is being assessed.',
      enrich: 'UE mobility state, QoE metrics, Cell-A residual capacity, and coverage overlap are being collected to confirm a safe handover and standby transition.',
      rca: 'VISMON Energy AI is evaluating PRB headroom on Cell-A, coverage continuity, and QoE impact to confirm Cell-B/C can safely enter standby.',
      recommend: 'Soft-handover of all devices to Cell-A is confirmed safe. Recommendation: execute handover, place Cell-B/C RU into standby, activate sliding-window reactivation observer.',
      actClosedLoop: 'Network Operations rApp is executing soft-handover to Cell-A and placing Cell-B/C into standby. Sliding-window observer activated — Cell-B/C will reactivate automatically if Cell-A load, coverage risk, or QoE degradation is sustained across the observation window.',
      actOpenLoop: 'Engineer approved the energy plan. Soft-handover to Cell-A is executing and Cell-B/C RU is entering standby. Sliding-window observer activated for reactivation monitoring.',
      validate: 'Cell-B/C is in standby. The observer is tracking Cell-A load, QoE, and coverage. Cell-B/C will return online only once a reactivation condition — high load, coverage risk, or QoE degradation — is sustained across the full observation window.',
      escalate: 'Energy optimisation escalated for manual review. Standby transition or reactivation window conditions require engineer confirmation before proceeding.',
    },
    workflow: {
      paneTitle: 'Stage Flow Pane',
      detectTitle: 'Energy Saving Detector',
      detectSub: 'monitors PRB load, QoE + coverage',
      enrichTitle: 'Candidate Analysis',
      enrichSub: 'handover safety + Cell-A headroom check',
      callTitle: 'Call VISMON Energy',
      callSub: 'submit load, QoE + coverage context',
      rcaTitle: 'VISMON Energy AI',
      rcaSub: 'confirms standby safety + reactivation rules',
      recommendationTitle: 'Recommendation',
      recommendationSub: 'soft-HO to Cell-A + Cell-B/C standby',
      decisionLine1: 'apply energy',
      decisionLine2: 'action now?',
      actionTitle: 'Network Operations rApp',
      actionSub: 'soft-HO devices + lock Cell-B/C to standby',
      validateTitle: 'Sliding-Window Observer',
      validateSub: 'reactivates Cell-B/C on load / coverage / QoE trigger',
      endTitle: 'Energy policy stabilized',
      endSub: 'Cell-B/C in standby; observer active',
      escalateTitle: 'Energy Plan',
      escalateSub: 'Escalation',
      escalateDetail: 'engineer confirmation required',
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
