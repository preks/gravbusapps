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

const StatRow: React.FC<{ stats: StatItem[] }> = ({ stats }) => (
  <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3">
    {stats.map((stat, idx) => (
      <div
        key={`${stat.label}-${idx}`}
        className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4 gba:shadow-sm"
      >
        <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">{stat.label}</p>
        <p className="gba:text-2xl gba:font-semibold gba:text-foreground">
          {stat.prefix && <span className="gba:text-muted-foreground gba:text-lg">{stat.prefix}</span>}
          {stat.value}
          {stat.suffix && <span className="gba:text-muted-foreground gba:text-lg">{stat.suffix}</span>}
        </p>
        {stat.trend && (
          <p
            className={`gba:text-xs gba:font-medium gba:mt-1 ${stat.trend.positive ? 'gba:text-emerald-600' : 'gba:text-red-500'}`}
          >
            {stat.trend.value}
          </p>
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
