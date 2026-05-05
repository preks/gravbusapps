/**
 * Workflow analytics display types (aligned with flowbot WorkflowAnalyticsData).
 */

export type TimeRangeInfo = {
  label: string
  fromUtc: string
  toUtc: string
}

export type WorkflowOverviewKpis = {
  totalFlowExecutions: string
  distinctFlows: string
  errorSignals: string
  avgLatencyMs: string
}

export type FunnelStage = {
  id: string
  label: string
  count: number
  share: number | null | undefined
}

export type BarPoint = {
  label: string
  value: number
}

export type AIInsight = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  category: 'trend' | 'anomaly' | 'recommendation' | 'comparison'
  title: string
  description: string
  suggestedActions: string[]
}

export type WorkflowPredictionsBlock = {
  headline: string
  items: Record<string, unknown>[]
  bottleneckHints: string[]
}

export type DrillDownOption = {
  heading: string
  message: string
}

export type WorkflowAnalyticsData = {
  type: 'workflowAnalytics'
  title: string
  description: string
  timeRange: TimeRangeInfo
  overviewKpis: WorkflowOverviewKpis
  executionFunnel: { stages: FunnelStage[] }
  performanceCharts: { topFlowsByExecutions: BarPoint[] }
  aiInsights: AIInsight[]
  predictions: WorkflowPredictionsBlock
  drillDownOptions: DrillDownOption[]
  dataSourceNotes: string[]
}
