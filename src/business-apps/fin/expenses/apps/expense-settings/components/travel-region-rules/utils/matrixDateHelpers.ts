import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { EditableCell, EditableAllowanceRegionRule } from '../types'

dayjs.extend(utc)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

// Default far future date for "no end date" (∞)
export const FAR_FUTURE_DATE = '9999-12-31T00:00:00+00:00'

/**
 * Normalize date: ensure it's in ISO format with time component
 * Handles various date formats from API (ISO with/without time, YYYY-MM-DD, etc.)
 */
export const normalizeDate = (date: string | null | undefined): string | null => {
  if (!date || (typeof date === 'string' && date.trim() === '')) return null

  // If date is already in ISO format with time, ensure timezone
  if (typeof date === 'string' && date.includes('T')) {
    if (!date.includes('+') && !date.includes('Z') && !date.includes('-', 10)) {
      return date.endsWith('Z') ? date : `${date}+00:00`
    }
    return date
  }

  // If date is just YYYY-MM-DD, add time component
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date}T00:00:00+00:00`
  }

  // Try to parse any other format and convert to ISO
  try {
    const parsed = dayjs(date)
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD') + 'T00:00:00+00:00'
    }
  } catch (e) {
    console.warn(`[normalizeDate] Failed to parse date: ${date}`, e)
  }

  return null
}

/**
 * Ensure date string has T and timezone
 */
export const ensureISOFormat = (dateStr: string): string => {
  return dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00+00:00`
}

/**
 * Sort cells by activeFrom date (oldest first)
 */
export const sortCellsByActiveFrom = (cells: EditableCell[]): EditableCell[] => {
  return [...cells].sort((a, b) => {
    if (!a.activeFrom && !b.activeFrom) return 0
    if (!a.activeFrom) return 1
    if (!b.activeFrom) return -1
    return dayjs(a.activeFrom).valueOf() - dayjs(b.activeFrom).valueOf()
  })
}

/**
 * Sort new cells by creation order (validityPeriodId timestamp), then by activeFrom
 * This matches the original behavior for new cells
 */
export const sortNewCellsByCreationOrder = (cells: EditableCell[]): EditableCell[] => {
  return [...cells].sort((a, b) => {
    // First sort by validityPeriodId timestamp (creation order)
    const aTimestamp = a.validityPeriodId ? Number.parseInt(a.validityPeriodId.split('-').pop() || '0', 10) : 0
    const bTimestamp = b.validityPeriodId ? Number.parseInt(b.validityPeriodId.split('-').pop() || '0', 10) : 0
    if (aTimestamp !== bTimestamp) return aTimestamp - bTimestamp

    // Then by activeFrom date
    if (!a.activeFrom && !b.activeFrom) return 0
    if (!a.activeFrom) return 1
    if (!b.activeFrom) return -1
    return dayjs(a.activeFrom).valueOf() - dayjs(b.activeFrom).valueOf()
  })
}

/**
 * Get dates from the first (oldest) cell
 */
const getDatesFromFirstCell = (
  sortedCells: EditableCell[]
): { activeFrom: string; activeTo: string | undefined } | null => {
  if (sortedCells.length === 0) return null

  const firstCell = sortedCells[0]
  const normalizedFrom = normalizeDate(firstCell.activeFrom)
  const normalizedTo = normalizeDate(firstCell.activeTo)

  if (normalizedFrom) {
    return {
      activeFrom: normalizedFrom,
      activeTo: normalizedTo || FAR_FUTURE_DATE
    }
  }

  // Fallback: use raw date if normalization failed
  if (firstCell.activeFrom) {
    return {
      activeFrom: ensureISOFormat(firstCell.activeFrom),
      activeTo: firstCell.activeTo ? ensureISOFormat(firstCell.activeTo) : FAR_FUTURE_DATE
    }
  }

  return null
}

/**
 * Get dates from rule
 */
const getDatesFromRule = (
  rule: EditableAllowanceRegionRule
): { activeFrom: string; activeTo: string | undefined } | null => {
  const normalizedFrom = normalizeDate(rule.activeFrom)
  const normalizedTo = normalizeDate(rule.activeTo)

  if (normalizedFrom) {
    return {
      activeFrom: normalizedFrom,
      activeTo: normalizedTo || FAR_FUTURE_DATE
    }
  }

  return null
}

/**
 * Determine default dates for a new cell.
 * Uses the FIRST detail entered for this rule/region combination.
 * NO FALLBACKS - must use actual dates from existing details or rule.
 */
export const getDefaultCellDates = (
  existingCells: EditableCell[],
  rule: EditableAllowanceRegionRule
): { activeFrom: string; activeTo: string | undefined } => {
  // Try to get dates from existing cells first
  if (existingCells.length > 0) {
    const sortedCells = sortCellsByActiveFrom(existingCells)
    const cellDates = getDatesFromFirstCell(sortedCells)
    if (cellDates) return cellDates
  }

  // Fallback to rule dates
  const ruleDates = getDatesFromRule(rule)
  if (ruleDates) return ruleDates

  // Last resort - should never happen if rule is valid
  console.error('Warning: Cannot determine default dates from existing details or rule. Using far future dates.')
  return {
    activeFrom: FAR_FUTURE_DATE,
    activeTo: FAR_FUTURE_DATE
  }
}

/**
 * Find a detail valid today from a list of date ranges
 */
export const findDetailValidToday = (
  details: Array<{ activeFrom?: string; activeTo?: string }>
): { activeFrom: string; activeTo?: string } | undefined => {
  const today = dayjs().startOf('day')

  return details.find(detail => {
    if (!detail.activeFrom) return false
    const from = dayjs(detail.activeFrom).startOf('day')
    const to = detail.activeTo ? dayjs(detail.activeTo).endOf('day') : null

    const isTodayAfterFrom = today.isSameOrAfter(from, 'day')
    const isTodayBeforeTo = !to || today.isSameOrBefore(to, 'day')

    return isTodayAfterFrom && isTodayBeforeTo
  }) as { activeFrom: string; activeTo?: string } | undefined
}

/**
 * Get today's date as ISO string
 */
export const getTodayISO = (): string => {
  return dayjs.utc().startOf('day').toISOString()
}

/**
 * Collect all date ranges from other regions (for finding dates valid today)
 */
export const collectOtherRegionDateRanges = (
  allowanceRegionRules: EditableAllowanceRegionRule[],
  editableCells: EditableCell[],
  excludeRegionId: string
): Array<{ activeFrom: string; activeTo?: string }> => {
  // Get details from rules for other regions
  const detailsFromRules: Array<{ activeFrom?: string; activeTo?: string }> = []
  allowanceRegionRules.forEach(r => {
    const otherRegionsDetails = (r.details || []).filter((detail: any) => detail.travelRegion?.id !== excludeRegionId)
    detailsFromRules.push(...otherRegionsDetails.map((d: any) => ({ activeFrom: d.activeFrom, activeTo: d.activeTo })))
  })

  // Get saved cells from other regions
  const cellsFromOtherRegions = editableCells
    .filter(c => c.travelRegionId !== excludeRegionId && !c.isNew)
    .map(c => ({ activeFrom: c.activeFrom, activeTo: c.activeTo }))

  return detailsFromRules.length > 0 ? detailsFromRules : cellsFromOtherRegions
}

/**
 * Determine dates for a new cell based on priority rules:
 * 1. Use dates from existing new (unsaved) cells for this rule
 * 2. Check other regions for details valid today
 * 3. Use today's date if nothing else available
 */
export const determineDatesForNewCell = (
  ruleId: string,
  regionId: string,
  editableCells: EditableCell[],
  allowanceRegionRules: EditableAllowanceRegionRule[],
  rule: EditableAllowanceRegionRule
): { activeFrom: string; activeTo: string | undefined } => {
  // PRIORITY 1: Use dates from existing new (unsaved) cells for this rule
  // Sort by creation order (validityPeriodId timestamp) then by activeFrom - matches original behavior
  const newCellsForRule = editableCells.filter(c => c.isNew && c.allowanceRegionRuleId === ruleId)

  if (newCellsForRule.length > 0) {
    const sortedNewCells = sortNewCellsByCreationOrder(newCellsForRule)
    return getDefaultCellDates(sortedNewCells, rule)
  }

  // PRIORITY 2: Check other regions for details valid today
  const otherRegionRanges = collectOtherRegionDateRanges(allowanceRegionRules, editableCells, regionId)

  if (otherRegionRanges.length > 0) {
    const detailValidToday = findDetailValidToday(otherRegionRanges)

    if (detailValidToday) {
      const normalizedFrom = normalizeDate(detailValidToday.activeFrom)
      const normalizedTo = detailValidToday.activeTo ? normalizeDate(detailValidToday.activeTo) : undefined

      if (normalizedFrom) {
        return { activeFrom: normalizedFrom, activeTo: normalizedTo }
      }
      // Fallback if normalization fails
      return { activeFrom: detailValidToday.activeFrom, activeTo: detailValidToday.activeTo }
    }
  }

  // PRIORITY 3: Use today's date
  return { activeFrom: getTodayISO(), activeTo: undefined }
}
