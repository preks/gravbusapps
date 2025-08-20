// Services+ Core Services
export { MockWorkflowEngineAdapter } from './MockWorkflowEngineAdapter';
export {
  createMockEngine,
  getWorkflowEngine,
  setWorkflowEngine,
  resetWorkflowEngine,
  useWorkflowEngine,
  mockDataHelpers,
} from './workflowEngineProvider';

// Re-export types for convenience
export type { WorkflowEngine } from 'packages/services-plus-core';
