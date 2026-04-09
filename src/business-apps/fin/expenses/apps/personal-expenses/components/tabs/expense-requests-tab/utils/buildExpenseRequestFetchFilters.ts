import type { ExpenseRequestWhereClause } from './expenseRequestWhereClause.types'

/**
 * Same filter shape as the debounced list fetch: base `getFilters()` plus explicit currency scope
 * when the user picked a currency pill. Use for immediate refetches (sort/pagination/process completion)
 * so they stay consistent with the debounced effect.
 */
export function buildExpenseRequestFetchFilters(
  getFilters: () => ExpenseRequestWhereClause,
  explicitSelectedCurrencyRef: string | undefined
): ExpenseRequestWhereClause {
  const base = getFilters()
  if (!explicitSelectedCurrencyRef) {
    return base
  }
  const selectedCode = (explicitSelectedCurrencyRef.split(':').pop() || '').toUpperCase()
  base._and = base._and || []
  base._and.push({
    _or: [
      { currencyRef: { _eq: explicitSelectedCurrencyRef } },
      ...(selectedCode ? [{ code: { _ilike: selectedCode } }] : [])
    ]
  } as (typeof base._and)[number])
  return base
}
