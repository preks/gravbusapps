import React from 'react'
import { Typography } from 'antd'
import { Card, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface YearlyPayrollChartProps {
  showComingSoon?: boolean
}

/**
 * A bar chart component that displays the yearly payroll data for the last 5 years
 */
const YearlyPayrollChart: React.FC<YearlyPayrollChartProps> = () => {
  const { t } = useTranslation(hrTranslations)

  return (
    <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart">
      {/* Header */}
      <div className="gba:mb-4 gba:ml-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-yearly-payroll-chart-title')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-yearly-payroll-description')}
        </Text>
      </div>

      {/* Chart Content */}
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
        <Text className="gba:text-muted-foreground gba:text-lg">{t('hr-analytics-coming-soon')}</Text>
      </div>
    </Card>
  )
}

export default YearlyPayrollChart
