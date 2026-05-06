import React from 'react'
import { useHealthInsuranceTypeDistribution } from '../../../../../hooks/useHealthInsuranceTypeDistribution'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  buildDistributionChartData,
  DistributionChartStateContent,
  DistributionPieChartView
} from './distributionChartShared'

/**
 * Pie chart component for displaying health insurance type distribution.
 * Same layout as Health Insurer Distribution for consistency.
 */
export const HealthInsuranceTypeDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceTypeDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)
  const chartData = buildDistributionChartData(data)

  return (
    <div className="gba:w-full gba:h-full" data-testid="health-insurance-type-distribution-chart">
      <DistributionChartStateContent
        loading={loading}
        error={error}
        hasData={data.length > 0}
        errorMessage={t('hr-analytics-error-loading')}
        emptyMessage={t('hr-analytics-no-data')}
        loadingTestId="health-insurance-type-distribution-loading"
        emptyTestId="health-insurance-type-distribution-empty"
        containerClassName="gba:flex gba:justify-center gba:items-center gba:h-full"
      >
        <DistributionPieChartView chartData={chartData} className="gba:h-full" />
      </DistributionChartStateContent>
    </div>
  )
}

export default HealthInsuranceTypeDistributionChart
