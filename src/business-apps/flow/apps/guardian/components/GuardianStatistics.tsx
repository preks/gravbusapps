import React from 'react'
import { GuardianKPICard } from './GuardianKPICard'
import { GuardianStatistics as GuardianStatisticsType } from '../types/guardianTypes'

interface GuardianStatisticsProps {
  statistics: GuardianStatisticsType | null
  isLoading?: boolean
  prefixDataTestId: string
}

export const GuardianStatistics: React.FC<GuardianStatisticsProps> = ({
  statistics,
  isLoading = false,
  prefixDataTestId
}) => {
  if (!statistics && !isLoading) {
    return null
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatPercentage = (rate: number): string => {
    return `${Math.round(rate * 100)}%`
  }

  // Extract real backend metrics
  const totalWorkflows = statistics?.overview.totalWorkflows || 0
  const activeWorkflows = statistics?.overview.activeWorkflows || 0
  const completedToday = statistics?.overview.completedToday || 0
  const avgCompletionTime = statistics?.overview.averageCompletionTime || 0
  const totalUsers = statistics?.organizational.totalUsers || 0
  const activeDepartments = statistics?.organizational.activeDepartments || 0
  const currentlyActive = statistics?.realtime.currentlyActive || 0

  // Calculate system health from real workflow completion data
  const dailyCompletionRate = totalWorkflows > 0 ? (completedToday / totalWorkflows) * 100 : 0
  const avgTimeEfficiency = avgCompletionTime > 0 ? Math.max(0, 100 - avgCompletionTime / 480) : 100 // 8 hour SLA baseline
  const taskLoadBalance = totalUsers > 0 ? Math.max(0, 100 - (activeWorkflows / totalUsers) * 5) : 100 // 20 tasks per user max
  const systemHealth = Math.round(dailyCompletionRate * 0.3 + avgTimeEfficiency * 0.5 + taskLoadBalance * 0.2)

  // Calculate SLA compliance from actual completion times vs SLA targets
  const slaTargetMinutes = 240 // 4-hour SLA target
  const slaCompliance =
    avgCompletionTime > 0
      ? Math.round(Math.max(0, Math.min(100, 100 - ((avgCompletionTime - slaTargetMinutes) / slaTargetMinutes) * 100)))
      : 100

  // Count critical issues from real backend data
  const bottleneckStepsArray = statistics?.workflow.bottleneckSteps || []
  const avgBottleneckTime =
    bottleneckStepsArray.length > 0
      ? bottleneckStepsArray.reduce((sum, step) => sum + step.averageTimeInStep, 0) / bottleneckStepsArray.length
      : 0
  const severeBottlenecks = bottleneckStepsArray.filter(step => step.averageTimeInStep > 300).length // >5 hours
  const criticalIssues = severeBottlenecks + (avgBottleneckTime > 240 ? 1 : 0) // Add 1 if avg bottleneck > 4h

  // Main KPI cards (top 4)
  const mainKPIs: Array<{
    title: string
    value: string | number
    description: string
    color: string
    trend: 'up' | 'down' | 'neutral'
  }> = [
    {
      title: 'System Health',
      value: `${systemHealth}%`,
      description: `Completion ${Math.round(dailyCompletionRate)}%, efficiency ${Math.round(avgTimeEfficiency)}%, ${totalUsers} users`,
      color: systemHealth > 85 ? '#10b981' : systemHealth > 70 ? '#f59e0b' : '#ef4444',
      trend: systemHealth > 85 ? 'up' : systemHealth > 70 ? 'neutral' : 'down'
    },
    {
      title: 'SLA Compliance',
      value: `${slaCompliance}%`,
      description: `4h target vs ${formatDuration(avgCompletionTime)} actual avg`,
      color: slaCompliance > 95 ? '#10b981' : slaCompliance > 85 ? '#f59e0b' : '#ef4444',
      trend: slaCompliance > 95 ? 'up' : slaCompliance > 85 ? 'neutral' : 'down'
    },
    {
      title: 'Active Load',
      value: activeWorkflows,
      description: `${Math.round((activeWorkflows / Math.max(1, totalWorkflows)) * 100)}% of ${totalWorkflows} total workflows`,
      color: activeWorkflows > 100 ? '#ef4444' : activeWorkflows > 50 ? '#f59e0b' : '#10b981',
      trend: 'neutral'
    },
    {
      title: 'Period Output',
      value: completedToday,
      description: `${Math.round((completedToday / Math.max(1, totalWorkflows)) * 100)}% completion rate this period`,
      color: '#60a5fa',
      trend: 'up'
    }
  ]

  // Additional KPI cards (bottom 4)
  const additionalKPIs: Array<{
    title: string
    value: string | number
    description: string
    color: string
    trend: 'up' | 'down' | 'neutral'
  }> = [
    {
      title: 'Critical Issues',
      value: criticalIssues,
      description: criticalIssues > 0 ? `${severeBottlenecks} severe bottlenecks detected` : 'No critical issues',
      color: criticalIssues > 10 ? '#ef4444' : criticalIssues > 5 ? '#f59e0b' : '#10b981',
      trend: criticalIssues === 0 ? 'up' : 'down'
    },
    {
      title: 'Team Efficiency',
      value: `${Math.round(avgTimeEfficiency)}%`,
      description: `vs 8h baseline, ${Math.round((activeWorkflows / Math.max(1, totalUsers)) * 10) / 10} workflows/user`,
      color: avgTimeEfficiency > 80 ? '#10b981' : avgTimeEfficiency > 60 ? '#f59e0b' : '#ef4444',
      trend: avgTimeEfficiency > 80 ? 'up' : avgTimeEfficiency > 60 ? 'neutral' : 'down'
    },
    {
      title: 'Active Departments',
      value: activeDepartments,
      description: `Departments with running workflows`,
      color: '#8b5cf6',
      trend: 'neutral'
    },
    {
      title: 'Live Activity',
      value: currentlyActive,
      description: `Tasks processing right now`,
      color: '#06b6d4',
      trend: currentlyActive > 0 ? 'up' : 'neutral'
    }
  ]

  return (
    <div data-testid={`${prefixDataTestId}-container`}>
      {/* Main KPI Grid - Top 4 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '16px'
        }}
      >
        {mainKPIs.map((kpi, index) => (
          <GuardianKPICard
            key={`main-kpi-${index}`}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            color={kpi.color}
            trend={kpi.trend}
            isLoading={isLoading}
            data-testid={`${prefixDataTestId}-main-kpi-${index}`}
          />
        ))}
      </div>

      {/* Additional KPI Grid - Bottom 4 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}
      >
        {additionalKPIs.map((kpi, index) => (
          <GuardianKPICard
            key={`additional-kpi-${index}`}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            color={kpi.color}
            trend={kpi.trend}
            isLoading={isLoading}
            data-testid={`${prefixDataTestId}-additional-kpi-${index}`}
          />
        ))}
      </div>

      {/* Additional Details Panels */}
      {statistics && !isLoading && (
        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px'
          }}
        >
          {/* Top Busy Departments */}
          {statistics.organizational.topBusiestDepartments.length > 0 && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e5e7eb',
                  marginBottom: '12px'
                }}
              >
                Busiest Departments
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statistics.organizational.topBusiestDepartments.slice(0, 3).map(dept => (
                  <div
                    key={dept.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'rgba(30, 41, 59, 0.4)',
                      borderRadius: '6px',
                      border: '1px solid rgba(148, 163, 184, 0.1)'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{dept.name}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
                      <span>{dept.activeTaskCount} tasks</span>
                      <span>•</span>
                      <span>{formatPercentage(dept.completionRate)} complete</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Workflow Templates */}
          {statistics.workflow.topTemplates.length > 0 && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e5e7eb',
                  marginBottom: '12px'
                }}
              >
                Most Used Templates
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statistics.workflow.topTemplates.slice(0, 3).map(template => (
                  <div
                    key={template.templateId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'rgba(30, 41, 59, 0.4)',
                      borderRadius: '6px',
                      border: '1px solid rgba(148, 163, 184, 0.1)'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{template.name}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
                      <span>{template.activeCount} active</span>
                      <span>•</span>
                      <span>{formatPercentage(template.completionRate)} complete</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottleneck Steps */}
          {statistics.workflow.bottleneckSteps.length > 0 && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e5e7eb',
                  marginBottom: '12px'
                }}
              >
                Process Bottlenecks
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statistics.workflow.bottleneckSteps.slice(0, 3).map((step, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.1)', // Dark red tint
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '500' }}>{step.stepTitle}</span>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{step.templateName}</div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: '500' }}>
                      {formatDuration(step.averageTimeInStep)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
