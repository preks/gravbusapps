import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ClipboardList, MessageSquare, Clock, ArrowLeft, Users, Target, CheckCircle2 } from 'lucide-react'
import { SurveyDataService, SurveyFlow, StepSegment } from '../services/SurveyDataService'
import { FlowDetailView } from '@/business-apps/flow/common/components/flow-detail'
import { FlowSummaryCard } from '@/business-apps/flow/common/components/flow-summary-card/FlowSummaryCard'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type DashboardTabProps = BusinessAppContextProps

export const DashboardTab: React.FC<DashboardTabProps> = context => {
  const [surveyFlows, setSurveyFlows] = useState<SurveyFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stepSegmentsByFlowId, setStepSegmentsByFlowId] = useState<Record<string, StepSegment[]>>({})
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch survey flows and analytics data in parallel
      const [flowsResponse] = await Promise.all([SurveyDataService.getSurveyFlows(context.accessToken)])

      setSurveyFlows(flowsResponse.flows)

      // Fetch segmented step progress for each flow in parallel (best-effort)
      const segmentResults = await Promise.allSettled(
        flowsResponse.flows.slice(0, 9).map(async flow => {
          const segments = await SurveyDataService.getFlowStepSegments(context.accessToken, flow.id)
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
      console.error('Error loading survey data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load survey data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Load survey flows on mount and when notified of new flow
  useEffect(() => {
    loadData()
    const handler = () => loadData()
    window.addEventListener('survey-flow-created', handler)
    return () => window.removeEventListener('survey-flow-created', handler)
  }, [context.accessToken, loadData])

  // Calculate statistics from flow data (ignore analytics for now since it's misleading)
  const totalSurveys = surveyFlows.length
  const activeSurveys = surveyFlows.filter(f => f.status === 'RUNNING' || f.status === 'PENDING').length
  const completedSurveys = surveyFlows.filter(f => f.status === 'COMPLETED').length

  // Response rate based on actual task completion within surveys
  let totalTasks = 0
  let completedTasksAcrossAllSurveys = 0
  surveyFlows.forEach(flow => {
    totalTasks += flow.totalTasks || 0
    completedTasksAcrossAllSurveys += flow.completedTasks || 0
  })

  const responseRate = totalTasks > 0 ? Math.round((completedTasksAcrossAllSurveys / totalTasks) * 100) : 0

  // Calculate total participants from flow data
  const totalParticipants = surveyFlows.reduce((sum, flow) => {
    return sum + (flow.participantCount || 1)
  }, 0)

  // Widget configuration for statistics
  const widgets: WidgetItem[] = [
    {
      key: 'active-surveys',
      title: 'Active Surveys',
      value: totalSurveys, // All surveys are considered "active" for data collection
      prefix: <ClipboardList className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#3b82f6',
      description: 'Currently collecting data'
    },
    {
      key: 'response-rate',
      title: 'Response Rate',
      value: 0, // Set to 0 as requested
      suffix: '%',
      prefix: <MessageSquare className="gba:h-5 gba:w-5 gba:text-gray-600" />,
      color: '#6b7280',
      description: 'Completion rate'
    },
    {
      key: 'completed-surveys',
      title: 'Completed Surveys',
      value: 0, // Set to 0 as requested
      prefix: <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-gray-600" />,
      color: '#6b7280',
      description: 'Fully completed'
    },
    {
      key: 'total-participants',
      title: 'Total Participants',
      value: totalParticipants,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: 'Survey participants'
    }
  ]

  // If a flow is selected, show the flow detail view
  if (selectedFlowId) {
    return (
      <div
        className="gba:space-y-6"
        data-testid="survey-flow-detail-view"
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
    <div className="gba:space-y-6" data-testid="survey-dashboard-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <ClipboardList className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Survey Dashboard</h1>
          <p className="gba:text-gray-600">Monitor survey campaigns and response collection</p>
        </div>
      </div>

      {/* Statistics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        skeletonCount={6}
        emptyText="No survey statistics available."
        data-testid="survey-statistics"
      />

      {/* Recent Survey Flows */}
      <div>
        <h3 className="gba:text-base gba:font-medium gba:mb-3">Recent Survey Campaigns</h3>
        {isLoading ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="gba:h-32 gba:rounded-lg gba:animate-pulse gba:bg-gray-200 gba:border gba:shadow-sm"
                data-testid={`survey-flow-skeleton-${i}`}
              />
            ))}
          </div>
        ) : surveyFlows.length > 0 ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {surveyFlows.slice(0, 6).map(flow => (
              <FlowSummaryCard
                key={flow.id}
                flow={flow}
                segments={stepSegmentsByFlowId[flow.id]}
                onClick={() => setSelectedFlowId(flow.id)}
                data-testid={`survey-flow-card-${flow.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-muted-foreground)' }}>
            <ClipboardList
              className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4"
              style={{ color: 'var(--color-muted-foreground)' }}
            />
            <p>No survey campaigns found</p>
            <p className="gba:text-sm">Create your first survey to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
