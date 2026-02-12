import { Card, CardContent, Separator } from '@newwork/nw-design-system'
import { Loader2, Lightbulb } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { AnalysisKpiCard } from './AnalysisKpiCard'
import { AnalysisChart } from './AnalysisChart'
import { AnalysisTable } from './AnalysisTable'
import type { AnalysisContent } from '../../types/nexus.types'

interface AnalysisRendererProps {
  content: AnalysisContent
  isStreaming?: boolean
  accessToken?: string
  testId?: string
}

export const AnalysisRenderer = ({
  content,
  isStreaming = false,
  accessToken = '',
  testId = 'nexus-analysis'
}: AnalysisRendererProps) => {
  const hasContent =
    content.summary || content.kpis?.length > 0 || content.charts?.length > 0 || content.tables?.length > 0

  if (!hasContent && isStreaming) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid={testId}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
          <Loader2 className="gba:h-5 gba:w-5 gba:animate-spin" />
          <span className="gba:text-sm">Building analysis dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:px-6 gba:py-8 gba:space-y-8" data-testid={testId}>
      {/* Summary */}
      {content.summary && (
        <section data-testid={`${testId}-summary`}>
          <div className="gba:max-w-4xl gba:mx-auto gba:bg-card gba:border gba:border-border gba:rounded-xl gba:px-6 gba:py-5">
            <div className="gba:prose-sm">
              <MarkdownWithChipsRenderer content={content.summary} accessToken={accessToken} variant="default" />
            </div>
          </div>
        </section>
      )}

      {/* KPIs */}
      {content.kpis && content.kpis.length > 0 && (
        <section data-testid={`${testId}-kpis`}>
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-4">
            Key Metrics
          </h3>
          <div className="gba:grid gba:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
            {content.kpis.map((kpi, i) => (
              <AnalysisKpiCard key={i} kpi={kpi} testId={`${testId}-kpi-${i}`} />
            ))}
          </div>
        </section>
      )}

      {/* Charts */}
      {content.charts && content.charts.length > 0 && (
        <section data-testid={`${testId}-charts`}>
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-4">
            Visualizations
          </h3>
          <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
            {content.charts.map((chart, i) => (
              <AnalysisChart key={i} chart={chart} testId={`${testId}-chart-${i}`} />
            ))}
          </div>
        </section>
      )}

      {/* Tables */}
      {content.tables && content.tables.length > 0 && (
        <section data-testid={`${testId}-tables`}>
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-4">
            Data Tables
          </h3>
          <div className="gba:space-y-4">
            {content.tables.map((table, i) => (
              <AnalysisTable key={i} table={table} testId={`${testId}-table-${i}`} />
            ))}
          </div>
        </section>
      )}

      {/* Insights */}
      {content.insights && content.insights.length > 0 && (
        <section data-testid={`${testId}-insights`}>
          <Separator className="gba:my-6" />
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-4">
            Key Insights
          </h3>
          <div className="gba:space-y-3 gba:max-w-4xl">
            {content.insights.map((insight, i) => (
              <Card key={i} data-testid={`${testId}-insight-${i}`}>
                <CardContent className="gba:flex gba:items-start gba:gap-3 gba:p-4">
                  <Lightbulb className="gba:h-4 gba:w-4 gba:text-warning gba:mt-0.5 gba:flex-shrink-0" />
                  <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{insight}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:justify-center gba:py-4">
          <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
          <span className="gba:text-xs">Finalizing analysis...</span>
        </div>
      )}
    </div>
  )
}
