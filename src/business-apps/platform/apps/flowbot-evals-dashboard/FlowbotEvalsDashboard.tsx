import { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FunnelIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
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
import type { BucketGranularity } from './types'

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
      includeSplitView: false
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

  const showData = data && !error

  const resetFilters = () => {
    const isAlreadyDefault =
      filters.workflow === defaultFilters.workflow &&
      filters.fromLocal === defaultFilters.fromLocal &&
      filters.toLocal === defaultFilters.toLocal &&
      filters.bucket === defaultFilters.bucket &&
      filters.includeSplitView === defaultFilters.includeSplitView

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

      <Card data-testid="flowbot-evals-dashboard-filters">
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
          <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
            <FunnelIcon size={16} />
            Filters
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="flowbot-evals-dashboard-reset-filters">
            Reset
          </Button>
        </CardHeader>
        <CardContent className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-4">
          <div className="gba:space-y-2">
            <Label htmlFor="flowbot-evals-workflow">Workflow (optional)</Label>
            <Input
              id="flowbot-evals-workflow"
              value={filters.workflow}
              onChange={e => setFilters(prev => ({ ...prev, workflow: e.target.value }))}
              placeholder="e.g. Controller Agent (stream)"
              data-testid="flowbot-evals-dashboard-filter-workflow"
            />
            {derivedWorkflowSuggestions.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {derivedWorkflowSuggestions.slice(0, 6).map(w => (
                  <Button
                    key={w}
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters(prev => ({ ...prev, workflow: w }))}
                    className="gba:h-7 gba:px-2 gba:text-xs"
                    data-testid={`flowbot-evals-dashboard-suggest-workflow-${encodeURIComponent(w)}`}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="flowbot-evals-from">From</Label>
            <Input
              id="flowbot-evals-from"
              type="date"
              value={filters.fromLocal}
              onChange={e => setFilters(prev => ({ ...prev, fromLocal: e.target.value }))}
              data-testid="flowbot-evals-dashboard-filter-from"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="flowbot-evals-to">To</Label>
            <Input
              id="flowbot-evals-to"
              type="date"
              value={filters.toLocal}
              onChange={e => setFilters(prev => ({ ...prev, toLocal: e.target.value }))}
              data-testid="flowbot-evals-dashboard-filter-to"
            />
          </div>

          <div className="gba:space-y-2">
            <Label>Bucket</Label>
            <Select
              value={filters.bucket}
              onValueChange={v => setFilters(prev => ({ ...prev, bucket: v as BucketGranularity }))}
            >
              <SelectTrigger data-testid="flowbot-evals-dashboard-filter-bucket">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">hour</SelectItem>
                <SelectItem value="day">day</SelectItem>
              </SelectContent>
            </Select>

            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters(prev => ({
                    ...prev,
                    fromLocal: todayDateInputValue(),
                    toLocal: todayDateInputValue(),
                    bucket: 'hour'
                  }))
                }
                data-testid="flowbot-evals-dashboard-quick-24h"
              >
                Last 24h
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters(prev => ({
                    ...prev,
                    // Inclusive 7-day window with toLocal +1 day at request time.
                    fromLocal: daysAgoDateInputValue(6),
                    toLocal: todayDateInputValue(),
                    bucket: 'day'
                  }))
                }
                data-testid="flowbot-evals-dashboard-quick-7d"
              >
                Last 7d
              </Button>
            </div>

            <div className="gba:flex gba:items-start gba:gap-2 gba:pt-2">
              <Checkbox
                id="flowbot-evals-include-split-view"
                checked={filters.includeSplitView}
                onCheckedChange={v => setFilters(prev => ({ ...prev, includeSplitView: v === true }))}
                data-testid="flowbot-evals-dashboard-filter-include-split-view"
              />
              <div className="gba:space-y-1">
                <Label htmlFor="flowbot-evals-include-split-view" className="gba:text-sm">
                  Show technical split-view runs
                </Label>
                <div className="gba:text-xs gba:text-muted-foreground">
                  Includes split-view child rows that are normally hidden for business reporting.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
