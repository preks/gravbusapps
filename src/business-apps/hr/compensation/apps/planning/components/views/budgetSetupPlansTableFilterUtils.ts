export function budgetMatchesRange(
  value: number | null | undefined,
  range: { min?: number | null; max?: number | null } | null
): boolean {
  if (!range) {
    return true
  }
  const hasMin = range.min != null && !Number.isNaN(range.min)
  const hasMax = range.max != null && !Number.isNaN(range.max)
  if (!hasMin && !hasMax) {
    return true
  }
  const v = value ?? 0
  if (hasMin && v < range.min!) {
    return false
  }
  if (hasMax && v > range.max!) {
    return false
  }
  return true
}

export function applyNumberRangeFromFilters(
  amt: { min?: number | null; max?: number | null } | undefined,
  setRange: (range: { min?: number | null; max?: number | null } | null) => void
): void {
  if (amt && (amt.min !== undefined || amt.max !== undefined)) {
    setRange({ min: amt.min, max: amt.max })
  } else {
    setRange(null)
  }
}
