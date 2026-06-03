// Investment-related enums based on nw_investment_relations.dbml schema
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export enum SourceTable {
  UNKNOWN_SOURCE = 'UNKNOWN_SOURCE',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
  CONTACT = 'CONTACT',
  LEAD = 'LEAD',
  ACTIVITY = 'ACTIVITY',
  TASK = 'TASK'
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

// =============================
// Translatable enum label mappers
// =============================

const humanizeEnumValue = (value: string): string => {
  if (!value) return ''
  const cleaned = value
    .toLowerCase()
    .split('_')
    .map(part => (part.length ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ')
  // Special-case common "UNKNOWN" patterns
  if (cleaned.startsWith('Unknown')) return 'Unknown'
  return cleaned
}

const buildEnumLabel = (namespace: string, value?: string | null): string => {
  if (!value) return 'Unknown'
  const defaultLabel = humanizeEnumValue(value)
  return getTranslationFromI18nKeyAndLabel(`crm.investment.enums.${namespace}.${value}`, defaultLabel)
}

export const getSourceTableLabel = (value?: SourceTable | null): string =>
  buildEnumLabel('sourceTable', value || undefined)

export const getAddressTypeLabel = (value?: AddressType | null): string =>
  buildEnumLabel('addressType', value || undefined)

export const getContactTypeLabel = (value?: ContactType | null): string =>
  buildEnumLabel('contactType', value || undefined)

export const getTaskTimingLabel = (value?: TaskTiming | null): string =>
  buildEnumLabel('taskTiming', value || undefined)

export const getTaskAssigneeTypeLabel = (value?: TaskAssigneeType | null): string =>
  buildEnumLabel('taskAssigneeType', value || undefined)

export const getTaskHolidayPolicyLabel = (value?: TaskHolidayPolicy | null): string =>
  buildEnumLabel('taskHolidayPolicy', value || undefined)

export const getReportScopeLabel = (value?: ReportScope | null): string =>
  buildEnumLabel('reportScope', value || undefined)
