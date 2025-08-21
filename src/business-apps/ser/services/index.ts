/**
 * Service Portal & Service Desk Services
 */

// Original Service Portal Mock Engine (for simple use cases)
export { MockWorkflowEngine, mockWorkflowEngine } from './MockWorkflowEngine';

// Enhanced Service Desk Engine & Provider (for advanced features)
export { MockWorkflowEngineAdapter } from './MockWorkflowEngineAdapter';
export {
  createMockEngine,
  getWorkflowEngine,
  setWorkflowEngine,
  resetWorkflowEngine,
  useWorkflowEngine,
  mockDataHelpers,
} from './workflowEngineProvider';

// New Conductor Integration
export { ConductorWorkflowEngineAdapter, createConductorWorkflowEngine } from './ConductorWorkflowEngineAdapter';

// Service Templates
export { employeeOnboardingServiceTemplate, getEmployeeOnboardingTemplate, employeeOnboardingTemplateMetadata } from './templates/employeeOnboardingTemplate';

// Re-export types for convenience
export type { WorkflowEngine } from 'packages/services-plus-core';
