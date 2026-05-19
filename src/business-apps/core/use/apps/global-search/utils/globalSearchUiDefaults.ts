/**
 * Bootstrap values when the API does not return a configuration envelope (e.g. zero-query via GET /results).
 * Keep aligned with search-service GLOBAL_SEARCH_CONFIGURATION.
 */
export const GLOBAL_SEARCH_UI_DEFAULTS = {
  minQueryLength: 3,
  pageSize: 8,
  categorySelectionMode: 'MULTIPLE' as const,
  placeholder: 'Search in NEWWORK'
}
