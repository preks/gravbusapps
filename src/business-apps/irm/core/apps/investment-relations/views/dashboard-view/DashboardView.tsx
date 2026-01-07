import React, { useState, useCallback, useEffect } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { LineChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo, DateRange } from './types/dashboardTypes'
import { useOverviewData } from './hooks/useOverviewData'
import { usePipelineData } from './hooks/usePipelineData'
import { formatCurrency } from './utils/dashboardUtils'
import { DashboardLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/DashboardLayout'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface DashboardViewProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[]
  dateRange: DateRange
  moduleColor: string
}

export const DashboardView: React.FC<DashboardViewProps> = ({ pipelines, dateRange, moduleColor, ...context }) => {
  const [activeTab] = useState<string>('overview')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelines.length > 0 ? pipelines[0].id : '')

  const { overviewData, isLoading, error, refetch, setSelectedCurrency } = useOverviewData(
    context,
    pipelines,
    dateRange
  )

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const [pipelineCurrency, setPipelineCurrency] = useState<string | undefined>(undefined)

  const { pipelineData, availableCurrencies: pipelineCurrencies } = usePipelineData(
    context,
    selectedPipeline || null,
    dateRange,
    pipelineCurrency
  )

  // Auto-select the first available currency when data loads
  useEffect(() => {
    if (pipelineCurrencies.length > 0 && !pipelineCurrency) {
      setPipelineCurrency(pipelineCurrencies[0])
    }
  }, [pipelineCurrencies, pipelineCurrency])

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
  }

  // Ensure selectedPipelineId is always set when pipelines are available
  useEffect(() => {
    if (pipelines.length > 0) {
      // If no pipeline is selected or the selected pipeline doesn't exist, select the first one
      if (!selectedPipelineId || !pipelines.find(p => p.id === selectedPipelineId)) {
        setSelectedPipelineId(pipelines[0].id)
      }
    }
  }, [pipelines, selectedPipelineId])

  const handleDealClick = useCallback((opportunityId: string) => {
    const url = buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      source: 'investments',
      fromView: 'dashboard'
    })
    navigateTo(url)
  }, [])

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

  return (
    <DashboardLayout
      dataTestId="dashboard-view"
      initialTab={activeTab}
      moduleColor={moduleColor}
      overviewProps={
        overviewData
          ? {
              aggregatedFunnel: overviewData.aggregatedFunnel,
              availableCurrencies: overviewData.availableCurrencies,
              selectedCurrency: overviewData.selectedCurrency,
              onCurrencyChange: setSelectedCurrency,
              revenueBySource: overviewData.revenueBySource,
              totalRevenue: overviewData.totalRevenue,
              totalLeadCount: overviewData.totalLeadCount,
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
                status: t.status,
                relatedEntity: t.relatedEntity // Add the missing relatedEntity field
              })),
              todaysActivities: overviewData.todaysActivities.map(a => ({
                id: a.id,
                title: a.title,
                type: a.type,
                owner: a.owner,
                relatedTo: a.relatedTo,
                createdAt: a.createdAt,
                completedAt: a.completedAt ?? undefined,
                relatedEntity: a.relatedEntity
              })),
              keyDeals: overviewData.keyDeals,
              onDealClick: handleDealClick,
              source: 'investments' as const
            }
          : undefined
      }
      pipelineProps={
        selectedPipeline && pipelines.length > 0
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
              availableCurrencies: pipelineCurrencies,
              selectedCurrency: pipelineCurrency,
              onCurrencyChange: setPipelineCurrency,
              pipelineHeaderBadges: pipelineData
                ? [
                    {
                      label: `${pipelineData.metrics.totalOpportunities} opportunities`,
                      variant: 'secondary' as const
                    },
                    {
                      label: `${formatCurrency(pipelineData.metrics.totalValue, pipelineCurrency || 'EUR')}`,
                      variant: 'default' as const
                    },
                    {
                      label: `${pipelineData.metrics.dealsWon} won`,
                      variant: 'outline' as const
                    }
                  ]
                : [],
              pipelineId: selectedPipeline.id,
              metrics: pipelineData
                ? {
                    totalValue: pipelineData.metrics.totalValue,
                    avgDealSize: pipelineData.metrics.avgDealSize,
                    dealsWon: pipelineData.metrics.dealsWon,
                    winRate: pipelineData.metrics.winRate
                  }
                : {
                    totalValue: 0,
                    avgDealSize: 0,
                    dealsWon: 0,
                    winRate: 0
                  },
              funnelData: pipelineData?.funnelData || [],
              winRateMetrics: pipelineData?.winRateMetrics || {
                monthToDate: { won: 0, lost: 0, winRate: 0 },
                quarterToDate: { won: 0, lost: 0, winRate: 0 }
              },
              activityVolume: pipelineData?.activityVolume || {
                last7Days: { total: 0, calls: 0, emails: 0, meetings: 0 },
                last30Days: { total: 0, calls: 0, emails: 0, meetings: 0 }
              },
              leaderboard: pipelineData?.leaderboard || []
            }
          : undefined
      }
    />
  )
}

export default DashboardView
