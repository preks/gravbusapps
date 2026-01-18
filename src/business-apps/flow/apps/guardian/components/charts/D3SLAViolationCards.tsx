import React, { useEffect, useState, useCallback } from 'react'
import { Alert, Badge, Progress, Card } from '@newwork/nw-design-system'
import { GuardianFilter } from '../../types/guardianTypes'

interface SLAViolation {
  id: string
  flowName: string
  stepName: string
  department: string
  violationRate: number
  avgOverdueHours: number
  totalTasks: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  trend: 'improving' | 'worsening' | 'stable'
}

interface D3SLAViolationCardsProps {
  workflowData: any
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  isRealTime: boolean
  onError: (error: string) => void
  prefixDataTestId: string
  grouping?: 'flow' | 'task'
  theme?: 'light' | 'dark'
}

export const D3SLAViolationCards: React.FC<D3SLAViolationCardsProps> = ({
  workflowData,
  dimensions,
  filters,
  isRealTime,
  onError,
  prefixDataTestId,
  grouping = 'flow',
  theme = 'dark'
}) => {
  const [violations, setViolations] = useState<SLAViolation[]>([])
  const [highlightedViolations, setHighlightedViolations] = useState<Set<string>>(new Set())

  const isDark = theme === 'dark'

  // Extract and transform SLA violations data
  const extractViolations = useCallback((data: any): SLAViolation[] => {
    const analytics = data?.analytics || {}
    const slaKillers = analytics.flowManagement?.slaKillers || []

    const realViolations = slaKillers.map((killer: any, index: number) => ({
      id: `real-violation-${index}`,
      flowName: killer.flow_name || 'Unknown Flow',
      stepName: killer.step_name || 'Unknown Step',
      // Do not invent departments; use real fields when present.
      department: killer.department || killer.orgUnit || '—',
      violationRate: killer.violation_rate || 0,
      avgOverdueHours: killer.avg_overdue_hours || 0,
      totalTasks: killer.total_tasks || 0,
      severity:
        killer.violation_rate > 50
          ? 'critical'
          : killer.violation_rate > 30
            ? 'high'
            : killer.violation_rate > 15
              ? 'medium'
              : 'low',
      trend:
        killer.violation_rate > 50 ? 'worsening' : killer.violation_rate < 15 ? 'improving' : ('stable' as const)
    }))

    return realViolations.slice(0, 8)
  }, [])

  // Get severity color and styling
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          color: '#ef4444',
          bgColor: isDark ? '#1a0f12' : '#fef2f2',
          borderColor: isDark ? '#7f1d1d' : '#fecaca',
          badge: 'destructive' as const,
          icon: '🚨'
        }
      case 'high':
        return {
          color: '#f59e0b',
          bgColor: isDark ? '#1a1308' : '#fffbeb',
          borderColor: isDark ? '#7c2d12' : '#fed7aa',
          badge: 'secondary' as const,
          icon: '⚠️'
        }
      case 'medium':
        return {
          color: '#eab308',
          bgColor: isDark ? '#171407' : '#fefce8',
          borderColor: isDark ? '#6b5d12' : '#fde047',
          badge: 'outline' as const,
          icon: '⚡'
        }
      case 'low':
        return {
          color: '#10b981',
          bgColor: isDark ? '#0c1a15' : '#f0fdf4',
          borderColor: isDark ? '#14532d' : '#bbf7d0',
          badge: 'outline' as const,
          icon: '✅'
        }
      default:
        return {
          color: isDark ? '#9ca3af' : '#6b7280',
          bgColor: isDark ? '#111827' : '#f9fafb',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          badge: 'secondary' as const,
          icon: '📊'
        }
    }
  }

  // Get trend styling
  const getTrendConfig = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { color: '#10b981', icon: '📈', text: 'Improving' }
      case 'worsening':
        return { color: '#ef4444', icon: '📉', text: 'Worsening' }
      case 'stable':
        return { color: '#6b7280', icon: '➡️', text: 'Stable' }
      default:
        return { color: '#6b7280', icon: '📊', text: 'Unknown' }
    }
  }

  // Pulse effect for critical violations
  useEffect(() => {
    if (!isRealTime) return

    const criticalViolations = violations.filter(v => v.severity === 'critical').map(v => v.id)

    setHighlightedViolations(new Set(criticalViolations))

    const interval = setInterval(() => {
      setHighlightedViolations(prev => {
        const newSet = new Set(prev)
        criticalViolations.forEach(id => {
          if (newSet.has(id)) {
            newSet.delete(id)
          } else {
            newSet.add(id)
          }
        })
        return newSet
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [violations, isRealTime])

  // Update violations when data changes
  useEffect(() => {
    if (workflowData) {
      try {
        const newViolations = extractViolations(workflowData)
        setViolations(newViolations)
      } catch (error) {
        console.error('Error extracting SLA violations:', error)
        onError('Failed to extract SLA violation data')
      }
    }
  }, [workflowData, extractViolations, onError])

  if (violations.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          background: isDark ? 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)' : undefined
        }}
        data-testid={`${prefixDataTestId}-empty-state`}
      >
        <div style={{ fontSize: '48px' }}>🎉</div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#10b981', margin: 0, marginBottom: '8px' }}>No SLA Violations</h3>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280', margin: 0 }}>
            All workflows are meeting their SLA targets
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        padding: '16px',
        overflow: 'auto',
        background: isDark ? 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)' : undefined
      }}
      data-testid={`${prefixDataTestId}-sla-violations`}
    >
      {/* Summary Alert */}
      <Alert
        variant={isDark ? 'default' : 'destructive'}
        style={{
          marginBottom: '16px',
          backgroundColor: isDark ? '#111827' : undefined,
          color: isDark ? '#e5e7eb' : undefined,
          border: isDark ? '1px solid #374151' : undefined
        }}
        data-testid={`${prefixDataTestId}-summary-alert`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{violations.filter(v => v.severity === 'critical').length} Critical Issues Found</strong>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              {violations.reduce((sum, v) => sum + v.totalTasks, 0)} tasks affected across {violations.length} processes
            </div>
          </div>
          {isRealTime && (
            <Badge variant="outline" style={{ color: '#10b981', borderColor: '#10b981' }}>
              🔴 LIVE
            </Badge>
          )}
        </div>
      </Alert>

      {/* Violation Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}
      >
        {violations.map(violation => {
          const severityConfig = getSeverityConfig(violation.severity)
          const trendConfig = getTrendConfig(violation.trend)
          const isHighlighted = highlightedViolations.has(violation.id)

          return (
            <Card
              key={violation.id}
              style={{
                borderColor: severityConfig.borderColor,
                backgroundColor: severityConfig.bgColor,
                transition: 'all 0.3s ease',
                transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHighlighted ? `0 8px 25px rgba(239, 68, 68, 0.15)` : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              data-testid={`${prefixDataTestId}-violation-${violation.id}`}
            >
              <div style={{ padding: '16px' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{severityConfig.icon}</span>
                      <h4
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: isDark ? '#e5e7eb' : '#1f2937',
                          margin: 0
                        }}
                      >
                        {grouping === 'task' ? violation.stepName : violation.flowName}
                      </h4>
                    </div>
                    <p
                      style={{
                        fontSize: '14px',
                        color: isDark ? '#9ca3af' : '#6b7280',
                        margin: 0
                      }}
                    >
                      {grouping === 'task' ? `${violation.flowName}` : `${violation.stepName}`} • {violation.department}
                    </p>
                  </div>
                  <Badge variant={severityConfig.badge}>{violation.severity.toUpperCase()}</Badge>
                </div>

                {/* Violation Rate Progress */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: isDark ? '#e5e7eb' : '#374151' }}>
                      Violation Rate
                    </span>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: severityConfig.color
                      }}
                    >
                      {violation.violationRate}%
                    </span>
                  </div>
                  <Progress
                    value={violation.violationRate}
                    style={{
                      height: '8px',
                      backgroundColor: isDark ? '#374151' : '#f3f4f6'
                    }}
                  />
                </div>

                {/* Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: isDark ? '#e5e7eb' : '#374151' }}>
                      {violation.avgOverdueHours}h
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Avg Overdue</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: isDark ? '#e5e7eb' : '#374151' }}>
                      {violation.totalTasks}
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Total Tasks</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: trendConfig.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{trendConfig.icon}</span>
                      <span>{trendConfig.text}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Trend</div>
                  </div>
                </div>

                {/* Action Needed Indicator */}
                {violation.severity === 'critical' && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isDark ? '#1a0f12' : '#fef2f2',
                      border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#dc2626'
                      }}
                    >
                      🚨 IMMEDIATE ACTION REQUIRED
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Footer Summary */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: isDark ? '#111827' : '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
              {violations.filter(v => v.severity === 'critical').length}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Critical</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
              {violations.filter(v => v.severity === 'high').length}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>High</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#eab308' }}>
              {violations.filter(v => v.severity === 'medium').length}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Medium</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
              {violations.filter(v => v.severity === 'low').length}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Low</div>
          </div>
        </div>
      </div>
    </div>
  )
}
