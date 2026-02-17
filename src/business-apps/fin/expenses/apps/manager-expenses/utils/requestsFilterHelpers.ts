/**
 * Pure helpers for Expense Requests tab filter chip / setFilter logic.
 * Single responsibility: classify and diff filter IDs; no UI or state.
 * Step 8, REQUESTS-TAB-IMPROVEMENT-PLAN.
 */

import { isCurrencyFilter } from './plansFilterHelpers'
import { computeFilterAddRemove } from './plansFilterHelpers'

/** Date-range filter keys used in request filter chip IDs. */
export const REQUEST_DATE_RANGE_KEYS = [
  'effectiveDateRange',
  'requestDateRange',
  'startDateRange',
  'endDateRange'
] as const

const REQUEST_DATE_RANGE_SET = new Set<string>(REQUEST_DATE_RANGE_KEYS)

export { isCurrencyFilter }

export const isRequestTypeFilter = (f: string): boolean => f.startsWith('ExpenseRequestType:')
export const isRequestDateRangeFilter = (f: string): boolean => REQUEST_DATE_RANGE_SET.has(f)
export const isRequestStatusFilter = (f: string): boolean =>
  !isCurrencyFilter(f) && !isRequestTypeFilter(f) && !isRequestDateRangeFilter(f)

export interface SeparatedRequestFilters {
  currency: string[]
  dateRange: string[]
  status: string[]
  requestType: string[]
}

/** Split a filter list into currency, date-range, status, and request type. */
export function separateRequestFiltersByType(filters: string[]): SeparatedRequestFilters {
  return {
    currency: filters.filter(isCurrencyFilter),
    dateRange: filters.filter(isRequestDateRangeFilter),
    status: filters.filter(isRequestStatusFilter),
    requestType: filters.filter(isRequestTypeFilter)
  }
}

/** Apply status filter diff: remove then add via callbacks. */
export function applyStatusFilterDiff(
  currentSelectedFilters: string[],
  incomingStatusFilters: string[],
  removeFilter: (id: string) => void,
  addFilter: (id: string) => void
): void {
  const statusOnly = currentSelectedFilters.filter(isRequestStatusFilter)
  const { toRemove, toAdd } = computeFilterAddRemove(statusOnly, incomingStatusFilters)
  toRemove.forEach(removeFilter)
  toAdd.forEach(addFilter)
}

/** Apply request-type filter diff. */
export function applyRequestTypeFilterDiff(
  currentSelectedFilters: string[],
  incomingRequestTypeFilters: string[],
  removeFilter: (id: string) => void,
  addFilter: (id: string) => void
): void {
  const currentTypes = currentSelectedFilters.filter(isRequestTypeFilter)
  const { toRemove, toAdd } = computeFilterAddRemove(currentTypes, incomingRequestTypeFilters)
  toRemove.forEach(removeFilter)
  toAdd.forEach(addFilter)
}

/** Apply date-range filter diff: only removals (date ranges are cleared via removeFilter). */
export function applyDateRangeFilterDiff(
  currentSelectedFilters: string[],
  newFilters: string[],
  removeFilter: (id: string) => void
): void {
  const toRemove = currentSelectedFilters.filter(f => isRequestDateRangeFilter(f) && !newFilters.includes(f))
  toRemove.forEach(removeFilter)
}

/** Apply currency filter: single selection; add or remove to match incoming. */
export function applyCurrencyFilterDiff(
  incomingCurrencyFilters: string[],
  primaryCurrency: string | null,
  addFilter: (id: string) => void,
  removeFilter: (id: string) => void
): void {
  if (incomingCurrencyFilters.length > 0 && incomingCurrencyFilters[0] !== `currency:${primaryCurrency}`) {
    const newCurrencyCode = incomingCurrencyFilters[0].replace('currency:', '')
    addFilter(`currency:${newCurrencyCode}`)
  }
  if (incomingCurrencyFilters.length === 0 && primaryCurrency) {
    removeFilter(`currency:${primaryCurrency}`)
  }
}
