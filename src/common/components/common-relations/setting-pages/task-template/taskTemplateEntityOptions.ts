import type { EnumOption } from './types'

/** CRM (sales) entity types for task template scope & event triggers */
export const CRM_TASK_TEMPLATE_ENTITY_OPTIONS: EnumOption[] = [
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'OPPORTUNITY', label: 'Opportunity' }
]

/** IRM entity types (includes investment) */
export const IRM_TASK_TEMPLATE_ENTITY_OPTIONS: EnumOption[] = [
  ...CRM_TASK_TEMPLATE_ENTITY_OPTIONS,
  { value: 'INVESTMENT', label: 'Investment' }
]
