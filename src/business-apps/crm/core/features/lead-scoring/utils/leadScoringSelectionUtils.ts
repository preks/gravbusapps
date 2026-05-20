import type { LeadScoringCandidateQuery } from '../hooks/useLeadScoringCandidates'

export type LeadScoringTimeRange = 'today' | 'last-week' | 'last-month' | 'last-quarter' | 'last-year'

export type LeadScoringPresetScope = 'all' | 'latest' | 'time'

export type LeadScoringSelectionPreset = {
  scope: LeadScoringPresetScope
  latestCount?: number
  timeRange?: LeadScoringTimeRange
  unscoredOnly: boolean
  search?: string
}

export function getLatestPresetSelectValue(
  presetScope: LeadScoringPresetScope | null,
  latestCount: number | null,
  allLeadsPreset: string
): string {
  if (presetScope === 'all' && !latestCount) {
    return allLeadsPreset
  }

  if (latestCount) {
    return String(latestCount)
  }

  return ''
}

export function getTimeRangePresetSelectValue(
  presetScope: LeadScoringPresetScope | null,
  timeRange: LeadScoringTimeRange | null,
  allLeadsPreset: string
): string {
  if (presetScope === 'all' && !timeRange) {
    return allLeadsPreset
  }

  return timeRange ?? ''
}

export const LATEST_COUNT_OPTIONS = [100, 200, 500, 1000] as const
export type LatestCountValue = (typeof LATEST_COUNT_OPTIONS)[number]

export function parseLatestCountPresetValue(value: string): LatestCountValue | null {
  for (const count of LATEST_COUNT_OPTIONS) {
    if (String(count) === value) {
      return count
    }
  }

  return null
}

export function getTimeRangeQuery(
  range: LeadScoringTimeRange
): Pick<LeadScoringCandidateQuery, 'createdAtFrom' | 'createdAtTo'> {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === 'last-week') start.setDate(now.getDate() - 7)
  if (range === 'last-month') start.setMonth(now.getMonth() - 1)
  if (range === 'last-quarter') start.setMonth(now.getMonth() - 3)
  if (range === 'last-year') start.setFullYear(now.getFullYear() - 1)

  return {
    createdAtFrom: start.toISOString(),
    createdAtTo: now.toISOString()
  }
}

export function buildLeadScoringCandidateQuery(preset: LeadScoringSelectionPreset): LeadScoringCandidateQuery {
  const query: LeadScoringCandidateQuery = {
    search: preset.search?.trim() || undefined,
    unscoredOnly: preset.unscoredOnly || undefined
  }

  if (preset.scope === 'time' && preset.timeRange) {
    Object.assign(query, getTimeRangeQuery(preset.timeRange))
  }

  return query
}

export type LeadScoringSelectionSummaryInput = {
  scope: LeadScoringPresetScope | null
  latestCount: number | null
  timeRange: LeadScoringTimeRange | null
  unscoredOnly: boolean
  manualCount: number
}

export type LeadScoringSelectionSummaryLabels = {
  allLeads: string
  allUnscored: string
  lastCount: (count: number) => string
  timeRange: (range: LeadScoringTimeRange) => string
  selectedCount: (count: number) => string
  unscoredSuffix: string
}

export function buildLeadScoringSelectionSummary(
  input: LeadScoringSelectionSummaryInput,
  labels: LeadScoringSelectionSummaryLabels
): string {
  let base: string

  if (input.scope === 'all' && input.unscoredOnly) {
    return labels.allUnscored
  }

  if (input.scope === 'all') {
    base = labels.allLeads
  } else if (input.scope === 'latest' && input.latestCount) {
    base = labels.lastCount(input.latestCount)
  } else if (input.scope === 'time' && input.timeRange) {
    base = labels.timeRange(input.timeRange)
  } else {
    base = labels.selectedCount(input.manualCount)
  }

  if (input.unscoredOnly && !(input.scope === 'all' && input.unscoredOnly)) {
    return `${base}${labels.unscoredSuffix}`
  }

  return base
}
