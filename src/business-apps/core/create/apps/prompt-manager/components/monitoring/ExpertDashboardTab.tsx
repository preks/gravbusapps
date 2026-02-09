import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Spinner,
  useTranslation,
  type ChartConfig
} from '@newwork/nw-design-system'
import { Activity, AlertTriangle, CheckCircle2, Clock, Hammer, RefreshCw } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ExecutionRun, ExecutionTimeseriesPoint } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'
import { ExecutionDetailView } from './ExecutionDetailView'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'

const toStatusVariant = (status: string): 'success' | 'default' | 'destructive' | 'outline' => {
  if (status === 'success') return 'success'
  if (status === 'error') return 'destructive'
  if (status === 'running') return 'default'
  return 'outline'
}

export interface ExpertDashboardTabProps extends BusinessAppContextProps {
  promptId: string
}

const formatMs = (ms?: number | null): string => {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

// Semantic chart colors aligned with Badge variant hues
const SUCCESS_COLOR = 'hsl(142, 71%, 45%)' // green – matches success badge
const ERROR_COLOR = 'hsl(0, 72%, 51%)' // red – matches destructive badge
const RUNNING_COLOR = 'hsl(217, 91%, 60%)' // blue – matches info badge
const ACCENT_COLOR = 'hsl(217, 91%, 60%)' // blue – matches info badge for tools

export const ExpertDashboardTab: React.FC<ExpertDashboardTabProps> = ({ promptId, ...context }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(context.accessToken)

  const windowDays = '30'
  const [stats, setStats] = useState<{ total: number; success: number; error: number; running: number } | null>(null)
  const [runs, setRuns] = useState<ExecutionRun[]>([])
  const [series, setSeries] = useState<ExecutionTimeseriesPoint[]>([])
  const [seriesResolution, setSeriesResolution] = useState<string>('daily')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [visibleRunCount, setVisibleRunCount] = useState(3)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const PAGE_SIZE = 3

  const load = useCallback(async () => {
    setIsLoading(true)
    setVisibleRunCount(PAGE_SIZE)
    try {
      const days = Number(windowDays)
      const [s, r, ts] = await Promise.all([
        client.getExecutionStats({ promptId }),
        client.getExecutionRuns({ promptId, limit: 20, offset: 0, returnTotalRecords: true }),
        client.getExecutionTimeseries({ promptId, days, resolution: 'auto' })
      ])
      setStats(s)
      setRuns(r.data || [])
      setSeries(ts.data || [])
      setSeriesResolution(ts.resolution || 'daily')
    } catch {
      setStats(null)
      setRuns([])
      setSeries([])
      setSeriesResolution('daily')
    } finally {
      setIsLoading(false)
    }
  }, [client, promptId, windowDays])

  const loadMore = useCallback(async () => {
    const nextOffset = runs.length
    setIsLoadingMore(true)
    try {
      const r = await client.getExecutionRuns({ promptId, limit: 20, offset: nextOffset, returnTotalRecords: false })
      setRuns(prev => [...prev, ...(r.data || [])])
    } catch {
      // keep existing runs
    } finally {
      setIsLoadingMore(false)
    }
    setVisibleRunCount(prev => prev + PAGE_SIZE)
  }, [client, promptId, runs.length])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const openDetails = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId)
  }, [])

  const closeDetails = useCallback(() => {
    setSelectedExecutionId(null)
  }, [])

  const successRate = useMemo(() => {
    if (!stats) return null
    const denom = stats.success + stats.error
    if (denom <= 0) return null
    return Math.round((stats.success / denom) * 100)
  }, [stats])

  const avgDurationInfo = useMemo(() => {
    const nums = (runs || [])
      .map(r => r.durationMs)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (nums.length === 0) return { avg: null, count: 0 }
    return { avg: nums.reduce((a, b) => a + b, 0) / nums.length, count: nums.length }
  }, [runs])

  const last30 = useMemo(() => {
    const base = { total: 0, success: 0, error: 0, running: 0, toolCalls: 0 }
    for (const p of series || []) {
      base.total += p.total || 0
      base.success += p.success || 0
      base.error += p.error || 0
      base.running += p.running || 0
      base.toolCalls += p.toolCalls || 0
    }
    return base
  }, [series])

  const trendChartConfig = useMemo(
    () =>
      ({
        total: { label: t('expert_dashboard_metric_total'), color: ACCENT_COLOR }
      }) satisfies ChartConfig,
    [t]
  )

  const statusDonutData = useMemo(() => {
    return [
      { status: 'success', value: last30.success },
      { status: 'error', value: last30.error },
      { status: 'running', value: last30.running }
    ].filter(i => i.value > 0)
  }, [last30.error, last30.running, last30.success])

  const statusDonutConfig = useMemo(
    () =>
      ({
        value: { label: 'Executions', color: 'none' },
        success: { label: t('monitoring-filter-status-success'), color: SUCCESS_COLOR },
        error: { label: t('monitoring-filter-status-error'), color: ERROR_COLOR },
        running: { label: t('monitoring-filter-status-running'), color: RUNNING_COLOR }
      }) satisfies ChartConfig,
    [t]
  )

  const successRate30 = useMemo(() => {
    const denom = last30.success + last30.error
    if (denom <= 0) return null
    return Math.round((last30.success / denom) * 100)
  }, [last30.error, last30.success])

  const visibleRuns = useMemo(() => runs.slice(0, visibleRunCount), [runs, visibleRunCount])
  const hasMoreRuns = visibleRunCount < runs.length || runs.length >= 20

  if (selectedExecutionId) {
    return <ExecutionDetailView {...context} executionId={selectedExecutionId} onBack={closeDetails} />
  }

  return (
    <div className="gba:space-y-4" data-testid="expert-dashboard-tab">
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-12 gba:gap-3" data-testid="expert-dashboard-metrics">
        <Card className="gba:md:col-span-3 gba:overflow-hidden gba:!bg-background">
          <CardContent className="gba:p-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('expert_dashboard_metric_total')}</div>
              <div className="gba:text-2xl gba:font-semibold gba:mt-1" data-testid="expert-dashboard-metric-total">
                {stats ? stats.total : '—'}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {t('expert_dashboard_metric_total_days', { count: last30.total, days: windowDays })}
              </div>
            </div>
            <div className="gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <Activity className="gba:h-5 gba:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="gba:md:col-span-3 gba:overflow-hidden gba:!bg-background">
          <CardContent className="gba:p-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('expert_dashboard_metric_success_rate')}</div>
              <div
                className="gba:text-2xl gba:font-semibold gba:mt-1"
                data-testid="expert-dashboard-metric-success-rate"
              >
                {successRate === null ? '—' : `${successRate}%`}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {successRate30 === null
                  ? '—'
                  : t('expert_dashboard_metric_success_rate_days', { percent: successRate30, days: windowDays })}
              </div>
            </div>
            <div className="gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="gba:md:col-span-3 gba:overflow-hidden gba:!bg-background">
          <CardContent className="gba:p-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('expert_dashboard_metric_avg_duration')}</div>
              <div
                className="gba:text-2xl gba:font-semibold gba:mt-1"
                data-testid="expert-dashboard-metric-avg-duration"
              >
                {avgDurationInfo.avg === null ? '—' : formatMs(avgDurationInfo.avg)}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {avgDurationInfo.count > 0
                  ? t('expert_dashboard_avg_duration_runs', { count: avgDurationInfo.count })
                  : t('expert_dashboard_last20_runs')}
              </div>
            </div>
            <div className="gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <Clock className="gba:h-5 gba:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="gba:md:col-span-3 gba:overflow-hidden gba:!bg-background">
          <CardContent className="gba:p-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('expert_dashboard_metric_running')}</div>
              <div className="gba:text-2xl gba:font-semibold gba:mt-1" data-testid="expert-dashboard-metric-running">
                {stats ? stats.running : '—'}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {t('expert_dashboard_metric_tool_calls_days', { count: last30.toolCalls, days: windowDays })}
              </div>
            </div>
            <div className="gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <Hammer className="gba:h-5 gba:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Recent Executions (2/3) | Status Donut (1/3) */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-12 gba:gap-3">
        <Card className="gba:md:col-span-8 gba:!bg-background gba:!p-4" data-testid="expert-dashboard-recent">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <span className="gba:text-sm gba:font-semibold">{t('expert_dashboard_recent_executions')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:w-7 gba:p-0"
              onClick={() => load()}
              data-testid="expert-dashboard-refresh"
              type="button"
            >
              <RefreshCw className={`gba:h-3.5 gba:w-3.5${isLoading ? ' gba:animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="gba:space-y-2">
            {runs.length === 0 ? (
              <div className="gba:text-sm gba:text-muted-foreground" data-testid="expert-dashboard-recent-empty">
                {t('expert_dashboard_recent_empty')}
              </div>
            ) : (
              <div className="gba:space-y-2" data-testid="expert-dashboard-recent-list">
                {visibleRuns.map(r => (
                  <button
                    key={r.executionId}
                    type="button"
                    onClick={() => openDetails(r.executionId)}
                    className="gba:w-full gba:text-left gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card gba:hover:bg-accent gba:transition-colors"
                    data-testid={`expert-dashboard-recent-row-${r.executionId}`}
                  >
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                        <Badge variant={toStatusVariant(r.status)}>{String(r.status)}</Badge>
                        {(r.tags || []).includes('execution:test') && (
                          <Badge variant="info" className="gba:text-[10px]">
                            {t('tag-execution-test')}
                          </Badge>
                        )}
                        <span className="gba:text-sm gba:font-medium">
                          {r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      <Badge variant="secondary">{formatMs(r.durationMs)}</Badge>
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {t('expert_dashboard_tool_calls', { count: r.toolCallsCount ?? 0 })}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasMoreRuns && (
              <div className="gba:pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (visibleRunCount < runs.length) {
                      setVisibleRunCount(prev => prev + PAGE_SIZE)
                    } else {
                      loadMore()
                    }
                  }}
                  disabled={isLoadingMore}
                  data-testid="expert-dashboard-load-more"
                  type="button"
                >
                  {isLoadingMore ? <Spinner size="sm" /> : t('expert_dashboard_load_more')}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="gba:md:col-span-4 gba:!bg-background">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm">
              {t('expert_dashboard_status_breakdown_title', { days: windowDays })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusDonutData.length === 0 ? (
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <AlertTriangle className="gba:h-4 gba:w-4 gba:mt-0.5" />
                <span>{t('expert_dashboard_status_breakdown_empty')}</span>
              </div>
            ) : (
              <div className="gba:h-[200px] gba:w-full">
                <ChartContainer config={statusDonutConfig} className="gba:h-full gba:w-full">
                  <PieChart>
                    <Pie
                      data={statusDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="status"
                      label
                      labelLine={false}
                    >
                      {statusDonutData.map((entry: any) => (
                        <Cell
                          key={`donut-${String(entry?.status || 'unknown')}`}
                          fill={`var(--color-${String(entry?.status || '')})`}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="status" />} />
                    <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Execution Trend (full width, bottom) */}
      <Card className="gba:!bg-background" data-testid="expert-dashboard-charts">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-sm">{t('expert_dashboard_trend_title', { days: windowDays })}</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <div className="gba:text-sm gba:text-muted-foreground">{t('expert_dashboard_chart_empty')}</div>
          ) : (
            <div className="gba:h-[220px] gba:w-full">
              <ChartContainer config={trendChartConfig} className="gba:h-full gba:w-full">
                <AreaChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    tickFormatter={v => {
                      if (typeof v !== 'string') return String(v)
                      // Hourly: "2026-02-05 14:00" → "14:00"
                      if (seriesResolution === 'hourly') return v.slice(11) || v
                      // Daily: "2026-02-05" → "02-05"
                      return v.slice(5)
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={t('expert_dashboard_metric_total')}
                    stroke="var(--color-total)"
                    fill="var(--color-total)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ExpertDashboardTab
