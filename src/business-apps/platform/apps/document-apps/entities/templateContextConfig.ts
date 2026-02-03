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
  { key: 'candidate', displayName: 'Candidate' },
  { key: 'employee', displayName: 'Employee' }
]

/**
 * Entity keys shown in the side panel per context.
 * Keys must exist in TEMPLATE_ENTITY_REGISTRY. Order = display order.
 * When backend is ready, replace with: fetch entity keys for context from API.
 */
export const ENTITY_KEYS_BY_CONTEXT: Record<string, string[]> = {
  candidate: [
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
  employee: ['job_candidate', 'employee', 'company', 'employment_type', 'contract_type', 'company_address']
}

/** Get display name for a context key, or the key itself if unknown */
export function getTemplateContextDisplayName(contextKey: string): string {
  const found = TEMPLATE_CONTEXTS.find(c => c.key === contextKey)
  return found?.displayName ?? contextKey
}

/**
 * Map template category (chosen in create modal) to entity context.
 * Used when editing a template: the side panel loads entities for this context.
 * Category is not shown as "context" in the UI; context is derived from category.
 */
const CONTEXT_BY_CATEGORY: Record<string, string> = {
  contracts: 'candidate',
  agreements: 'candidate',
  letters: 'employee',
  reports: 'candidate',
  proposals: 'candidate',
  policies: 'candidate',
  procedures: 'candidate',
  forms: 'employee',
  other: 'candidate'
}

const DEFAULT_CONTEXT = 'candidate'

/** Get entity context key for a template category (e.g. for "Insert field" panel when editing). */
export function getContextForCategory(category: string): string {
  return CONTEXT_BY_CATEGORY[category] ?? DEFAULT_CONTEXT
}
