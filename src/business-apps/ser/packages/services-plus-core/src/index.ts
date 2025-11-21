/**
 * Services+ Core Package
 * Provides core types and interfaces for Services+ platform
 */

export * from './types'

// Re-export key types for convenience
export type {
  WorkflowEngine,
  ServiceCategory,
  ServiceRequestTemplate,
  SubmittedRequest,
  RequestWithHistory,
  StepInstance,
  StepReceiver,
  StepStatus,
  TicketStatus,
  Comment,
  FlowComment,
  TaskAction,
  AvailableActions,
  TaskStatistics,
  ServicesAnalyticsEvent,
  AnalyticsPayload
} from './types'
