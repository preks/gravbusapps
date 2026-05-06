import React from 'react'
import { useHealthInsuranceDistribution } from '../../../../../hooks/useHealthInsuranceDistribution'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  buildDistributionChartData,
  DistributionChartStateContent,
  DistributionPieChartView
} from './distributionChartShared'

/**
 * Pie chart component for displaying health insurer distribution
 */
export const HealthInsurerDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)
  const chartData = buildDistributionChartData(data)

  return (
    <div className="gba:w-full gba:h-full" data-testid="health-insurer-distribution-chart">
      <DistributionChartStateContent
        loading={loading}
        error={error}
        hasData={data.length > 0}
        errorMessage={t('hr-analytics-error-loading')}
        emptyMessage={t('hr-analytics-no-data')}
        containerClassName="gba:flex gba:justify-center gba:items-center gba:h-full"
      >
        <DistributionPieChartView chartData={chartData} className="gba:h-full" />
      </DistributionChartStateContent>
    </div>
  )
}

export default HealthInsurerDistributionChart
