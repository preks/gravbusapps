/**
 * Analytics Context Types for AI Insights
 */

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | string

export interface AnalyticsEntityRef {
  type: 'investment' | 'account' | 'opportunity' | 'lead' | 'contact' | string
  id: string
  name?: string
}

export type AnalyticsPrimitiveValue = string | number | boolean | null

export interface AnalyticsMetric {
  id: string
  label?: string
  value: AnalyticsPrimitiveValue | AnalyticsPrimitiveValue[] | Record<string, unknown>
  unit?: string
  asOf?: string
  meta?: Record<string, unknown>
}

export interface AnalyticsSummary {
  [key: string]: AnalyticsPrimitiveValue | AnalyticsPrimitiveValue[] | Record<string, unknown> | undefined
}

export interface AnalyticsContact {
  id: string
  name?: string
  relation?: string
  role?: string
  type?: string
  email?: string
  phone?: string
  meta?: Record<string, unknown>
}

export interface AnalyticsActivity {
  id: string
  type?: string
  title?: string
  occurredAt?: string
  relationId?: string
  meta?: Record<string, unknown>
}

export interface AnalyticsLink {
  id: string
  title?: string
  url?: string
  type?: string
  snippet?: string
  meta?: Record<string, unknown>
}

export interface AnalyticsRawSnapshot {
  [key: string]: unknown
}

export interface AnalyticsHeaderContext {
  mode: 'header'
  entity: AnalyticsEntityRef
  metrics: AnalyticsMetric[]
  meta?: Record<string, unknown>
  summary?: AnalyticsSummary
  contacts?: AnalyticsContact[]
  activities?: AnalyticsActivity[]
  links?: AnalyticsLink[]
  raw?: AnalyticsRawSnapshot
  componentIds?: string[]
}

/**
 * Analytics Snapshot Context
 * Full page snapshot with DOM parsing
 */
export interface AnalyticsSnapshotContext {
  mode: 'snapshot'
  entity: AnalyticsEntityRef
  snapshot: {
    html?: string
    text?: string
    components?: Array<{
      id: string
      type: string
      data?: unknown
    }>
  }
  timestamp: string
}

/**
 * Analytics Context - Discriminated Union
 * Supports multiple modes: header, snapshot, etc.
 */
export type AnalyticsContext = AnalyticsHeaderContext | AnalyticsSnapshotContext

/**
 * Type guards for AnalyticsContext discriminated union
 */
export function isHeaderContext(context: AnalyticsContext): context is AnalyticsHeaderContext {
  return context.mode === 'header'
}

export function isSnapshotContext(context: AnalyticsContext): context is AnalyticsSnapshotContext {
  return context.mode === 'snapshot'
}
