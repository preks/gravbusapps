import React from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { TrendUp } from '@phosphor-icons/react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WorkflowAnalyticsData } from './types'

const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'secondary',
  warning: 'outline',
  critical: 'destructive'
}

const TIME_RANGE_OPTIONS = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' }
] as const

interface WorkflowAnalyticsDisplayProps {
  data: WorkflowAnalyticsData
  onFollowUpClick?: (message: string) => void
}

export const WorkflowAnalyticsDisplay: React.FC<WorkflowAnalyticsDisplayProps> = ({ data, onFollowUpClick }) => {
  const barData = data.performanceCharts.topFlowsByExecutions.map(row => ({
    name: row.label,
    executions: row.value
  }))

  const handleTimeRangeChange = (newTimeRange: string) => {
    if (onFollowUpClick) {
      onFollowUpClick(`Show workflow analytics for ${newTimeRange}`)
    }
  }

  return (
    <Card className="gba:border-2 gba:shadow-md" data-testid="workflow-analytics-display">
      <CardHeader className="gba:border-b gba:bg-muted/40">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <TrendUp className="gba:h-8 gba:w-8 gba:text-primary" aria-hidden />
            <div>
              <CardTitle className="gba:text-lg">{data.title}</CardTitle>
              <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{data.description}</p>
              <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                {data.timeRange.label}: {data.timeRange.fromUtc} → {data.timeRange.toUtc}
              </p>
            </div>
          </div>
          {onFollowUpClick && (
            <div className="gba:min-w-[180px]">
              <Select onValueChange={handleTimeRangeChange}>
                <SelectTrigger data-testid="workflow-time-range-select">
                  <SelectValue placeholder="Change time range..." />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-6 gba:pt-6">
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-3">
          <MetricTile label="Executions" value={data.overviewKpis.totalFlowExecutions} />
          <MetricTile label="Distinct flows" value={data.overviewKpis.distinctFlows} />
          <MetricTile label="Error signals" value={data.overviewKpis.errorSignals} />
          <MetricTile label="Avg latency (ms)" value={data.overviewKpis.avgLatencyMs} />
        </div>

        <section aria-labelledby="wf-funnel-heading">
          <h3 id="wf-funnel-heading" className="gba:mb-2 gba:text-sm gba:font-semibold">
            Lifecycle funnel
          </h3>
          <ul className="gba:space-y-2">
            {data.executionFunnel.stages.map(stage => (
              <li
                key={stage.id}
                className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:border gba:px-3 gba:py-2"
              >
                <span className="gba:text-sm">{stage.label}</span>
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Badge variant="secondary">{stage.count}</Badge>
                  {stage.share != null && (
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {(stage.share * 100).toFixed(0)}% of first stage
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {barData.length > 0 && (
          <section aria-labelledby="wf-chart-heading">
            <h3 id="wf-chart-heading" className="gba:mb-2 gba:text-sm gba:font-semibold">
              Top flows by executions (sampled)
            </h3>
            <div className="gba:h-64 gba:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="executions" name="Executions" fill="var(--nw-chart-1)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section aria-labelledby="wf-insights-heading">
          <h3 id="wf-insights-heading" className="gba:mb-2 gba:text-sm gba:font-semibold">
            AI insights
          </h3>
          <ul className="gba:space-y-3">
            {data.aiInsights.map(insight => (
              <li
                key={insight.id}
                className="gba:rounded-md gba:border gba:p-3 gba:bg-card"
                data-testid={`workflow-insight-${insight.id}`}
              >
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <span className="gba:font-medium">{insight.title}</span>
                  <Badge variant={severityVariant[insight.severity] ?? 'secondary'}>{insight.severity}</Badge>
                  <Badge variant="outline">{insight.category}</Badge>
                </div>
                <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{insight.description}</p>
                {insight.suggestedActions.length > 0 && (
                  <ul className="gba:mt-2 gba:list-disc gba:pl-5 gba:text-sm">
                    {insight.suggestedActions.map((action, actionIndex) => (
                      <li key={`${insight.id}-action-${actionIndex}`}>{action}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="wf-predictions-heading">
          <h3 id="wf-predictions-heading" className="gba:mb-2 gba:text-sm gba:font-semibold">
            Predictions & bottlenecks
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">{data.predictions.headline}</p>
          <ul className="gba:mt-2 gba:list-disc gba:pl-5 gba:text-sm gba:text-muted-foreground">
            {data.predictions.bottleneckHints.map((hint, hintIndex) => (
              <li key={`bottleneck-${hintIndex}`}>{hint}</li>
            ))}
          </ul>
        </section>

        {data.drillDownOptions.length > 0 && (
          <section aria-labelledby="wf-drill-heading">
            <h3 id="wf-drill-heading" className="gba:mb-2 gba:text-sm gba:font-semibold">
              Suggested follow-ups
            </h3>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {data.drillDownOptions.map((option, drillIndex) => (
                <Button
                  key={`drill-${drillIndex}-${option.heading}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  data-testid={`workflow-drill-${option.heading}`}
                  onClick={() => onFollowUpClick?.(option.message)}
                >
                  {option.heading}
                </Button>
              ))}
            </div>
            {onFollowUpClick && (
              <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                Click a suggestion to send it as a message.
              </p>
            )}
            {!onFollowUpClick && (
              <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                Copy a suggestion message into chat to continue the analysis.
              </p>
            )}
          </section>
        )}

        {data.dataSourceNotes.length > 0 && (
          <footer className="gba:border-t gba:pt-3">
            <p className="gba:text-xs gba:text-muted-foreground">Data notes</p>
            <ul className="gba:list-disc gba:pl-5 gba:text-xs gba:text-muted-foreground">
              {data.dataSourceNotes.map((note, noteIndex) => (
                <li key={`note-${noteIndex}`}>{note}</li>
              ))}
            </ul>
          </footer>
        )}
      </CardContent>
    </Card>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="gba:rounded-lg gba:border gba:bg-muted/30 gba:p-3">
      <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
      <p className="gba:mt-1 gba:text-lg gba:font-semibold">{value}</p>
    </div>
  )
}
