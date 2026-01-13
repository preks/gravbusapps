import React, { useState, useCallback, useEffect } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner, EmptyState } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DashboardLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/DashboardLayout'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  buildOverviewProps,
  buildPipelineProps
} from '@/common/components/common-relations/view-layouts/dashboard-layout/utils/buildDashboardProps'
import {
  PipelineInfo,
  DateRange
} from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'
import { useOverviewData } from './hooks/useOverviewData'
import { usePipelineData } from './hooks/usePipelineData'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { irmActivityNavigationConfig } from './config/activityNavigationConfig'
import { irmRecordNavigationConfig } from './config/recordNavigationConfig'
import { irmTaskNavigationConfig } from './config/taskNavigationConfig'

export interface DashboardViewProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[]
  dateRange: DateRange
  moduleColor?: string
}

export const DashboardView: React.FC<DashboardViewProps> = ({ pipelines, dateRange, moduleColor, ...context }) => {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelines.length > 0 ? pipelines[0].id : '')

  const {
    overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
    setSelectedCurrency,
    selectedDealCurrency,
    setSelectedDealCurrency,
    handleTasksPageChange
  } = useOverviewData(context, pipelines, dateRange, activeTab === 'overview')

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const [pipelineCurrency, setPipelineCurrency] = useState<string | undefined>(undefined)

  // Fire-and-forget async handlers for pagination
  const onTasksPageChange = (page: number, pageSize: number) => {
    handleTasksPageChange(page, pageSize)
  }

  const {
    pipelineData,
    availableCurrencies: pipelineCurrencies,
    isLoading: pipelineLoading
  } = usePipelineData(context, selectedPipeline || null, dateRange, pipelineCurrency, activeTab === 'pipeline-details')

  // Auto-select the first available currency when data loads
  useEffect(() => {
    if (pipelineCurrencies.length > 0 && !pipelineCurrency) {
      setPipelineCurrency(pipelineCurrencies[0])
    }
  }, [pipelineCurrencies, pipelineCurrency])

  // Ensure selectedPipelineId is always set when pipelines are available
  useEffect(() => {
    if (pipelines.length > 0) {
      if (!selectedPipelineId || !pipelines.some(p => p.id === selectedPipelineId)) {
        setSelectedPipelineId(pipelines[0].id)
      }
    }
  }, [pipelines, selectedPipelineId])

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
  }

  const handleDealClick = useCallback((opportunityId: string) => {
    const url = buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      source: 'investments',
      fromView: 'dashboard'
    })
    navigateTo(url)
  }, [])

  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey)
  }, [])

  // Show loading spinner only for overview tab on initial load
  if (activeTab === 'overview' && overviewLoading && !overviewData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600">Loading dashboard data...</div>
        </div>
      </div>
    )
  }

  // Show error state only for overview tab
  if (activeTab === 'overview' && overviewError) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" className="gba:shadow-sm">
          <AlertTitle>Error Loading Dashboard Data</AlertTitle>
          <AlertDescription>{overviewError}</AlertDescription>
          <Button size="sm" onClick={refetchOverview} variant="default">
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
      dataTestId="irm-dashboard-view"
      initialTab={activeTab}
      moduleColor={moduleColor}
      onTabChange={handleTabChange}
      overviewProps={buildOverviewProps(
        overviewData,
        {
          setSelectedCurrency,
          handleDealClick,
          setSelectedDealCurrency,
          onTasksPageChange
        },
        selectedDealCurrency,
        irmActivityNavigationConfig,
        irmRecordNavigationConfig,
        irmTaskNavigationConfig
      )}
      pipelineProps={buildPipelineProps({
        selectedPipeline,
        pipelineData,
        pipelines,
        selectedPipelineId,
        pipelineCurrencies,
        pipelineCurrency,
        pipelineLoading,
        handlers: { handlePipelineChange, setPipelineCurrency },
        formatCurrency
      })}
    />
  )
}

export default DashboardView
