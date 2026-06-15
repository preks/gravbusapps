import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

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
        <h4 className="gba:m-0 gba:text-lg gba:font-semibold gba:text-foreground">
          {t('hr-analytics-yearly-payroll-chart-title')}
        </h4>
        <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-yearly-payroll-description')}
        </p>
      </div>

      {/* Chart Content */}
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
        <span className="gba:text-muted-foreground gba:text-lg">{t('hr-analytics-coming-soon')}</span>
      </div>
    </Card>
  )
}

export default YearlyPayrollChart
