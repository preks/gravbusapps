import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useHierarchyDataIntegration } from './hooks/useHierarchyData'
import RadialBarChart from './components/RadialBarChart'
import AnalyticsTabErrorCard from '../../../../shared/AnalyticsTabErrorCard'
import AnalyticsTabLoadingState from '../../../../shared/AnalyticsTabLoadingState'

function OrganizationalHierarchyReport({ accessToken, userInfo, additionalData }: Readonly<BusinessAppContextProps>) {
  const { sunburstData, statistics, tableData, alternativeViewData, isLoading, error, viewMode, setViewMode, refetch } =
    useHierarchyDataIntegration({
      accessToken,
      userInfo,
      additionalData
    })

  const prefixDataTestId = 'OrganizationalHierarchyReport'

  if (isLoading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId={`${prefixDataTestId}-Loading`}
        message="Loading hierarchy data..."
        className="gba:min-h-[400px]"
      />
    )
  }

  if (error) {
    return (
      <AnalyticsTabErrorCard
        dataTestId={`${prefixDataTestId}-Error`}
        message="Error loading hierarchy data"
        detail={error}
        retryLabel="Retry"
        onRetry={refetch}
      />
    )
  }

  return (
    <div data-testid={prefixDataTestId} className="gba:w-full gba:h-full">
      <RadialBarChart
        data={sunburstData}
        statistics={statistics}
        tableData={tableData}
        alternativeViewData={alternativeViewData}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  )
}

export default OrganizationalHierarchyReport
