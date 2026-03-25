import type { FetchPaymentsOptions } from '../../../../hooks/useAdvancePayment'

export interface AdvancePaymentFilterState {
  statusFilter: string[]
  reporterFilter: string
  currencyRef: string
  departmentId: string
  dateFrom: string
  dateTo: string
  amountMinFilter: string
  amountMaxFilter: string
  advanceMinFilter: string
  advanceMaxFilter: string
}

interface BuildFetchOptionsParams {
  searchTerm: string
  page: number
  pageSize: number
  filters: AdvancePaymentFilterState
}

const isPresent = (value: string): boolean => value.trim() !== ''

export function hasActiveAdvancePaymentFilters(filters: AdvancePaymentFilterState): boolean {
  return (
    filters.statusFilter.length > 0 ||
    isPresent(filters.reporterFilter) ||
    isPresent(filters.amountMinFilter) ||
    isPresent(filters.amountMaxFilter) ||
    isPresent(filters.advanceMinFilter) ||
    isPresent(filters.advanceMaxFilter) ||
    isPresent(filters.currencyRef) ||
    isPresent(filters.departmentId) ||
    isPresent(filters.dateFrom) ||
    isPresent(filters.dateTo)
  )
}

export function buildSelectedAdvancePaymentFilters(filters: AdvancePaymentFilterState): string[] {
  return [
    ...filters.statusFilter,
    ...(isPresent(filters.reporterFilter) ? ['reporter'] : []),
    ...(isPresent(filters.currencyRef) ? ['currency'] : []),
    ...(isPresent(filters.departmentId) ? ['department'] : []),
    ...(isPresent(filters.dateFrom) || isPresent(filters.dateTo) ? ['dateRange'] : []),
    ...(isPresent(filters.amountMinFilter) || isPresent(filters.amountMaxFilter) ? ['amount'] : []),
    ...(isPresent(filters.advanceMinFilter) || isPresent(filters.advanceMaxFilter) ? ['advance'] : [])
  ]
}

export function buildAdvancePaymentFetchOptions({
  searchTerm,
  page,
  pageSize,
  filters
}: BuildFetchOptionsParams): FetchPaymentsOptions {
  return {
    searchTerm,
    page,
    pageSize,
    status: filters.statusFilter.length > 0 ? filters.statusFilter.join(',') : undefined,
    amountMin: filters.amountMinFilter,
    amountMax: filters.amountMaxFilter,
    advanceMin: filters.advanceMinFilter,
    advanceMax: filters.advanceMaxFilter,
    reporter: filters.reporterFilter,
    currencyRef: isPresent(filters.currencyRef) ? filters.currencyRef : undefined,
    departmentId: isPresent(filters.departmentId) ? filters.departmentId : undefined,
    dateFrom: isPresent(filters.dateFrom) ? filters.dateFrom : undefined,
    dateTo: isPresent(filters.dateTo) ? filters.dateTo : undefined
  }
}
