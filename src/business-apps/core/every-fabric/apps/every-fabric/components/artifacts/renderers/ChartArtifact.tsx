import {
  chartRenderers,
  parseChartConfig,
  LineChartRenderer,
  type SingleChartConfig
} from '../../workspace/chartRenderers'
import type { RendererProps } from './index'

interface ChartGridItem {
  type?: string
  title?: string
  chart?: SingleChartConfig
}

interface DashboardSection {
  type: 'chart' | 'chart-grid' | 'text'
  title?: string
  chart?: SingleChartConfig
  charts?: (SingleChartConfig | ChartGridItem)[]
  content?: string
  columns?: number
}

interface DashboardConfig {
  title?: string
  sections?: DashboardSection[]
}

function parseJson(content: string | null): Record<string, unknown> | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const SingleChart: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const Renderer = chartRenderers[config.chartType] ?? LineChartRenderer
  return (
    <div className="gba:min-h-56">
      {config.title && <h3 className="gba:mb-3 gba:text-sm gba:font-semibold gba:text-foreground">{config.title}</h3>}
      <Renderer config={config} />
    </div>
  )
}

const ChartArtifact: React.FC<RendererProps> = ({ content, viewMode }) => {
  if (viewMode === 'code') {
    return (
      <pre className="gba:h-full gba:overflow-auto gba:bg-muted/30 gba:p-4 gba:text-xs gba:font-mono">
        {content ?? 'No chart content available.'}
      </pre>
    )
  }

  const parsed = parseJson(content)
  if (!parsed) {
    return <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">No chart content available.</div>
  }

  const single = parseChartConfig(parsed)
  if (single) {
    return (
      <div className="gba:h-full gba:overflow-auto gba:p-6">
        <SingleChart config={single} />
      </div>
    )
  }

  const dashboard = parsed as DashboardConfig
  if (Array.isArray(dashboard.sections)) {
    const elements: React.ReactNode[] = []
    let chartBatch: Array<{ key: string | number; config: SingleChartConfig }> = []

    const flushBatch = () => {
      if (chartBatch.length === 0) return
      if (chartBatch.length === 1) {
        const { key, config } = chartBatch[0]
        elements.push(<SingleChart key={key} config={config} />)
      } else {
        elements.push(
          <div
            key={`grid-${chartBatch[0].key}`}
            className="gba:grid gba:gap-6"
            style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
          >
            {chartBatch.map(({ key, config }) => (
              <SingleChart key={key} config={config} />
            ))}
          </div>
        )
      }
      chartBatch = []
    }

    dashboard.sections.forEach((section, idx) => {
      if (section.type === 'chart' && section.chart) {
        chartBatch.push({ key: section.title ?? idx, config: section.chart })
      } else if (section.type === 'chart-grid' && section.charts) {
        flushBatch()
        elements.push(
          <div
            key={section.title ?? idx}
            className="gba:grid gba:gap-6"
            style={{ gridTemplateColumns: `repeat(${Math.min(section.columns ?? 2, section.charts.length)}, 1fr)` }}
          >
            {section.charts.map((item, chartIdx) => {
              const config =
                'chart' in item && item.chart
                  ? { ...item.chart, title: item.title ?? item.chart.title }
                  : (item as SingleChartConfig)
              return <SingleChart key={config.title ?? chartIdx} config={config} />
            })}
          </div>
        )
      } else if (section.type === 'text' && section.content) {
        flushBatch()
        elements.push(
          <section key={section.title ?? idx}>
            {section.title && <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{section.title}</h3>}
            <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{section.content}</p>
          </section>
        )
      }
    })
    flushBatch()

    return (
      <div className="gba:h-full gba:overflow-auto gba:p-6 gba:space-y-6">
        {dashboard.title && <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{dashboard.title}</h2>}
        {elements}
      </div>
    )
  }

  return <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">Unsupported chart artifact shape.</div>
}

export default ChartArtifact
