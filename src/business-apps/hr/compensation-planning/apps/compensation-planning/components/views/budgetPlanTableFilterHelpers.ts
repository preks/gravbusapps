import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'

export function sliceBudgetPlanDateKey(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const s = String(value).trim()
  if (s === '') {
    return null
  }
  return s.length >= 10 ? s.slice(0, 10) : s
}

/**
 * Inclusive overlap: plan [start,end] vs filter [from,to]. Partial filter bounds supported.
 * Plans with no start/end cannot match when any filter bound is set.
 */
export function planPeriodOverlapsFilter(
  row: CompensationBudgetPlanRow,
  filterFrom: string | null,
  filterTo: string | null
): boolean {
  if (filterFrom == null && filterTo == null) {
    return true
  }
  const ps = sliceBudgetPlanDateKey(row.startDate)
  const pe = sliceBudgetPlanDateKey(row.endDate)
  if (ps == null && pe == null) {
    return false
  }
  const planStart = ps ?? pe
  const planEnd = pe ?? ps
  if (filterFrom != null && filterTo != null) {
    return planStart! <= filterTo && filterFrom <= planEnd!
  }
  if (filterFrom != null) {
    return planEnd! >= filterFrom
  }
  return planStart! <= filterTo!
}

/** Single-day effective date within inclusive filter bounds. */
export function effectiveDateMatchesFilter(
  row: CompensationBudgetPlanRow,
  filterFrom: string | null,
  filterTo: string | null
): boolean {
  return planDateFieldMatchesInclusiveRange(row, 'effectiveDate', filterFrom, filterTo)
}

/**
 * Inclusive range on a single `YYYY-MM-DD` date field (start, end, or effective).
 * Rows with a null date do not match when any filter bound is set.
 */
export function planDateFieldMatchesInclusiveRange(
  row: CompensationBudgetPlanRow,
  field: 'startDate' | 'endDate' | 'effectiveDate',
  filterFrom: string | null,
  filterTo: string | null
): boolean {
  if (filterFrom == null && filterTo == null) {
    return true
  }
  const d = sliceBudgetPlanDateKey(row[field])
  if (d == null) {
    return false
  }
  if (filterFrom != null && d < filterFrom) {
    return false
  }
  if (filterTo != null && d > filterTo) {
    return false
  }
  return true
}

function filterRangeBoundaryToDayKey(value: unknown): string | null {
  if (value == null || value === '') {
    return null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'string') {
    const s = value.trim()
    return s.length >= 10 ? s.slice(0, 10) : s || null
  }
  return null
}

export function parseDateRangeFilterValue(
  value: [unknown, unknown] | null | undefined
): { from: string | null; to: string | null } | null {
  if (value == null) {
    return null
  }
  const from = filterRangeBoundaryToDayKey(value[0])
  const to = filterRangeBoundaryToDayKey(value[1])
  if (from == null && to == null) {
    return null
  }
  return { from, to }
}

/** Inclusive bounds; either bound may be null (open-ended). */
export function fiscalYearMatchesFilterRange(
  fiscalYear: number,
  filterMin: number | null,
  filterMax: number | null
): boolean {
  if (filterMin == null && filterMax == null) {
    return true
  }
  if (filterMin != null && fiscalYear < filterMin) {
    return false
  }
  if (filterMax != null && fiscalYear > filterMax) {
    return false
  }
  return true
}

export function parseFiscalYearRangeFilterValue(
  value: { min?: number | null; max?: number | null } | undefined
): { min: number | null; max: number | null } | null {
  if (value == null) {
    return null
  }
  const rawMin = value.min
  const rawMax = value.max
  const min =
    rawMin !== undefined && rawMin !== null && !Number.isNaN(Number(rawMin)) ? Math.trunc(Number(rawMin)) : null
  const max =
    rawMax !== undefined && rawMax !== null && !Number.isNaN(Number(rawMax)) ? Math.trunc(Number(rawMax)) : null
  if (min == null && max == null) {
    return null
  }
  return { min, max }
}
