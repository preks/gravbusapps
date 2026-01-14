import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GuardianD3Visualization } from './components/GuardianD3Visualization'
// Using list-style dark SLA component
import { D3SLAViolationList } from './components/charts/D3SLAViolationList'
import { useGuardianData } from './hooks/useGuardianData'
import { GuardianViewMode, GuardianFilter } from './types/guardianTypes'
import { GuardianKPICard } from './components/GuardianKPICard'
import { FlowDetailView } from '../../common/components/flow-detail/FlowDetailView'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface GuardianProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const formatDurationFromMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes)) return '—'
  const rounded = Math.max(0, Math.round(minutes))
  if (rounded < 60) return `${rounded}m`

  const days = Math.floor(rounded / 1440)
  const hours = Math.floor((rounded % 1440) / 60)
  const mins = rounded % 60

  if (days > 0) return `${days}d${hours ? ` ${hours}h` : ''}`
  return `${hours}h${mins ? ` ${mins}m` : ''}`
}

const Guardian: React.FC<GuardianProps> = ({ accessToken, userInfo, prefixDataTestId = 'guardian' }) => {
  // Temporarily disable the network graph in the UI (implementation stays so we can re-enable later).
  const isNetworkGraphEnabled = false

  // State for visualization controls
  const [viewMode] = useState<GuardianViewMode>('force-directed')
  const [filters, setFilters] = useState<GuardianFilter>({
    showActiveWorkflows: true,
    showCompleted: false,
    showDepartments: true,
    showUsers: true,
    showCapabilities: false,
    showLocations: false,
    workflowStatuses: ['IN_PROGRESS', 'SCHEDULED'],
    timeRange: '7d',
    selectedDepartments: [],
    selectedWorkflowTemplates: [],
    selectedUsers: [],
    minNodeSize: 8,
    maxNodeSize: 25,
    showLabels: true,
    showAnimations: true,
    showDensityTrails: true,
    assignmentModes: ['CLAIM', 'ASSIGN'],
    taskStatuses: []
  })
  const [animationSpeed] = useState(1)
  const isRealTime = false
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [slaRiskPage, setSlaRiskPage] = useState(0)

  // Data hooks
  const { networkData, velocityInsights, auditData, isLoading, error, refetch } = useGuardianData({
    accessToken,
    viewMode,
    filters,
    isRealTime,
    userId: userInfo?.employeeDetails?.employeeId
  })

  const velocityChartData = useMemo(() => {
    const base = velocityInsights?.timeseries || []
    if (!base.length) return base

    const entries = (auditData?.entries || []) as any[]
    const upper = (v: any) => String(v || '').toUpperCase()
    const resolveAction = (e: any) => e.action || e.eventType || e.type || e.event || e.name || 'UNKNOWN'
    const resolveStatus = (e: any) =>
      e.status ||
      e.taskStatus ||
      e.details?.status ||
      e.details?.newStatus ||
      e.details?.toStatus ||
      e.details?.workflowStatus ||
      e.workflowStatus ||
      e.details?.task_conductor_status ||
      'UNKNOWN'

    const isFlowStartAction = (a: string) => /(^|_)(FLOW|WORKFLOW).*(START|CREAT)/.test(upper(a))
    const isFlowCompleteAction = (a: string) => /(^|_)(FLOW|WORKFLOW).*(COMPLETE|FINISH|DONE)/.test(upper(a))
    const isCompletionSignal = (e: any) => {
      const status = upper(resolveStatus(e))
      const action = upper(resolveAction(e))
      if (status === 'COMPLETED' || status === 'DONE') return true
      if (isFlowCompleteAction(action)) return true
      if (action.includes('COMPLETE')) return true
      if (upper(e.details?.workflowStatus) === 'COMPLETED') return true
      if (upper(e.workflowStatus) === 'COMPLETED') return true
      return false
    }

    const parsed = entries
      .map(e => ({
        e,
        flowId: String(e.flowId || e.rootWorkflowId || e.workflowId || 'unknown'),
        t: new Date(e.timestamp || e.createdAt || e.time || e.date || '').getTime()
      }))
      .filter(x => x.flowId !== 'unknown' && Number.isFinite(x.t))

    // Derive synthetic lifecycle timestamps per flow (matches what the timeline visualizes):
    // - start: first event timestamp per flow
    // - complete: last completion-like timestamp per flow (if any)
    const flowAgg = new Map<string, { start: number; complete?: number }>()
    for (const x of parsed) {
      const cur = flowAgg.get(x.flowId)
      if (!cur) {
        flowAgg.set(x.flowId, { start: x.t })
      } else {
        cur.start = Math.min(cur.start, x.t)
      }
      const action = String(resolveAction(x.e) || '')
      const alreadyHasStart = isFlowStartAction(action)
      if (alreadyHasStart) {
        const next = flowAgg.get(x.flowId)!
        next.start = Math.min(next.start, x.t)
      }
      if (isCompletionSignal(x.e)) {
        const next = flowAgg.get(x.flowId)!
        next.complete = Math.max(next.complete ?? 0, x.t)
      }
    }

    return base.map((b: any, idx: number) => {
      const start = new Date(b.bucketStart).getTime()
      const end =
        (b.bucketEnd ? new Date(b.bucketEnd).getTime() : undefined) ??
        (idx + 1 < base.length ? new Date((base[idx + 1] as any).bucketStart).getTime() : undefined) ??
        start + 24 * 60 * 60 * 1000

      let started = 0
      let completed = 0
      for (const v of flowAgg.values()) {
        if (v.start >= start && v.start < end) started += 1
        if (v.complete != null && v.complete >= start && v.complete < end) completed += 1
      }

      return {
        ...b,
        flowsStarted: started,
        flowsCompleted: completed
      }
    })
  }, [velocityInsights?.timeseries, auditData?.entries])

  const formatVelocityTooltipLabel = useCallback(
    (raw: any) => {
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return String(raw || '')

      const locale = getCurrentActiveUserLocale()
      const withTime = filters.timeRange === '1h' || filters.timeRange === '6h' || filters.timeRange === '24h'
      const fmt = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
      })
      return fmt.format(d)
    },
    [filters.timeRange]
  )

  const velocityTooltipContent = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null

      const allowedKeys = new Set(['flowsStarted', 'flowsCompleted', 'wipActive'])
      const rows = payload
        .filter((p: any) => allowedKeys.has(String(p.dataKey)))
        .map((p: any) => {
          const key = String(p.dataKey)
          const name =
            key === 'flowsStarted'
              ? 'Started'
              : key === 'flowsCompleted'
                ? 'Completed'
                : key === 'wipActive'
                  ? 'WIP'
                  : key
          const value = Number.isFinite(p.value) ? Math.round(Number(p.value)) : p.value
          return { name, value, color: p.color }
        })

      if (!rows.length) return null

      return (
        <div
          data-testid={`${prefixDataTestId}-velocity-tooltip`}
          className="gba:min-w-56 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-card-foreground"
        >
          <div className="gba:font-semibold gba:mb-2">{formatVelocityTooltipLabel(label)}</div>
          <div className="gba:grid gba:gap-1">
            {rows.map((r: any) => (
              <div key={r.name} className="gba:flex gba:justify-between gba:gap-3">
                <span className="gba:text-muted-foreground">{r.name}</span>
                <span>{String(r.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    [formatVelocityTooltipLabel, prefixDataTestId]
  )

  const handleFilterChange = useCallback((newFilters: Partial<GuardianFilter>) => {
    setFilters(prev => {
      const next = { ...prev, ...newFilters }
      // Guardrail: audit-based views are limited to 7 days max.
      if (next.timeRange !== '1h' && next.timeRange !== '6h' && next.timeRange !== '24h' && next.timeRange !== '7d') {
        next.timeRange = '7d' as any
      }
      return next
    })
  }, [])

  useEffect(() => {
    setSlaRiskPage(0)
  }, [velocityInsights?.slaRisk?.length])

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-error-container`} className="gba:relative gba:min-h-screen gba:p-6">
        {/* Fixed background so it never “runs out” when the platform scroll container is taller than the viewport */}
        <div
          aria-hidden="true"
          className="gba:fixed gba:inset-0 gba:z-0 gba:pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(11,15,25,0.92) 0%, rgba(17,24,39,0.96) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        <div className="gba:relative gba:z-10">
          <div className="gba:rounded-xl gba:border gba:border-border gba:bg-card/60 gba:backdrop-blur-md gba:p-6 gba:text-center">
            <h3 className="gba:text-destructive gba:font-semibold gba:mb-4">Error Loading Guardian Data</h3>
            <p className="gba:text-muted-foreground gba:mb-4">{error}</p>
            <Button onClick={refetch} data-testid={`${prefixDataTestId}-retry-button`}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      className="gba:relative gba:min-h-screen gba:p-6"
      style={{
        // Scoped DS token overrides (dark glass theme)
        // Surfaces
        ['--color-surface-primary' as any]: 'rgba(15,23,42,0.65)',
        ['--color-surface-secondary' as any]: 'rgba(30,41,59,0.55)',
        // Text
        ['--color-text-primary' as any]: '#e5e7eb',
        ['--color-text-secondary' as any]: '#9ca3af',
        // Accents (used by charts + KPI cards without hardcoding in JSX)
        ['--guardian-accent-blue' as any]: '#60a5fa',
        ['--guardian-accent-amber' as any]: '#f59e0b',
        ['--guardian-accent-purple' as any]: '#a78bfa',
        ['--guardian-accent-green' as any]: '#10b981',
        // Borders & shadows
        ['--color-border-default' as any]: 'rgba(148,163,184,0.12)',
        ['--shadow-md' as any]: '0 8px 24px rgba(0,0,0,0.35)',
        ['--shadow-lg' as any]: '0 12px 32px rgba(0,0,0,0.45)'
      }}
    >
      {/* Fixed background so it never “runs out” when the platform scroll container is taller than the viewport */}
      <div
        aria-hidden="true"
        className="gba:fixed gba:inset-0 gba:z-0 gba:pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(11,15,25,0.92) 0%, rgba(17,24,39,0.96) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="gba:relative gba:z-10">
        <Dialog open={Boolean(selectedFlowId)} onOpenChange={open => (!open ? setSelectedFlowId(null) : undefined)}>
          <DialogContent className="gba:max-w-6xl gba:h-[85vh] gba:overflow-hidden">
            <DialogHeader>
              <DialogTitle>Flow details</DialogTitle>
            </DialogHeader>
            <div className="gba:h-full gba:overflow-auto">
              {selectedFlowId && (
                <FlowDetailView
                  flowId={selectedFlowId}
                  accessToken={accessToken}
                  showBackButton={false}
                  onBack={() => setSelectedFlowId(null)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Header with Title */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div>
            <h1 className="gba:text-3xl gba:font-bold gba:text-foreground gba:mb-2">Guardian</h1>
            <p className="gba:text-muted-foreground">Visualize flows and organizational dependencies</p>
          </div>

          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground">Time Range:</span>
              <Select
                value={filters.timeRange}
                onValueChange={value => handleFilterChange({ timeRange: value as any })}
                data-testid={`${prefixDataTestId}-time-range-select`}
              >
                <SelectTrigger className="gba:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="gba:mt-6">
          {/* Velocity KPIs */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4 gba:mb-6">
            <GuardianKPICard
              title="Throughput/day"
              value={velocityInsights ? velocityInsights.overview.kpis.throughputPerDay : '—'}
              description="Completed workflows per day"
              color="var(--guardian-accent-blue)"
              trend="neutral"
              isLoading={isLoading && !velocityInsights}
              data-testid={`${prefixDataTestId}-kpi-throughput`}
            />
            <GuardianKPICard
              title="WIP (active)"
              value={velocityInsights ? velocityInsights.overview.kpis.wipActive : '—'}
              description="Workflows currently active"
              color="var(--guardian-accent-amber)"
              trend="neutral"
              isLoading={isLoading && !velocityInsights}
              data-testid={`${prefixDataTestId}-kpi-wip`}
            />
            <GuardianKPICard
              title="Median cycle"
              value={velocityInsights ? `${Math.round(velocityInsights.overview.kpis.cycleTimeMedianMinutes)}m` : '—'}
              description="Median end-to-end cycle time"
              color="var(--guardian-accent-purple)"
              trend="neutral"
              isLoading={isLoading && !velocityInsights}
              data-testid={`${prefixDataTestId}-kpi-cycle`}
            />
            <GuardianKPICard
              title="SLA adherence"
              value={velocityInsights ? `${Math.round(velocityInsights.overview.kpis.slaAdherencePercent)}%` : '—'}
              description={
                velocityInsights
                  ? `${velocityInsights.overview.kpis.slaBreaches} breaches in window`
                  : 'SLA breaches in selected window'
              }
              color="var(--guardian-accent-green)"
              trend="neutral"
              isLoading={isLoading && !velocityInsights}
              data-testid={`${prefixDataTestId}-kpi-sla`}
            />
          </div>

          {/* Velocity trends */}
          <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:mb-6">
            <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Velocity trends</h3>
              <p className="gba:text-sm gba:text-muted-foreground">Flows started vs completed and WIP over time</p>
            </div>
            <div className="gba:h-80 gba:p-3">
              {velocityInsights?.timeseries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocityChartData as any}>
                    <XAxis
                      dataKey="bucketStart"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      tickFormatter={v => new Date(v).toLocaleDateString()}
                    />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <Tooltip content={velocityTooltipContent} />
                    <Line
                      type="monotone"
                      dataKey="flowsStarted"
                      stroke="var(--guardian-accent-purple)"
                      dot={false}
                      name="Started"
                    />
                    <Line
                      type="monotone"
                      dataKey="flowsCompleted"
                      stroke="var(--guardian-accent-green)"
                      dot={false}
                      name="Completed"
                    />
                    <Line
                      type="monotone"
                      dataKey="wipActive"
                      stroke="var(--guardian-accent-amber)"
                      dot={false}
                      name="WIP"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="gba:text-muted-foreground gba:p-3">No velocity timeseries data available.</div>
              )}
            </div>
          </div>

          {/* Timeline (full width); Network graph temporarily hidden */}
          <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:mb-6">
            <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Timeline</h3>
              <p className="gba:text-sm gba:text-muted-foreground">
                Audit events over time, grouped by action/state, colored by outcome
                (started/in-progress/completed/failed)
              </p>
            </div>

            <div className="gba:h-[600px] gba:relative">
              <GuardianD3Visualization
                networkData={networkData}
                auditData={auditData}
                viewMode="timeline"
                filters={filters}
                animationSpeed={animationSpeed}
                isLoading={isLoading}
                isRealTime={isRealTime}
                prefixDataTestId={`${prefixDataTestId}-timeline`}
              />
            </div>
          </div>

          {isNetworkGraphEnabled && (
            <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:mb-6">
              <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Network</h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  People + teams graph, sized by activity; edges show department/reporting relationships
                </p>
              </div>
              <div className="gba:h-[520px]">
                <GuardianD3Visualization
                  networkData={networkData}
                  auditData={auditData}
                  viewMode="force-directed"
                  filters={filters}
                  animationSpeed={animationSpeed}
                  isLoading={isLoading}
                  isRealTime={isRealTime}
                  prefixDataTestId={`${prefixDataTestId}-force-directed`}
                />
              </div>
            </div>
          )}

          {/* Bottlenecks */}
          <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:mb-6">
            <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Bottlenecks</h3>
              <p className="gba:text-sm gba:text-muted-foreground">Current steps with the highest time-in-step</p>
            </div>
            <div className="gba:p-3 gba:text-foreground">
              {velocityInsights?.bottlenecks?.length ? (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                  {velocityInsights.bottlenecks.slice(0, 10).map(b => (
                    <div
                      key={b.key}
                      className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border gba:bg-card/30"
                    >
                      <div className="gba:min-w-0">
                        <div className="gba:font-medium gba:truncate">{b.stepName}</div>
                        <div className="gba:text-xs gba:text-gray-400 gba:truncate">
                          {b.templateName || b.templateId} • {b.affectedCount} tasks
                        </div>
                      </div>
                      <div className="gba:text-right gba:shrink-0">
                        <div className="gba:font-semibold">{formatDurationFromMinutes(b.avgTimeInStepMinutes)}</div>
                        <div className="gba:text-xs gba:text-gray-400">avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:text-muted-foreground">No bottleneck data available.</div>
              )}
            </div>
          </div>

          {/* SLA section (dedicated at bottom) */}
          <div className="gba:mt-2">
            <div className="gba:mb-3">
              <h3 className="gba:text-lg gba:font-bold gba:text-foreground">SLA</h3>
              <p className="gba:text-sm gba:text-muted-foreground">Risk queue + violations</p>
            </div>

            <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
              {/* SLA violations - flow */}
              <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
                <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Violations (Flows)</h3>
                  <p className="gba:text-sm gba:text-muted-foreground">Worst offending flows</p>
                </div>
                <div className="gba:p-3">
                  <D3SLAViolationList
                    workflowData={networkData?.metadata}
                    dimensions={{ width: 600, height: 420 }}
                    filters={filters}
                    prefixDataTestId={`${prefixDataTestId}-sla-violations-flows`}
                    grouping="flow"
                    pageSize={5}
                  />
                </div>
              </div>

              {/* SLA violations - task */}
              <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
                <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Violations (Tasks)</h3>
                  <p className="gba:text-sm gba:text-muted-foreground">Steps with the highest risk</p>
                </div>
                <div className="gba:p-3">
                  <D3SLAViolationList
                    workflowData={networkData?.metadata}
                    dimensions={{ width: 600, height: 420 }}
                    filters={filters}
                    prefixDataTestId={`${prefixDataTestId}-sla-violations-tasks`}
                    grouping="task"
                    pageSize={5}
                  />
                </div>
              </div>

              {/* SLA risk (beneath violations) */}
              <div className="gba:lg:col-span-2 gba:relative gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
                <div className="gba:p-4 gba:border-b gba:border-border gba:bg-card/30">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">SLA risk</h3>
                  <p className="gba:text-sm gba:text-muted-foreground">Due soon / overdue</p>
                </div>
                <div className="gba:p-3 gba:text-foreground">
                  {(() => {
                    const all = velocityInsights?.slaRisk || []
                    const pageSize = 5
                    const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
                    const pageIndex = Math.min(Math.max(0, slaRiskPage), totalPages - 1)
                    const pageItems = all.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

                    if (!all.length) {
                      return <div className="gba:text-muted-foreground">No at-risk flows found.</div>
                    }

                    return (
                      <>
                        <div className="gba:space-y-2">
                          {pageItems.map(item => (
                            <div
                              key={item.flowId}
                              className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border gba:bg-card/30"
                            >
                              <div className="gba:min-w-0">
                                <Button
                                  type="button"
                                  variant="link"
                                  onClick={() => setSelectedFlowId(item.flowId)}
                                  className="gba:p-0 gba:h-auto gba:justify-start gba:text-left gba:font-medium gba:truncate"
                                  data-testid={`${prefixDataTestId}-sla-risk-open-flow-${item.flowId}`}
                                >
                                  {item.templateName || item.templateId || 'Flow'} • {item.flowId.slice(-8)}
                                </Button>
                                <div className="gba:text-xs gba:text-gray-400 gba:truncate">
                                  {item.stepName || '—'} • {item.reasons?.[0]?.message || '—'}
                                </div>
                              </div>
                              <div className="gba:text-right gba:shrink-0">
                                <div className="gba:font-semibold">{Math.round(item.riskScore)}</div>
                                <div className="gba:text-xs gba:text-gray-400">risk</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {all.length > pageSize ? (
                          <div className="gba:flex gba:items-center gba:justify-between gba:mt-3">
                            <div className="gba:text-xs gba:text-muted-foreground">
                              Page {pageIndex + 1}/{totalPages} • {all.length} total
                            </div>
                            <div className="gba:flex gba:gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSlaRiskPage(p => Math.max(0, p - 1))}
                                disabled={pageIndex === 0}
                                data-testid={`${prefixDataTestId}-sla-risk-prev-page`}
                              >
                                Prev
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSlaRiskPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={pageIndex >= totalPages - 1}
                                data-testid={`${prefixDataTestId}-sla-risk-next-page`}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Guardian
