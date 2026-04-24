import type { FunctionCategory } from '@/common/network/functions/FunctionsServiceClient'

/**
 * Suggested free-text subcategories offered via <datalist> in the editor for each
 * top-level category. These are hints only — the backend stores whatever free text
 * the author commits (see `functions-service` `subcategory` column).
 */
export const CATEGORY_SUBCATEGORY_SUGGESTIONS: Record<FunctionCategory, string[]> = {
  General: ['web-search', 'rag', 'data-extraction', 'parser'],
  HR: ['employees', 'time-off', 'calendar', 'reminders', 'recruiting'],
  CRM: ['accounts', 'contacts', 'leads', 'opportunities', 'products'],
  Expenses: ['expenses', 'insights', 'approvals'],
  Office: ['documents', 'spreadsheets', 'slides', 'mail', 'search', 'analytics', 'navigation'],
  Service: ['flows', 'workflows', 'scheduled-tasks'],
  Custom: []
}

export function getSubcategorySuggestions(category: FunctionCategory): string[] {
  return CATEGORY_SUBCATEGORY_SUGGESTIONS[category] || []
}
