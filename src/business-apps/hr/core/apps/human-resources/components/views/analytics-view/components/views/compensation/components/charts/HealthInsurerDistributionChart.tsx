import React from 'react'
import { Typography } from 'antd'
import { useHealthInsuranceDistribution } from '../../../../../hooks/useHealthInsuranceDistribution'
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
 * Pie chart component for displaying health insurer distribution
 */
export const HealthInsurerDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)
  const chartData = buildDistributionChartData(data)

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-border"
      data-testid="health-insurer-distribution-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-health-insurer-distribution')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-health-insurer-distribution-description')}
        </Text>
      </div>

      <DistributionChartStateContent
        loading={loading}
        error={error}
        hasData={data.length > 0}
        errorMessage={t('hr-analytics-error-loading')}
        emptyMessage={t('hr-analytics-no-data')}
      >
        <DistributionPieChartView chartData={chartData} />
      </DistributionChartStateContent>
    </div>
  )
}

export default HealthInsurerDistributionChart
