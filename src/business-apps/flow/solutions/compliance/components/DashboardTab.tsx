import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { FlowDetailView } from '@/common/components/flow/flow-detail'
import { Shield, FileText, Clock, ArrowLeft, Users } from 'lucide-react'
import { ComplianceDataService, ComplianceFlow, StepSegment } from '../services/ComplianceDataService'
import { FlowSummaryCard } from '@/business-apps/flow/common/components/flow-summary-card/FlowSummaryCard'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type DashboardTabProps = BusinessAppContextProps

export const DashboardTab: React.FC<DashboardTabProps> = context => {
  const [complianceFlows, setComplianceFlows] = useState<ComplianceFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stepSegmentsByFlowId, setStepSegmentsByFlowId] = useState<Record<string, StepSegment[]>>({})
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch compliance flows
      const flowsResponse = await ComplianceDataService.getComplianceFlows(context.accessToken)
      setComplianceFlows(flowsResponse.flows)

      // Fetch segmented step progress for each flow in parallel (best-effort)
      const segmentResults = await Promise.allSettled(
        flowsResponse.flows.slice(0, 9).map(async flow => {
          const segments = await ComplianceDataService.getFlowStepSegments(context.accessToken, flow.id)
          return [flow.id, segments] as const
        })
      )

      const segmentMap: Record<string, StepSegment[]> = {}
      segmentResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const [flowId, segments] = result.value
          segmentMap[flowId] = segments
        }
      })
      setStepSegmentsByFlowId(segmentMap)
    } catch (err) {
      console.error('Error loading compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Load compliance flows on mount and when notified of new flow
  useEffect(() => {
    loadData()
    const handler = () => loadData()
    window.addEventListener('compliance-flow-created', handler)
    return () => window.removeEventListener('compliance-flow-created', handler)
  }, [context.accessToken, loadData])

  // Calculate statistics from flows
  const totalFlows = complianceFlows.length
  const activeFlows = complianceFlows.filter(f => f.status === 'RUNNING').length
  const completedFlows = complianceFlows.filter(f => f.status === 'COMPLETED').length
  const completionRate = totalFlows > 0 ? Math.round((completedFlows / totalFlows) * 100) : 0
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const completedThisMonth = complianceFlows.filter(
    f => f.status === 'COMPLETED' && f.endTime && new Date(f.endTime) >= thisMonth
  ).length

  // Widget configuration for statistics
  const widgets: WidgetItem[] = [
    {
      key: 'total-compliance-flows',
      title: 'Total Compliance Flows',
      value: totalFlows,
      prefix: <Shield className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#3b82f6',
      description: 'All compliance processes'
    },
    {
      key: 'active-flows',
      title: 'Active Flows',
      value: activeFlows,
      prefix: <Clock className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#16a34a',
      description: 'Currently in progress'
    },
    {
      key: 'completion-rate',
      title: 'Completion Rate',
      value: completionRate,
      suffix: '%',
      prefix: <FileText className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#16a34a',
      description: 'Successfully completed'
    },
    {
      key: 'completed-this-month',
      title: 'Completed This Month',
      value: completedThisMonth,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: 'Finished this month'
    }
  ]

  // If a flow is selected, show the flow detail view
  if (selectedFlowId) {
    return (
      <div
        className="gba:space-y-6"
        data-testid="compliance-flow-detail-view"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius-lg)',
          border: 'var(--border-width-thin) solid var(--color-border-default)'
        }}
      >
        {/* Back button */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
          <Button
            variant="outline"
            onClick={() => setSelectedFlowId(null)}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="back-to-dashboard-button"
          >
            <ArrowLeft className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard'
            )}
          </Button>
        </div>

        {/* Flow Detail Component */}
        <FlowDetailView {...context} flowId={selectedFlowId} showBackButton={false} />
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="compliance-dashboard-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <Shield className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Compliance Dashboard</h1>
          <p className="gba:text-gray-600">Monitor and manage compliance processes</p>
        </div>
      </div>

      {/* Statistics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        skeletonCount={4}
        emptyText="No compliance statistics available."
        data-testid="compliance-statistics"
      />

      {/* Recent Compliance Flows */}
      <div>
        <h3 className="gba:text-base gba:font-medium gba:mb-3">Recent Compliance Flows</h3>
        {isLoading ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="gba:h-32 gba:rounded-lg gba:animate-pulse gba:bg-gray-200 gba:border gba:shadow-sm"
                data-testid={`compliance-flow-skeleton-${i}`}
              />
            ))}
          </div>
        ) : complianceFlows.length > 0 ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {complianceFlows.slice(0, 6).map(flow => (
              <FlowSummaryCard
                key={flow.id}
                flow={flow}
                segments={stepSegmentsByFlowId[flow.id]}
                onClick={() => setSelectedFlowId(flow.id)}
                data-testid={`compliance-flow-card-${flow.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-muted-foreground)' }}>
            <Shield
              className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4"
              style={{ color: 'var(--color-muted-foreground)' }}
            />
            <p>No compliance flows found</p>
            <p className="gba:text-sm">Create your first compliance flow to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
