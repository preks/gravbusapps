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

/** True when the design-system number-range filter has at least one bound set. */
export function isAmountRangeFilterActive(raw: unknown): boolean {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return false
  }
  const o = raw as { min?: number; max?: number }
  return o.min !== undefined || o.max !== undefined
}

/**
 * Compact bounds text for filter chips (e.g. `10 - 20`, `≥10`, `≤50`).
 * Empty string when `range` is null or has no min/max set.
 */
export function formatExpenseAmountRangeBoundsText(range: ExpenseAmountRangeValue): string {
  if (range == null || (range.min === undefined && range.max === undefined)) {
    return ''
  }
  const { min, max } = range
  if (min !== undefined && max !== undefined) {
    return `${min} - ${max}`
  }
  if (min !== undefined) {
    return `≥${min}`
  }
  if (max !== undefined) {
    return `≤${max}`
  }
  return ''
}

/**
 * Full chip label for `filterLabelMap`: `prefix` + bounds (e.g. `"Reimbursable Amount: "` + `"10 - 20"`).
 * `undefined` when the range has no active bounds.
 */
export function formatExpenseAmountRangeChipLabel(range: ExpenseAmountRangeValue, prefix: string): string | undefined {
  const bounds = formatExpenseAmountRangeBoundsText(range)
  if (!bounds) {
    return undefined
  }
  return `${prefix}${bounds}`
}

/** Appends Hasura-style numeric bounds for a top-level scalar field to a `_and` condition list. */
export function addScalarNumericRangeConditions(
  conditions: Record<string, unknown>[],
  amountRange: ExpenseAmountRangeValue,
  fieldName: string
): void {
  if (!amountRange) {
    return
  }
  const min = amountRange.min
  const max = amountRange.max
  if (min !== undefined && !Number.isNaN(min)) {
    conditions.push({ [fieldName]: { _gte: min } })
  }
  if (max !== undefined && !Number.isNaN(max)) {
    conditions.push({ [fieldName]: { _lte: max } })
  }
}

/**
 * Appends a single condition `{ [parentKey]: { [childKey]: { _gte?, _lte? } } }` when any bound is set.
 * Used for nested relations such as `expensePlan.advancePaymentTotalAmount`.
 */
export function addNestedScalarNumericRangeConditions(
  conditions: Record<string, unknown>[],
  amountRange: ExpenseAmountRangeValue,
  parentKey: string,
  childKey: string
): void {
  if (!amountRange) {
    return
  }
  const bounds: { _gte?: number; _lte?: number } = {}
  const min = amountRange.min
  const max = amountRange.max
  if (min !== undefined && !Number.isNaN(min)) {
    bounds._gte = min
  }
  if (max !== undefined && !Number.isNaN(max)) {
    bounds._lte = max
  }
  if (Object.keys(bounds).length === 0) {
    return
  }
  conditions.push({ [parentKey]: { [childKey]: bounds } })
}

/** Appends Hasura-style `totalAmount` bounds to a `_and` condition list. */
export function addTotalAmountRangeConditions(
  conditions: Record<string, unknown>[],
  amountRange: ExpenseAmountRangeValue
): void {
  addScalarNumericRangeConditions(conditions, amountRange, 'totalAmount')
}
