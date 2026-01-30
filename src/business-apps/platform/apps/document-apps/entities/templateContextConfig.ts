/**
 * Template context config (hardcoded until backend provides it).
 *
 * Single place to add new contexts and define which entities appear in the
 * "Insert field" panel for each context. When the backend is ready, replace
 * this with an API that returns the same shape:
 * - templateContexts: { key, displayName }[]
 * - entityKeysByContext: Record<contextKey, entityKey[]>
 */

export interface TemplateContextOption {
  key: string
  displayName: string
}

/**
 * All template contexts and their display names.
 * Add a new row here when you add a new scenario (e.g. letter proposal).
 */
export const TEMPLATE_CONTEXTS: TemplateContextOption[] = [
  { key: 'recruitManager', displayName: 'Recruitment' },
  { key: 'onboarding', displayName: 'Onboarding' }
  // Example for future: { key: 'letter_proposal', displayName: 'Letter proposal' },
]

/**
 * Entity keys shown in the side panel per context.
 * Keys must exist in TEMPLATE_ENTITY_REGISTRY. Order = display order.
 * When backend is ready, replace with: fetch entity keys for context from API.
 */
export const ENTITY_KEYS_BY_CONTEXT: Record<string, string[]> = {
  recruitManager: [
    'job_candidate',
    'job_application',
    'job_request',
    'job_position',
    'job_posting',
    'employee',
    'employee_address',
    'employee_position',
    'company',
    'company_address',
    'contract_type',
    'employment_type'
  ],
  onboarding: ['company', 'company_address']
  // Example for future letter_proposal (add entities to registry first):
  // letter_proposal: ['employee', 'company', 'salary'],
}

/** Get display name for a context key, or the key itself if unknown */
export function getTemplateContextDisplayName(contextKey: string): string {
  const found = TEMPLATE_CONTEXTS.find(c => c.key === contextKey)
  return found?.displayName ?? contextKey
}
