/**
 * Engagement metrics are stored on CustomerCampaignContent as a flat JSON object.
 * The form uses fixed keys plus user-defined custom key/value pairs.
 */

export const STANDARD_ENGAGEMENT_METRIC_KEYS = ['views', 'clicks', 'shares', 'comments', 'impressions'] as const

export type StandardEngagementMetricKey = (typeof STANDARD_ENGAGEMENT_METRIC_KEYS)[number]

export type EngagementMetricsFormState = {
  standard: Record<StandardEngagementMetricKey, number | undefined>
  custom: Array<{ key: string; value: number | undefined }>
}

const STANDARD_KEY_SET = new Set<string>(STANDARD_ENGAGEMENT_METRIC_KEYS)

export function createEmptyEngagementMetricsFormState(): EngagementMetricsFormState {
  return {
    standard: {
      views: undefined,
      clicks: undefined,
      shares: undefined,
      comments: undefined,
      impressions: undefined
    },
    custom: []
  }
}

function parseMetricsJsonString(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function buildNumericMetricsMap(raw: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const trimmedKey = key.trim()
    if (!trimmedKey) continue
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      result[trimmedKey] = numeric
    }
  }
  return result
}

function normalizeMetricsRaw(metrics: unknown): Record<string, unknown> | null {
  if (metrics == null) return null

  let raw: unknown = metrics
  if (typeof metrics === 'string') {
    raw = parseMetricsJsonString(metrics)
    if (raw == null) return null
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null
  }

  return raw as Record<string, unknown>
}

function parseMetricsObject(metrics: unknown): Record<string, number> | null {
  const raw = normalizeMetricsRaw(metrics)
  if (!raw) return null

  const result = buildNumericMetricsMap(raw)
  return Object.keys(result).length > 0 ? result : null
}

export function engagementMetricsToFormState(metrics: unknown): EngagementMetricsFormState {
  const empty = createEmptyEngagementMetricsFormState()
  const parsed = parseMetricsObject(metrics)
  if (!parsed) return empty

  const custom: EngagementMetricsFormState['custom'] = []

  for (const [key, value] of Object.entries(parsed)) {
    const normalizedKey = key.toLowerCase()
    if (STANDARD_KEY_SET.has(normalizedKey)) {
      empty.standard[normalizedKey as StandardEngagementMetricKey] = value
    } else {
      custom.push({ key, value })
    }
  }

  return { standard: empty.standard, custom }
}

export function formStateToEngagementMetrics(state: EngagementMetricsFormState): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}

  for (const key of STANDARD_ENGAGEMENT_METRIC_KEYS) {
    const value = state.standard[key]
    if (value != null && !Number.isNaN(Number(value))) {
      result[key] = Number(value)
    }
  }

  for (const row of state.custom) {
    const trimmedKey = row.key.trim()
    if (!trimmedKey || STANDARD_KEY_SET.has(trimmedKey)) continue
    if (row.value == null || Number.isNaN(Number(row.value))) continue
    result[trimmedKey] = Number(row.value)
  }

  return Object.keys(result).length > 0 ? result : null
}

/** Human-readable summary for tables and previews. */
export function formatEngagementMetricsSummary(metrics: unknown, labelForKey: (key: string) => string): string {
  const parsed = parseMetricsObject(metrics)
  if (!parsed) return '-'

  const parts = Object.entries(parsed).map(([key, value]) => {
    const label = labelForKey(key)
    const formattedValue = Number.isInteger(value) ? value.toLocaleString() : String(value)
    return `${label}: ${formattedValue}`
  })

  if (parts.length === 0) return '-'
  const joined = parts.join(' · ')
  return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined
}

export function isStandardEngagementMetricKey(key: string): key is StandardEngagementMetricKey {
  return STANDARD_KEY_SET.has(key.toLowerCase())
}
