/**
 * Common Task Constants
 *
 * Shared constants and enums for tasks across Customer and Investment relations
 */

/**
 * Task Priority Types
 * Matches catalog entries in InvestmentTaskPriority and SalesTaskPriority
 */
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Task Status Types
 * Matches catalog entries in InvestmentTaskStatus and SalesTaskStatus
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

/**
 * Task Timing Types
 */
export enum TaskTimingType {
  DEADLINE = 'DEADLINE',
  SCHEDULED = 'SCHEDULED',
  UNKNOWN = 'UNKNOWN_TIMING_TYPE'
}

/**
 * Task Reference Types
 * Shared reference types between Customer and Investment tasks
 */
export enum TaskReferenceType {
  LEAD = 'lead',
  ACCOUNT = 'account',
  CONTACT = 'contact',
  OPPORTUNITY = 'opportunity'
}
