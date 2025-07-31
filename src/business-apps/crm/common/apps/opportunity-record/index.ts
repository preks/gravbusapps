import { OpportunityRecord } from './OpportunityRecord';

export { OpportunityRecord };
export { WorkflowsStatusModal } from './components/WorkflowsStatusModal';
export { WorkflowStatusItem } from './components/WorkflowStatusItem';
export { StageTransitionWorkflowCard } from './components/StageTransitionWorkflowCard';
export { WorkflowStatusService } from './services/WorkflowStatusService';
export { useWorkflowStatus } from './hooks/useWorkflowStatus';
export * from './types/stageTransition';
export * from './config/stageTransitionConditions';
export default OpportunityRecord; 