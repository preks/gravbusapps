/**
 * Services+ Core Package
 * Provides core types and interfaces for Services+ platform
 */

export * from './types';

// Re-export key types for convenience
export type {
  WorkflowEngine,
  ServiceCategory,
  ServiceRequestTemplate,
  SubmittedRequest,
  StepInstance,
  StepReceiver,
  StepStatus,
  TicketStatus,
  ServicesAnalyticsEvent,
  AnalyticsPayload
} from './types';
