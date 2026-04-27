import React, { useMemo } from 'react'
import DOMPurify from 'dompurify'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import { PanelCard } from './PanelCard'
import { chartRenderers, parseChartConfig, LineChartRenderer, type SingleChartConfig } from './chartRenderers'

interface DashboardSection {
  type: 'chart' | 'text' | 'chart-grid'
  title?: string
  content?: string
  chart?: SingleChartConfig
  charts?: SingleChartConfig[]
  columns?: number
}

interface DashboardConfig {
  title?: string
  sections: DashboardSection[]
}

function parseDashboardConfig(content: Record<string, unknown>): DashboardConfig | null {
  const sections = content.sections as DashboardSection[] | undefined
  if (!Array.isArray(sections) || sections.length === 0) return null
  return { title: content.title as string | undefined, sections }
}

const SingleChart: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const Renderer = chartRenderers[config.chartType] ?? LineChartRenderer
  return (
    <div>
      {config.title && (
        <h5 className="gba:text-[10px] gba:font-semibold gba:text-foreground gba:mb-1.5">{config.title}</h5>
      )}
      <Renderer config={config} />
    </div>
  )
}

const ChartGridSection: React.FC<{ charts: SingleChartConfig[]; columns?: number }> = ({ charts, columns = 2 }) => (
  <div
    className="gba:grid gba:gap-3"
    style={{ gridTemplateColumns: `repeat(${Math.min(columns, charts.length)}, 1fr)` }}
  >
    {charts.map((chart, idx) => {
      const parsed = parseChartConfig(chart as unknown as Record<string, unknown>) ?? chart
      return <SingleChart key={`grid-${parsed.title ?? idx}`} config={parsed} />
    })}
  </div>
)

const TextSection: React.FC<{ content: string }> = ({ content }) => {
  // AI-generated HTML is NOT trusted: sanitize before injection to avoid XSS
  // via <script> / event-handler attributes.
  const safeHtml = useMemo(() => DOMPurify.sanitize(content), [content])
  return (
    <div
      className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:text-xs"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}

const DashboardPreview: React.FC<{ config: DashboardConfig }> = ({ config }) => (
  <div className="gba:space-y-4">
    {config.sections.map((section, idx) => {
      const key = `section-${section.title ?? idx}`
      if (section.type === 'text' && section.content) {
        return (
          <div key={key}>
            {section.title && (
              <h4 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-2">{section.title}</h4>
            )}
            <TextSection content={section.content} />
          </div>
        )
      }
      if (section.type === 'chart' && section.chart) {
        const parsed = parseChartConfig(section.chart as unknown as Record<string, unknown>) ?? section.chart
        return (
          <div key={key}>
            {section.title && (
              <h4 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-2">{section.title}</h4>
            )}
            <SingleChart config={parsed} />
          </div>
        )
      }
      if (section.type === 'chart-grid' && section.charts) {
        return (
          <div key={key}>
            {section.title && (
              <h4 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-2">{section.title}</h4>
            )}
            <ChartGridSection charts={section.charts} columns={section.columns} />
          </div>
        )
      }
      return null
    })}
  </div>
)

export const ChartPreview: React.FC<{ preview: ArtifactPreview }> = ({ preview }) => {
  if (!preview.content) {
    return (
      <PanelCard title="Live Preview" defaultOpen>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6">
          <p className="gba:text-xs gba:text-muted-foreground">Chart data not available</p>
        </div>
      </PanelCard>
    )
  }

  const dashboardConfig = parseDashboardConfig(preview.content)
  if (dashboardConfig) {
    return (
      <PanelCard title="Live Preview" defaultOpen>
        <div className="gba:p-3" data-testid="fabric-live-preview-dashboard">
          {dashboardConfig.title && (
            <h4 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-3">{dashboardConfig.title}</h4>
          )}
          <DashboardPreview config={dashboardConfig} />
        </div>
      </PanelCard>
    )
  }

  const singleConfig = parseChartConfig(preview.content)
  if (singleConfig) {
    return (
      <PanelCard title="Live Preview" defaultOpen>
        <div className="gba:p-3" data-testid="fabric-live-preview-chart">
          <SingleChart config={singleConfig} />
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title="Live Preview" defaultOpen>
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6">
        <p className="gba:text-xs gba:text-muted-foreground">Chart data not available</p>
      </div>
    </PanelCard>
  )
}
