/**
 * Common Task Constants
 * Enums and constants shared across Customer and Investment task types
 */

/**
 * Task Timing Enum
 * Represents when a task should be executed
 */
export enum TaskTiming {
  UNKNOWN = 'UNKNOWN_TIMING_TYPE',
  DEADLINE = 'DEADLINE',
  SCHEDULED = 'SCHEDULED'
}

/**
 * Task Priority Enum
 * Defines task priority levels
 */
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Task Status Enum
 * Defines task status values
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

/**
 * Task Assignee Type Enum
 * Defines who should be assigned to a task from a template
 */
export enum TaskAssigneeType {
  OWNER = 'OWNER',
  SPECIFIC_EMPLOYEE = 'SPECIFIC_EMPLOYEE',
  ROLE = 'ROLE'
}

/**
 * Task Holiday Policy Enum
 * Defines how tasks should be scheduled around holidays
 */
export enum TaskHolidayPolicy {
  SKIP = 'SKIP',
  MOVE_BEFORE = 'MOVE_BEFORE',
  MOVE_AFTER = 'MOVE_AFTER',
  IGNORE = 'IGNORE'
}
