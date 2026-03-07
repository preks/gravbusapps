import React from 'react'
import { Typography } from 'antd'
import { useHealthInsuranceTypeDistribution } from '../../../../../hooks/useHealthInsuranceTypeDistribution'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  buildDistributionChartData,
  DistributionChartStateContent,
  DistributionPieChartView
} from './distributionChartShared'

const { Title, Text } = Typography

/**
 * Pie chart component for displaying health insurance type distribution.
 * Same layout as Health Insurer Distribution for consistency.
 */
export const HealthInsuranceTypeDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceTypeDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)
  const chartData = buildDistributionChartData(data)

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-border"
      data-testid="health-insurance-type-distribution-chart"
    >
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-health-insurance-type-distribution')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-health-insurance-type-distribution-description')}
        </Text>
      </div>

      <DistributionChartStateContent
        loading={loading}
        error={error}
        hasData={data.length > 0}
        errorMessage={t('hr-analytics-error-loading')}
        emptyMessage={t('hr-analytics-no-data')}
        loadingTestId="health-insurance-type-distribution-loading"
        emptyTestId="health-insurance-type-distribution-empty"
      >
        <DistributionPieChartView chartData={chartData} />
      </DistributionChartStateContent>
    </div>
  )
}

export default HealthInsuranceTypeDistributionChart
