/**
 * Shared amount-range filter helpers for expense plans, requests, items, and future manager views.
 */

export type ExpenseAmountRangeValue = { min?: number; max?: number } | null

export function applyAmountRangeFromFilters(
  amt: { min?: number; max?: number } | undefined,
  setAmountRange: (range: ExpenseAmountRangeValue) => void
): void {
  if (amt && (amt.min !== undefined || amt.max !== undefined)) {
    setAmountRange({ min: amt.min, max: amt.max })
  } else {
    setAmountRange(null)
  }
}

/** Appends Hasura-style `totalAmount` bounds to a `_and` condition list. */
export function addTotalAmountRangeConditions(
  conditions: Record<string, unknown>[],
  amountRange: ExpenseAmountRangeValue
): void {
  if (!amountRange) {
    return
  }
  const min = amountRange.min
  const max = amountRange.max
  if (min !== undefined && !Number.isNaN(min)) {
    conditions.push({ totalAmount: { _gte: min } })
  }
  if (max !== undefined && !Number.isNaN(max)) {
    conditions.push({ totalAmount: { _lte: max } })
  }
}
