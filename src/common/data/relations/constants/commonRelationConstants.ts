/**
 * Common Relation Constants
 *
 * Shared constants and enums across all relation entities
 */

/**
 * Source Table
 * Indicates which entity type the record is associated with
 */
export enum SourceTable {
  LEAD = 'LEAD',
  ACCOUNT = 'ACCOUNT',
  CONTACT = 'CONTACT',
  OPPORTUNITY = 'OPPORTUNITY',
  INVESTMENT = 'INVESTMENT'
}

/**
 * Address Type
 * Indicates the type/purpose of an address
 */
export enum AddressType {
  PRIMARY = 'PRIMARY',
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  OFFICE = 'OFFICE',
  HOME = 'HOME',
  OTHER = 'OTHER'
}

/**
 * Task Assignee Type
 * Indicates how tasks should be assigned
 */
export enum TaskAssigneeType {
  OWNER = 'OWNER',
  CREATOR = 'CREATOR',
  SPECIFIC_USER = 'SPECIFIC_USER',
  ROLE = 'ROLE',
  TEAM = 'TEAM'
}

/**
 * Task Holiday Policy
 * Indicates how tasks should handle holidays
 */
export enum TaskHolidayPolicy {
  SKIP = 'SKIP',
  MOVE_FORWARD = 'MOVE_FORWARD',
  MOVE_BACKWARD = 'MOVE_BACKWARD',
  IGNORE = 'IGNORE'
}
