/**
 * Service Portal & Service Desk Services
 */

// Original Service Portal Mock Engine (for simple use cases - Service Portal only)
export { MockWorkflowEngine, mockWorkflowEngine } from './MockWorkflowEngine';

// Service Desk Workflow Engine Provider (live data only)
export {
  getWorkflowEngine,
  setWorkflowEngine,
  resetWorkflowEngine,
  setWorkflowEngineCurrentUser,
  useWorkflowEngine,
  mockDataHelpers,
} from './workflowEngineProvider';

// Conductor Integration (real live data)
export { ConductorWorkflowEngineAdapter, createConductorWorkflowEngine } from './ConductorWorkflowEngineAdapter';

// Shared Templates Service (used by both Service Desk and Service Portal)
export { TemplatesService, createTemplatesService, useSharedTemplates } from './templatesService';

// Service Templates
export { employeeOnboardingServiceTemplate, getEmployeeOnboardingTemplate, employeeOnboardingTemplateMetadata } from './templates/employeeOnboardingTemplate';

// Re-export types for convenience
export type { WorkflowEngine } from '../types';
