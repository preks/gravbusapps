/**
 * Human-readable labels for Flow Engine template tags.
 *
 * Tag keys are camelCase identifiers and tag values may contain catalog
 * references like "ServicePortalCategory:1:HR". This module provides
 * friendly names for both.
 */

interface TagKeyMeta {
  label: string
  description: string
  order: number
}

export const TAG_KEY_META: Record<string, TagKeyMeta> = {
  app: {
    label: 'Application',
    description: 'Which application or module these flows belong to.',
    order: 1
  },
  solution: {
    label: 'Solution',
    description: 'The business solution area (e.g. surveys, employee lifecycle).',
    order: 2
  },
  serviceCategory: {
    label: 'Service category',
    description: 'Department or category in the service portal.',
    order: 3
  },
  lifecycleType: {
    label: 'Lifecycle type',
    description: 'Type of employee lifecycle process.',
    order: 4
  },
  surveyType: {
    label: 'Survey type',
    description: 'Kind of survey or feedback form.',
    order: 5
  },
  process: {
    label: 'Process',
    description: 'Specific business process handled by this flow.',
    order: 6
  },
  module: {
    label: 'Module',
    description: 'Internal system module code.',
    order: 7
  }
}

const VALUE_LABELS: Record<string, string> = {
  'AppCatalog:1:SVC': 'Service Portal',
  'workforce-management': 'Workforce Management',

  'ServicePortalCategory:1:HR': 'Human Resources',
  'ServicePortalCategory:1:MGMT': 'Management',
  'ServicePortalCategory:1:IT': 'IT Services',
  'ServicePortalCategory:1:EVENTS': 'Events',
  'ServicePortalCategory:1:SALES': 'Sales',

  survey: 'Surveys',
  employeeLifecycle: 'Employee Lifecycle',

  training: 'Training',
  service: 'Service Request',
  recruiting: 'Recruiting',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',

  assessment: 'Assessment',
  poll: 'Poll',
  feedback: 'Feedback',

  'shift-swap-approval': 'Shift Swap Approval',
  'shift-claim-approval': 'Shift Claim Approval',
  'open-shift-claim-approval': 'Open Shift Claim Approval',

  wfm: 'Workforce Mgmt'
}

/**
 * Turns a raw tag value into a human-readable label.
 * Falls back to stripping catalog prefixes (e.g. "ServicePortalCategory:1:HR" → "HR")
 * and converting camelCase / kebab-case to Title Case.
 */
export function humanizeTagValue(_key: string, value: string): string {
  if (VALUE_LABELS[value]) return VALUE_LABELS[value]

  if (value.includes(':')) {
    const last = value.split(':').pop()!
    return VALUE_LABELS[last] ?? titleCase(last)
  }

  return titleCase(value)
}

function titleCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
