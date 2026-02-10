/**
 * Pure helpers for Plans tab filter chip / setFilter logic.
 * Single responsibility: classify and diff filter IDs; no UI or state.
 * Extracted for readability and testability (Step 10, PLANS-TAB-IMPROVEMENT-STEPS).
 */

/** Date-range filter keys used in chip IDs; export for "clear all" iteration. */
export const DATE_RANGE_FILTER_KEYS = ['effectiveDateRange', 'planDateRange', 'startDateRange', 'endDateRange'] as const

const DATE_RANGE_SET = new Set<string>(DATE_RANGE_FILTER_KEYS)

export const isCurrencyFilter = (f: string): boolean => f.startsWith('currency:')
export const isDateRangeFilter = (f: string): boolean => DATE_RANGE_SET.has(f)
export const isPlanTypeFilter = (f: string): boolean => f.startsWith('planType:')
export const isStatusFilter = (f: string): boolean =>
  !isCurrencyFilter(f) && !isDateRangeFilter(f) && !isPlanTypeFilter(f)

export interface SeparatedFilters {
  currency: string[]
  dateRange: string[]
  planType: string[]
  status: string[]
}

/** Split a filter list into currency, date-range, plan type, and status. */
export function separateFiltersByType(filters: string[]): SeparatedFilters {
  return {
    currency: filters.filter(isCurrencyFilter),
    dateRange: filters.filter(isDateRangeFilter),
    planType: filters.filter(isPlanTypeFilter),
    status: filters.filter(isStatusFilter)
  }
}

/** Filters that are in current but not in newFilters (to remove). */
export function getRemovedFilters(current: string[], newFilters: string[]): string[] {
  return current.filter(f => !newFilters.includes(f))
}

/** Diff of two filter lists: items to remove (in current only) and to add (in incoming only). */
export interface FilterAddRemove {
  toRemove: string[]
  toAdd: string[]
}

/** Compute toRemove/toAdd between current and incoming; use for status, plan type, or any filter list. */
export function computeFilterAddRemove(current: string[], incoming: string[]): FilterAddRemove {
  return {
    toRemove: current.filter(f => !incoming.includes(f)),
    toAdd: incoming.filter(f => !current.includes(f))
  }
}
