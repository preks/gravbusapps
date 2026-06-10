import React from 'react'
import {
  chartRenderers,
  normalizeChartPayloadForRender,
  parseChartConfig,
  LineChartRenderer,
  type SingleChartConfig
} from './chartRenderers'

export interface StatItem {
  label: string
  value: string
  prefix?: string
  suffix?: string
  trend?: { value: string; positive?: boolean; description?: string }
}

interface DashboardSection {
  type: string
  title?: string
  chart?: Record<string, unknown>
  charts?: Array<Record<string, unknown>>
  stats?: StatItem[]
  content?: string
  columns?: number
}

/** Shown when chart JSON is missing, empty, or not yet loaded. */
export const ChartEmptyState: React.FC<{ message?: string }> = ({ message = 'No chart data available' }) => (
  <div
    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20"
    data-testid="chart-empty-state"
  >
    <p className="gba:text-sm gba:text-muted-foreground gba:text-center">{message}</p>
  </div>
)

/** Direction of a KPI trend, inferred from the explicit flag or the value sign. */
export function statTrendDirection(trend: NonNullable<StatItem['trend']>): 'up' | 'down' | 'flat' {
  if (typeof trend.positive === 'boolean') return trend.positive ? 'up' : 'down'
  const text = String(trend.value ?? '')
  if (/^\s*[-−]/.test(text) || /\bdown\b/i.test(text)) return 'down'
  if (/^\s*\+/.test(text) || /▲|↑/.test(text) || /\bup\b/i.test(text)) return 'up'
  return 'flat'
}

const TREND_GLYPH: Record<'up' | 'down' | 'flat', string> = { up: '▲', down: '▼', flat: '→' }

const TrendChip: React.FC<{ trend: NonNullable<StatItem['trend']> }> = ({ trend }) => {
  const dir = statTrendDirection(trend)
  const tone =
    dir === 'up'
      ? 'gba:text-emerald-600 gba:bg-emerald-50'
      : dir === 'down'
        ? 'gba:text-red-500 gba:bg-red-50'
        : 'gba:text-muted-foreground gba:bg-muted/40'
  const cleaned = String(trend.value ?? '').replace(/^\s*[+\-−▲▼↑→]\s*/, '')
  return (
    <span
      data-testid="stat-trend-chip"
      data-trend-direction={dir}
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium ${tone}`}
      title={trend.description}
    >
      <span aria-hidden="true">{TREND_GLYPH[dir]}</span>
      {cleaned}
    </span>
  )
}

const StatRow: React.FC<{ stats: StatItem[] }> = ({ stats }) => (
  <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3">
    {stats.map((stat, idx) => (
      <div
        key={`${stat.label}-${idx}`}
        data-testid="stat-card"
        className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:p-4 gba:transition-colors hover:gba:border-border"
      >
        <p className="gba:mb-2 gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
          {stat.label}
        </p>
        <div className="gba:flex gba:items-baseline gba:justify-between gba:gap-2">
          <p className="gba:min-w-0 gba:truncate gba:text-2xl gba:font-semibold gba:leading-none gba:text-foreground">
            {stat.prefix && <span className="gba:text-base gba:text-muted-foreground">{stat.prefix}</span>}
            {stat.value}
            {stat.suffix && <span className="gba:text-base gba:text-muted-foreground">{stat.suffix}</span>}
          </p>
          {stat.trend && <TrendChip trend={stat.trend} />}
        </div>
        {stat.trend?.description && (
          <p className="gba:mt-2 gba:text-xs gba:leading-snug gba:text-muted-foreground">{stat.trend.description}</p>
        )}
      </div>
    ))}
  </div>
)

const SingleChart: React.FC<{ config: SingleChartConfig; title?: string; compact?: boolean }> = ({
  config,
  title,
  compact
}) => {
  const Renderer = chartRenderers[config.chartType] ?? LineChartRenderer
  const heading = title || config.title
  return (
    <div className={compact ? 'gba:min-h-48' : 'gba:min-h-56'}>
      {heading && (
        <h4
          className={
            compact
              ? 'gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2'
              : 'gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3'
          }
        >
          {heading}
        </h4>
      )}
      <Renderer config={config} compact={compact} />
    </div>
  )
}

/** True when inline preview can render at least one section (not the error placeholder). */
export function isChartPreviewRenderable(data: Record<string, unknown>): boolean {
  if (parseChartConfig(data)) return true
  const sections = data.sections as DashboardSection[] | undefined
  if (!Array.isArray(sections) || sections.length === 0) return false
  return sections.some(section => {
    if (section.type === 'stat' && section.stats?.length) return true
    if (section.type === 'chart' && section.chart && parseChartConfig(section.chart)) return true
    if (section.type === 'chart-grid' && section.charts?.some(c => parseChartConfig(c))) return true
    if (section.type === 'text' && section.content) return true
    return false
  })
}

/** Inline chart/dashboard body for chat and live-preview panels. */
export const ChartInlineBody: React.FC<{
  data: Record<string, unknown>
  compact?: boolean
}> = ({ data, compact }) => {
  const normalized = normalizeChartPayloadForRender(data)
  const single = parseChartConfig(normalized)
  if (single) {
    if (!single.data?.length) {
      return <ChartEmptyState message="No data points to display for this chart." />
    }
    return <SingleChart config={single} compact={compact} />
  }

  const sections = normalized.sections as DashboardSection[] | undefined
  if (!Array.isArray(sections) || sections.length === 0) {
    return <ChartEmptyState message="Unsupported or empty chart preview." />
  }

  const title = data.title as string | undefined

  return (
    <div className="gba:space-y-5">
      {title && !compact && <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{title}</h3>}
      {title && compact && <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>}
      {sections.map((section, idx) => {
        const key = section.title ?? `section-${idx}`
        if (section.type === 'stat' && section.stats?.length) {
          return <StatRow key={key} stats={section.stats} />
        }
        if (section.type === 'chart' && section.chart) {
          const cfg = parseChartConfig(section.chart)
          if (cfg) return <SingleChart key={key} config={cfg} title={section.title} compact={compact} />
        }
        if (section.type === 'chart-grid' && section.charts?.length) {
          const cols = section.columns ?? 2
          return (
            <div key={key}>
              {section.title && (
                <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">{section.title}</h4>
              )}
              <div
                className="gba:grid gba:gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(cols, section.charts.length)}, 1fr)` }}
              >
                {section.charts.map((chart, chartIdx) => {
                  const cfg = parseChartConfig(chart)
                  if (!cfg) return null
                  return <SingleChart key={cfg.title ?? chartIdx} config={cfg} compact={compact} />
                })}
              </div>
            </div>
          )
        }
        if (section.type === 'text' && section.content) {
          return (
            <section key={key}>
              {section.title && (
                <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">{section.title}</h4>
              )}
              <p className="gba:text-sm gba:text-muted-foreground">{section.content}</p>
            </section>
          )
        }
        return null
      })}
    </div>
  )
}
