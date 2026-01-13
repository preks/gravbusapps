import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GuardianD3Visualization } from './components/GuardianD3Visualization'
import { GuardianStatistics } from './components/GuardianStatistics'
// Using list-style dark SLA component
import { D3SLAViolationList } from './components/charts/D3SLAViolationList'
import { useGuardianData } from './hooks/useGuardianData'
import { GuardianViewMode, GuardianFilter } from './types/guardianTypes'
import { GuardianKPICard } from './components/GuardianKPICard'
import { FlowDetailView } from '../../common/components/flow-detail/FlowDetailView'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

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
  const [isRealTime, setIsRealTime] = useState(false) // Start with real-time disabled to prevent constant re-renders
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [slaRiskPage, setSlaRiskPage] = useState(0)

  // Data hooks
  const { networkData, statistics, velocityInsights, auditData, isLoading, error, refetch } = useGuardianData({
    accessToken,
    viewMode,
    filters,
    isRealTime,
    userId: userInfo?.employeeDetails?.employeeId
  })

  const handleFilterChange = useCallback((newFilters: Partial<GuardianFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  useEffect(() => {
    setSlaRiskPage(0)
  }, [velocityInsights?.slaRisk?.length])

  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-error-container`}
        style={{
          background: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <h3 style={{ color: '#fca5a5', marginBottom: '16px' }}>Error Loading Guardian Data</h3>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>{error}</p>
          <Button onClick={refetch} data-testid={`${prefixDataTestId}-retry-button`}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(11,15,25,0.92) 0%, rgba(17,24,39,0.96) 100%), url('/src/assets/images/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px',
        // Scoped DS token overrides (dark glass theme)
        // Surfaces
        ['--color-surface-primary' as any]: 'rgba(15,23,42,0.65)',
        ['--color-surface-secondary' as any]: 'rgba(30,41,59,0.55)',
        // Text
        ['--color-text-primary' as any]: '#e5e7eb',
        ['--color-text-secondary' as any]: '#9ca3af',
        // Borders & shadows
        ['--color-border-default' as any]: 'rgba(148,163,184,0.12)',
        ['--shadow-md' as any]: '0 8px 24px rgba(0,0,0,0.35)',
        ['--shadow-lg' as any]: '0 12px 32px rgba(0,0,0,0.45)'
      }}
    >
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

      {/* Header with Title and Real-time Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#e5e7eb',
              margin: 0,
              marginBottom: '8px'
            }}
          >
            Guardian
          </h1>
          <p
            style={{
              color: '#9ca3af',
              fontSize: '16px',
              margin: 0
            }}
          >
            Visualize flows and organizational dependencies
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Time Range:</span>
            <Select
              value={filters.timeRange}
              onValueChange={value => handleFilterChange({ timeRange: value as any })}
              data-testid={`${prefixDataTestId}-time-range-select`}
            >
              <SelectTrigger
                style={{ width: '140px', background: '#0f172a', color: '#e5e7eb', borderColor: '#374151' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Real-time</span>
            <Switch
              checked={isRealTime}
              onCheckedChange={setIsRealTime}
              data-testid={`${prefixDataTestId}-realtime-toggle`}
            />
          </div>
        </div>
      </div>

      <div className="gba:mt-6">
        {/* Velocity KPIs */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4 gba:mb-6">
          {velocityInsights ? (
            <>
              <GuardianKPICard
                title="Throughput/day"
                value={velocityInsights.overview.kpis.throughputPerDay}
                description="Completed workflows per day"
                color="#60a5fa"
                trend="neutral"
              />
              <GuardianKPICard
                title="WIP (active)"
                value={velocityInsights.overview.kpis.wipActive}
                description="Workflows currently active"
                color="#f59e0b"
                trend="neutral"
              />
              <GuardianKPICard
                title="Median cycle"
                value={`${Math.round(velocityInsights.overview.kpis.cycleTimeMedianMinutes)}m`}
                description="Median end-to-end cycle time"
                color="#a78bfa"
                trend="neutral"
              />
              <GuardianKPICard
                title="SLA adherence"
                value={`${Math.round(velocityInsights.overview.kpis.slaAdherencePercent)}%`}
                description={`${velocityInsights.overview.kpis.slaBreaches} breaches in window`}
                color="#10b981"
                trend="neutral"
              />
            </>
          ) : (
            <GuardianStatistics
              statistics={statistics}
              isLoading={isLoading}
              prefixDataTestId={`${prefixDataTestId}-top-metrics`}
            />
          )}
        </div>

        {/* Velocity trends */}
        <div
          style={{
            position: 'relative',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
              background: 'rgba(15,23,42,0.3)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
              Velocity trends
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Throughput, WIP and cycle time over time</p>
          </div>
          <div style={{ height: '320px', padding: '12px' }}>
            {velocityInsights?.timeseries?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityInsights.timeseries}>
                  <XAxis
                    dataKey="bucketStart"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={v => new Date(v).toLocaleDateString()}
                  />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)' }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="throughputCompleted" stroke="#60a5fa" dot={false} name="Throughput" />
                  <Line type="monotone" dataKey="wipActive" stroke="#f59e0b" dot={false} name="WIP" />
                  <Line
                    type="monotone"
                    dataKey="cycleTimeMedianMinutes"
                    stroke="#a78bfa"
                    dot={false}
                    name="Median cycle (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#9ca3af', padding: '12px' }}>No velocity timeseries data available.</div>
            )}
          </div>
        </div>

          {/* Network + Timeline (integrated into main tab) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px'
            }}
          >
            {/* Timeline */}
            <div
              style={{
                position: 'relative',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                  background: 'rgba(15,23,42,0.3)'
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                  Timeline
                </h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                  Audit events over time, grouped by action/state, colored by outcome (started/in-progress/completed/failed)
                </p>
              </div>
              <div style={{ height: '520px', position: 'relative' }}>
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

            {/* Network */}
            <div
              style={{
                position: 'relative',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                  background: 'rgba(15,23,42,0.3)'
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                  Network
                </h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                  People + teams graph, sized by activity; edges show department/reporting relationships
                </p>
              </div>
              <div style={{ height: '520px' }}>
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
          </div>

          {/* Bottlenecks */}
          <div
            style={{
              position: 'relative',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                background: 'rgba(15,23,42,0.3)'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                Bottlenecks
              </h3>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Current steps with the highest time-in-step</p>
            </div>
            <div style={{ padding: '12px', color: '#e5e7eb' }}>
              {velocityInsights?.bottlenecks?.length ? (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                  {velocityInsights.bottlenecks.slice(0, 10).map(b => (
                    <div
                      key={b.key}
                      className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:p-3 gba:rounded-lg"
                      style={{ background: 'rgba(15,23,42,0.35)', border: '1px solid rgba(148,163,184,0.12)' }}
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
                <div style={{ color: '#9ca3af' }}>No bottleneck data available.</div>
              )}
            </div>
          </div>

          {/* SLA section (dedicated at bottom) */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#e5e7eb', margin: 0 }}>SLA</h3>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Risk queue + violations</p>
            </div>

            <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
              {/* SLA violations - flow */}
              <div
                style={{
                  position: 'relative',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                    background: 'rgba(15,23,42,0.3)'
                  }}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                    Violations (Flows)
                  </h3>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Worst offending flows</p>
                </div>
                <div style={{ padding: '12px' }}>
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
              <div
                style={{
                  position: 'relative',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                    background: 'rgba(15,23,42,0.3)'
                  }}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                    Violations (Tasks)
                  </h3>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Steps with the highest risk</p>
                </div>
                <div style={{ padding: '12px' }}>
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
              <div
                className="gba:lg:col-span-2"
                style={{
                  position: 'relative',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                    background: 'rgba(15,23,42,0.3)'
                  }}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
                    SLA risk
                  </h3>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Due soon / overdue</p>
                </div>
                <div style={{ padding: '12px', color: '#e5e7eb' }}>
                  {(() => {
                    const all = velocityInsights?.slaRisk || []
                    const pageSize = 5
                    const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
                    const pageIndex = Math.min(Math.max(0, slaRiskPage), totalPages - 1)
                    const pageItems = all.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

                    if (!all.length) {
                      return <div style={{ color: '#9ca3af' }}>No at-risk flows found.</div>
                    }

                    return (
                      <>
                        <div className="gba:space-y-2">
                          {pageItems.map(item => (
                        <div
                          key={item.flowId}
                          className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:p-3 gba:rounded-lg"
                          style={{ background: 'rgba(15,23,42,0.35)', border: '1px solid rgba(148,163,184,0.12)' }}
                        >
                          <div className="gba:min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedFlowId(item.flowId)}
                              className="gba:text-left gba:font-medium gba:underline gba:truncate"
                              style={{ color: '#60a5fa' }}
                            >
                              {item.templateName || item.templateId || 'Flow'} • {item.flowId.slice(-8)}
                            </button>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <div style={{ color: '#9ca3af', fontSize: 12 }}>
                              Page {pageIndex + 1}/{totalPages} • {all.length} total
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setSlaRiskPage(p => Math.max(0, p - 1))}
                                disabled={pageIndex === 0}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148, 163, 184, 0.2)',
                                  background: pageIndex === 0 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.45)',
                                  color: pageIndex === 0 ? '#6b7280' : '#e5e7eb',
                                  cursor: pageIndex === 0 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlaRiskPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={pageIndex >= totalPages - 1}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148, 163, 184, 0.2)',
                                  background:
                                    pageIndex >= totalPages - 1 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.45)',
                                  color: pageIndex >= totalPages - 1 ? '#6b7280' : '#e5e7eb',
                                  cursor: pageIndex >= totalPages - 1 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                Next
                              </button>
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
  )
}

export default Guardian
