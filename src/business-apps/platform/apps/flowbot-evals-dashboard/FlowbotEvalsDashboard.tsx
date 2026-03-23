import { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Badge, Button } from '@newwork/nw-design-system'
import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useEvalsDashboard, type DashboardFilters } from './hooks/useEvalsDashboard'
import KpiCards from './components/KpiCards'
import TimeseriesCharts from './components/TimeseriesCharts'
import BreakdownCharts from './components/BreakdownCharts'
import RunsTables from './components/RunsTables'
import WorkflowComparison from './components/WorkflowComparison'
import DistributionStats from './components/DistributionStats'
import DashboardLoading from './components/DashboardLoading'
import ToolTokenStats from './components/ToolTokenStats'
import RawWorkflowNames from './components/RawWorkflowNames'
import TokenBreakdown from './components/TokenBreakdown'
import DashboardFiltersCard from './components/DashboardFiltersCard'

const todayDateInputValue = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  return `${yyyy}-${mm}-${dd}`
}

const daysAgoDateInputValue = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  return `${yyyy}-${mm}-${dd}`
}

export type FlowbotEvalsDashboardProps = BusinessAppContextProps

export function FlowbotEvalsDashboard(context: Readonly<FlowbotEvalsDashboardProps>) {
  const defaultFilters = useMemo<DashboardFilters>(
    () => ({
      workflow: '',
      // Inclusive 7-day window (today and previous 6 days).
      fromLocal: daysAgoDateInputValue(6),
      toLocal: todayDateInputValue(),
      bucket: 'day',
      includeSplitView: true,
      llmProvider: '',
      llmModel: ''
    }),
    []
  )

  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters)

  const { data, isLoading, error, isEmpty, refetch } = useEvalsDashboard(context, filters)

  const derivedWorkflowSuggestions = useMemo(() => {
    const set = new Set<string>()
    data?.error_breakdown?.forEach(i => i.key && set.add(i.key))
    data?.recent_runs?.forEach(r => {
      const name = r.workflow_display ?? r.workflow
      if (name) set.add(name)
    })
    data?.top_cost_runs?.forEach(r => {
      const name = r.workflow_display ?? r.workflow
      if (name) set.add(name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30)
  }, [data])

  const providerOptions = useMemo(() => data?.available_filters?.providers ?? [], [data?.available_filters?.providers])

  const modelOptions = useMemo(() => {
    const byProvider = data?.available_filters?.models_by_provider
    if (!byProvider) return []
    if (filters.llmProvider && byProvider[filters.llmProvider]) {
      return byProvider[filters.llmProvider]
    }
    const all = new Set<string>()
    Object.values(byProvider).forEach(models => models.forEach(m => all.add(m)))
    return Array.from(all).sort((a, b) => a.localeCompare(b))
  }, [data?.available_filters?.models_by_provider, filters.llmProvider])

  const showData = data && !error

  const resetFilters = () => {
    const isAlreadyDefault =
      filters.workflow === defaultFilters.workflow &&
      filters.fromLocal === defaultFilters.fromLocal &&
      filters.toLocal === defaultFilters.toLocal &&
      filters.bucket === defaultFilters.bucket &&
      filters.includeSplitView === defaultFilters.includeSplitView &&
      filters.llmProvider === defaultFilters.llmProvider &&
      filters.llmModel === defaultFilters.llmModel

    if (isAlreadyDefault) {
      void refetch()
      return
    }

    setFilters(defaultFilters)
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="flowbot-evals-dashboard-screen">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
        <div>
          <div className="gba:text-lg gba:font-semibold">Flowbot evals analytics</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            KPIs, latency, tokens, error rate, tool usage and recent runs.
          </div>
          <div
            className="gba:flex gba:flex-wrap gba:gap-2 gba:pt-2"
            data-testid="flowbot-evals-dashboard-summary-chips"
          >
            <Badge variant="secondary" data-testid="flowbot-evals-dashboard-summary-range">
              {filters.fromLocal} → {filters.toLocal}
            </Badge>
            <Badge variant="secondary" data-testid="flowbot-evals-dashboard-summary-bucket">
              {filters.bucket}
            </Badge>
            <Badge
              variant={data?.include_split_view ? 'default' : 'outline'}
              data-testid="flowbot-evals-dashboard-summary-split-view"
            >
              Split-view: {data?.include_split_view ? 'on' : 'off'}
            </Badge>
            {!!filters.llmProvider.trim() && (
              <Badge variant="secondary" data-testid="flowbot-evals-dashboard-summary-provider">
                Provider: {filters.llmProvider.trim()}
              </Badge>
            )}
            {!!filters.llmModel.trim() && (
              <Badge variant="secondary" data-testid="flowbot-evals-dashboard-summary-model">
                Model: {filters.llmModel.trim()}
              </Badge>
            )}
            {!!filters.workflow.trim() && (
              <Badge variant="outline" data-testid="flowbot-evals-dashboard-summary-workflow">
                Workflow: {filters.workflow.trim()}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gba:gap-2"
          data-testid="flowbot-evals-dashboard-refresh"
        >
          <ArrowClockwiseIcon size={16} />
          Refresh
        </Button>
      </div>

      <DashboardFiltersCard
        filters={filters}
        setFilters={setFilters}
        onReset={resetFilters}
        workflowSuggestions={derivedWorkflowSuggestions}
        providerOptions={providerOptions}
        modelOptions={modelOptions}
        onQuick24h={() =>
          setFilters(prev => ({
            ...prev,
            fromLocal: todayDateInputValue(),
            toLocal: todayDateInputValue(),
            bucket: 'hour',
            llmProvider: '',
            llmModel: ''
          }))
        }
        onQuick7d={() =>
          setFilters(prev => ({
            ...prev,
            fromLocal: daysAgoDateInputValue(6),
            toLocal: todayDateInputValue(),
            bucket: 'day',
            llmProvider: '',
            llmModel: ''
          }))
        }
      />

      {!context.accessToken && (
        <Alert className="gba:w-full" data-testid="flowbot-evals-dashboard-missing-token">
          Access token missing. Open IDE Settings (top right) and paste a valid token, then refresh.
        </Alert>
      )}

      {error && (
        <Alert className="gba:w-full" data-testid="flowbot-evals-dashboard-error">
          Failed to load dashboard data. {error}
        </Alert>
      )}

      {isEmpty && (
        <Alert className="gba:w-full" data-testid="flowbot-evals-dashboard-empty">
          No eval runs found in the selected time range. Try expanding the date range (e.g. “Last 7d”) or clearing the
          workflow filter. If you expect split-view runs, enable “Show technical split-view runs”.
        </Alert>
      )}

      {isLoading && !data && <DashboardLoading />}

      {showData && (
        <div className="gba:space-y-6">
          <KpiCards cards={data.cards} />
          <DistributionStats distributions={data.distributions} />
          {!!data.token_breakdown && <TokenBreakdown tokenBreakdown={data.token_breakdown} />}
          <RawWorkflowNames recentRuns={data.recent_runs} topCostRuns={data.top_cost_runs} />
          <WorkflowComparison recentRuns={data.recent_runs} topCostRuns={data.top_cost_runs} />
          <TimeseriesCharts points={data.timeseries} />
          <BreakdownCharts errorBreakdown={data.error_breakdown} toolBreakdown={data.tool_breakdown} />
          {!!data.tool_token_stats?.length && <ToolTokenStats stats={data.tool_token_stats} />}
          <RunsTables topCostRuns={data.top_cost_runs} recentRuns={data.recent_runs} />
        </div>
      )}
    </div>
  )
}

export default FlowbotEvalsDashboard
