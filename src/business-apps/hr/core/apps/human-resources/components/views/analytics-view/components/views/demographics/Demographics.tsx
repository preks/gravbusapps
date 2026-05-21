import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDemographicsDataIntegration } from '../../../hooks/useDemographicsDataIntegration'
import DemographicsChartsView from './components/DemographicsChartsView'
import DemographicsStatistics from './components/DemographicsStatistics'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useEmployeeCount } from '../../../hooks/useEmployeeCount'
import AnalyticsTabErrorCard from '../../shared/AnalyticsTabErrorCard'
import AnalyticsTabLoadingState from '../../shared/AnalyticsTabLoadingState'

const Demographics: React.FC<BusinessAppContextProps> = context => {
  const { demographicsData, statistics, isLoading, error, refetch } = useDemographicsDataIntegration(context)
  const { t } = useTranslation(hrTranslations)
  const { count: dashboardEmployeeCount } = useEmployeeCount(context.accessToken)

  const prefixDataTestId = 'Demographics'
  // Prefer dashboardEmployeeCount; fall back to demographics total if undefined
  const displayEmployeeCount = dashboardEmployeeCount ?? statistics.totalEmployees

  if (error) {
    return (
      <AnalyticsTabErrorCard
        dataTestId={`${prefixDataTestId}-error`}
        message={t('hr-analytics-failed-to-load-demographics')}
        detail={error}
        retryLabel={t('common-retry')}
        onRetry={refetch}
        className="gba:p-6"
      />
    )
  }

  if (isLoading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId={`${prefixDataTestId}-loading`}
        message={t('hr-data-filter-loading-data')}
        className="gba:min-h-full gba:p-6 gba:rounded-lg"
      />
    )
  }

  return (
    <div data-testid={prefixDataTestId} className="gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:m-0">
            {t('hr-analytics-employee-demographics')}
          </h2>
          <div className="gba:bg-primary-foreground gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-border">
            <span className="gba:font-semibold gba:text-info">
              {displayEmployeeCount} {t('hr-analytics-employees')}
            </span>
          </div>
        </div>
        <Button
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <ArrowClockwiseIcon />
          {t('common-refresh-data')}
        </Button>
      </div>

      {/* Statistics Overview */}
      <DemographicsStatistics statistics={statistics} isLoading={isLoading} dataTestId={prefixDataTestId} />

      {/* Interactive Charts with Expandable Tables */}
      <div className="gba:mt-6">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('hr-analytics-demographics-breakdown')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
        </div>

        <DemographicsChartsView
          demographicsData={demographicsData}
          isLoading={isLoading}
          dataTestId={prefixDataTestId}
        />
      </div>
    </div>
  )
}

export default Demographics
