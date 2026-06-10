import type { IcpScoringCandidateQuery } from '../types/icpScoringCandidateTypes'

export type IcpScoringTimeRange = 'today' | 'last-week' | 'last-month' | 'last-quarter' | 'last-year'

export type IcpScoringPresetScope = 'all' | 'latest' | 'time'

export type IcpScoringSelectionPreset = {
  scope: IcpScoringPresetScope
  latestCount?: number
  timeRange?: IcpScoringTimeRange
  unscoredOnly: boolean
  search?: string
}

export function getLatestPresetSelectValue(
  presetScope: IcpScoringPresetScope | null,
  latestCount: number | null,
  allEntitiesPreset: string
): string {
  if (presetScope === 'all' && !latestCount) {
    return allEntitiesPreset
  }

  if (latestCount) {
    return String(latestCount)
  }

  return ''
}

export function getTimeRangePresetSelectValue(
  presetScope: IcpScoringPresetScope | null,
  timeRange: IcpScoringTimeRange | null,
  allEntitiesPreset: string
): string {
  if (presetScope === 'all' && !timeRange) {
    return allEntitiesPreset
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
  range: IcpScoringTimeRange
): Pick<IcpScoringCandidateQuery, 'createdAtFrom' | 'createdAtTo'> {
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

export function buildIcpScoringCandidateQuery(preset: IcpScoringSelectionPreset): IcpScoringCandidateQuery {
  const query: IcpScoringCandidateQuery = {
    search: preset.search?.trim() || undefined,
    unscoredOnly: preset.unscoredOnly || undefined
  }

  if (preset.scope === 'time' && preset.timeRange) {
    Object.assign(query, getTimeRangeQuery(preset.timeRange))
  }

  return query
}

export type IcpScoringSelectionSummaryInput = {
  scope: IcpScoringPresetScope | null
  latestCount: number | null
  timeRange: IcpScoringTimeRange | null
  unscoredOnly: boolean
  manualCount: number
}

export type IcpScoringSelectionSummaryLabels = {
  allEntities: string
  allUnscored: string
  lastCount: (count: number) => string
  timeRange: (range: IcpScoringTimeRange) => string
  selectedCount: (count: number) => string
  unscoredSuffix: string
}

export function buildIcpScoringSelectionSummary(
  input: IcpScoringSelectionSummaryInput,
  labels: IcpScoringSelectionSummaryLabels
): string {
  if (input.scope === 'all' && input.unscoredOnly) {
    return labels.allUnscored
  }

  let base: string

  if (input.scope === 'all') {
    base = labels.allEntities
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
