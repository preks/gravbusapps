// Customer-related enums based on CRM schema

/**
 * SourceTable Enum for Customer Relations
 * NOTE: SALES_ACTIVITY and SALES_TASK use incorrect prefixed naming
 * TODO: Standardize to ACTIVITY and TASK in future schema migration
 */
export enum SourceTable {
  UNKNOWN_SOURCE = 'UNKNOWN_SOURCE',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
  CONTACT = 'CONTACT',
  LEAD = 'LEAD',
  SALES_ACTIVITY = 'SALES_ACTIVITY', // NOTE: Should be ACTIVITY (incorrect naming in schema)
  SALES_TASK = 'SALES_TASK' // NOTE: Should be TASK (incorrect naming in schema)
}

export enum AddressType {
  UNKNOWN_ADDRESS = 'UNKNOWN_ADDRESS',
  PRIMARY_ADDRESS = 'PRIMARY_ADDRESS',
  SECONDARY_ADDRESS = 'SECONDARY_ADDRESS'
}

export enum ContactType {
  FOUNDER_CONTACT = 'FOUNDER_CONTACT',
  PRIMARY_CONTACT = 'PRIMARY_CONTACT',
  SECONDARY_CONTACT = 'SECONDARY_CONTACT'
}

export enum TaskTiming {
  UNKNOWN_TIMING_TYPE = 'UNKNOWN_TIMING_TYPE',
  DEADLINE = 'DEADLINE',
  SCHEDULED = 'SCHEDULED'
}

export enum TaskAssigneeType {
  UNKNOWN_TASK_ASSIGNEE_TYPE = 'UNKNOWN_TASK_ASSIGNEE_TYPE',
  OWNER_EMPLOYEE_TASK_ASSIGNEE = 'OWNER_EMPLOYEE_TASK_ASSIGNEE',
  CONTACT_TASK_ASSIGNEE = 'CONTACT_TASK_ASSIGNEE'
}

export enum TaskHolidayPolicy {
  UNKNOWN_TASK_HOLIDAY_POLICY = 'UNKNOWN_TASK_HOLIDAY_POLICY',
  HOLIDAY_POLICY_SKIP = 'HOLIDAY_POLICY_SKIP',
  HOLIDAY_POLICY_NEXT_DAY = 'HOLIDAY_POLICY_NEXT_DAY',
  HOLIDAY_POLICY_PREV_DAY = 'HOLIDAY_POLICY_PREV_DAY'
}

export enum ReportScope {
  UNKNOWN_REPORT_SCOPE = 'UNKNOWN_REPORT_SCOPE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

// Performance-related enums
export enum ActivityCategory {
  PROSPECTING = 'PROSPECTING',
  NURTURING = 'NURTURING',
  CLOSING = 'CLOSING',
  FOLLOW_UP = 'FOLLOW_UP'
}

export enum ActivityImpact {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum OutcomeType {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE'
}

export enum PerformancePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum PerformanceLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  AVERAGE = 'AVERAGE',
  POOR = 'POOR'
}

export enum PerformanceGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}
