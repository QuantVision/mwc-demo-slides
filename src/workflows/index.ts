export { anomalyRcaWorkflow } from './anomalyRca';
export { networkAssuranceWorkflow } from './networkAssurance';
export { pciClashWorkflow } from './pciClash';
export { intelligentEnergyWorkflow } from './intelligentEnergy';

import { anomalyRcaWorkflow } from './anomalyRca';
import { networkAssuranceWorkflow } from './networkAssurance';
import { pciClashWorkflow } from './pciClash';
import { intelligentEnergyWorkflow } from './intelligentEnergy';
import type { WorkflowDef, WorkflowId } from '../types';

export const WORKFLOWS: Record<WorkflowId, WorkflowDef> = {
  'anomaly-rca': anomalyRcaWorkflow,
  'network-assurance': networkAssuranceWorkflow,
  'pci-clash': pciClashWorkflow,
  'intelligent-energy': intelligentEnergyWorkflow,
};

export const WORKFLOW_ORDER: WorkflowId[] = [
  'anomaly-rca',
  'network-assurance',
  'pci-clash',
  'intelligent-energy',
];
