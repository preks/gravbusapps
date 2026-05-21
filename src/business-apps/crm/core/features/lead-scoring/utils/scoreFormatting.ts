import type { BulkLeadScoreResult, LeadScoreResult } from '../types/leadScoringTypes'

type BadgeVariant = 'success' | 'secondary' | 'warning' | 'destructive' | 'outline'

const PERCENT_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1
})

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
})

export function normalizeScoreToPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  return value <= 1 ? value * 100 : value
}

export function formatPercent(value: number | null | undefined): string {
  const percentValue = normalizeScoreToPercent(value)
  if (percentValue === null) {
    return 'N/A'
  }

  return `${PERCENT_FORMATTER.format(percentValue)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A'
  }

  return NUMBER_FORMATTER.format(value)
}

export function formatScoreValue(value: number | null | undefined): string {
  const normalized = normalizeScoreToPercent(value)
  if (normalized === null) {
    return 'N/A'
  }

  return NUMBER_FORMATTER.format(normalized)
}

export function formatTextValue(value: string | null | undefined): string {
  if (!value?.trim()) {
    return 'Not available'
  }

  return value
}

export function formatPrimitiveValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return NUMBER_FORMATTER.format(value)
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : 'N/A'
  }

  return JSON.stringify(value)
}

export function formatFieldName(field: string | null | undefined): string {
  if (!field?.trim()) {
    return 'Unknown field'
  }

  return field
    .split('_')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getGradeBadgeVariant(grade: string | null | undefined): BadgeVariant {
  const normalizedGrade = grade?.trim().toUpperCase()

  if (!normalizedGrade) {
    return 'outline'
  }

  if (normalizedGrade === 'A' || normalizedGrade === 'A+' || normalizedGrade === 'B' || normalizedGrade === 'HIGH') {
    return 'success'
  }

  if (normalizedGrade === 'C' || normalizedGrade === 'MEDIUM') {
    return 'warning'
  }

  if (normalizedGrade === 'D' || normalizedGrade === 'F' || normalizedGrade === 'LOW') {
    return 'destructive'
  }

  return 'secondary'
}

export function getAppliedCriterionLabel(
  criterion:
    | LeadScoreResult['applied_criteria'][number]
    | BulkLeadScoreResult['results'][number]['applied_criteria'][number]
): string {
  return criterion.field || criterion.criterion || criterion.reason || criterion.message || 'Applied criterion'
}

export function getIgnoredCriterionLabel(
  criterion:
    | LeadScoreResult['ignored_criteria'][number]
    | BulkLeadScoreResult['results'][number]['ignored_criteria'][number]
): string {
  return criterion.field || criterion.criterion || criterion.reason || criterion.message || 'Ignored criterion'
}

export function getBulkRequestedCount(result: BulkLeadScoreResult, fallbackRequestedCount: number): number {
  return result.requested_count ?? fallbackRequestedCount
}

export function getBulkScoredCount(result: BulkLeadScoreResult): number {
  return result.scored_count ?? result.results.length
}

export function getBulkMean(result: BulkLeadScoreResult): number | null {
  return result.statistics.mean ?? null
}

export function getBulkMedian(result: BulkLeadScoreResult): number | null {
  return result.statistics.median ?? null
}

export function getBulkStandardDeviation(result: BulkLeadScoreResult): number | null {
  return result.statistics.std_dev ?? result.statistics.std ?? null
}

export function getBulkCount(result: BulkLeadScoreResult): number {
  return result.statistics.count ?? result.results.length
}
