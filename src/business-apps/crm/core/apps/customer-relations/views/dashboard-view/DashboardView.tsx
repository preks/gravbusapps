import React, { useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { LineChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo, DateRange } from './types/dashboardTypes'
import { useOverviewData } from './hooks/useOverviewData'
import { usePipelineData } from './hooks/usePipelineData'
import EmptyState from '@/components/empty-state/EmptyState'
import { formatCurrency } from './utils/dashboardUtils'
import { DashboardLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/DashboardLayout'

export interface DashboardViewProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[]
  dateRange: DateRange
  moduleColor?: string
}

export const DashboardView: React.FC<DashboardViewProps> = ({ pipelines, dateRange, moduleColor, ...context }) => {
  const [activeTab] = useState<string>('overview')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelines.length > 0 ? pipelines[0].id : '')

  const { overviewData, isLoading, error, refetch } = useOverviewData(context, pipelines, dateRange)

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const {
    pipelineData,
    isLoading: pipelineLoading,
    error: pipelineError
  } = usePipelineData(context, selectedPipeline || null, dateRange)

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600">Loading dashboard data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" className="gba:shadow-sm">
          <AlertTitle>Error Loading Dashboard Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button size="sm" onClick={refetch} variant="default">
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  if (!overviewData && pipelines.length === 0) {
    return (
      <EmptyState title="No Dashboard Data" description="Unable to load dashboard data or no pipelines available" />
    )
  }

  return (
    <DashboardLayout
      dataTestId="dashboard-view"
      initialTab={activeTab}
      moduleColor={moduleColor}
      overviewProps={
        overviewData
          ? {
              aggregatedFunnel: overviewData.aggregatedFunnel,
              revenueBySource: overviewData.revenueBySource,
              totalRevenue: overviewData.totalRevenue,
              totalLeadCount: overviewData.aggregatedFunnel.reduce((sum, stage) => sum + stage.count, 0),
              recentRecords: overviewData.recentRecords,
              activeTasks: overviewData.activeTasks.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                assignedTo: t.assignedTo,
                relatedTo: t.relatedTo,
                dueDate: t.dueDate ?? undefined,
                isOverdue: t.isOverdue,
                priority: t.priority,
                status: t.status
              })),
              todaysActivities: overviewData.todaysActivities.map(a => ({
                id: a.id,
                title: a.title,
                type: a.type,
                owner: a.owner,
                relatedTo: a.relatedTo,
                createdAt: a.createdAt,
                completedAt: a.completedAt ?? undefined
              })),
              keyDeals: overviewData.keyDeals
            }
          : undefined
      }
      pipelineProps={
        selectedPipeline
          ? {
              headerLeft: (
                <div className="gba:p-3 gba:rounded-xl gba:shadow-sm gba:bg-blue-100">
                  <LineChart className="gba:h-6 gba:w-6 gba:text-blue-600" />
                </div>
              ),
              pipelineTitle: selectedPipeline.name,
              pipelineDescription: selectedPipeline.description,
              pipelines: pipelines.map(p => ({ id: p.id, name: p.name })),
              selectedPipelineId,
              onPipelineChange: handlePipelineChange,
              pipelineHeaderBadges: pipelineData
                ? [
                    {
                      label: `${pipelineData.metrics.totalOpportunities} opportunities`,
                      variant: 'secondary' as const
                    },
                    { label: `${formatCurrency(pipelineData.metrics.totalValue)}`, variant: 'default' as const },
                    {
                      label: `${pipelineData.metrics.conversionRate.toFixed(1)}% conversion`,
                      variant: 'outline' as const
                    }
                  ]
                : [],
              pipelineId: selectedPipeline.id,
              metrics: pipelineData
                ? {
                    totalValue: pipelineData.metrics.totalValue,
                    avgDealSize: pipelineData.metrics.avgDealSize,
                    conversionRate: pipelineData.metrics.conversionRate,
                    avgSalesCycle: pipelineData.metrics.avgSalesCycle
                  }
                : {
                    totalValue: 0,
                    avgDealSize: 0,
                    conversionRate: 0,
                    avgSalesCycle: 0
                  },
              funnelData: pipelineData?.funnelData || [],
              winRateMetrics: pipelineData?.winRateMetrics || { monthToDate: 0, quarterToDate: 0 },
              activityVolume: pipelineData?.activityVolume || { last7Days: 0, last30Days: 0 },
              leaderboard: pipelineData?.leaderboard || []
            }
          : undefined
      }
    />
  )
}

export default DashboardView
