import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/business-apps/types'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

/**
 * A bar chart component that displays the yearly payroll data for the last 5 years
 */
const YearlyPayrollChart: React.FC<BusinessAppContextProps> = () => {
  const { t } = useTranslation(hrTranslations)

  return (
    <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart">
      {/* Header */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
          {t('hr-analytics-yearly-payroll-chart-title')}
        </h3>
        <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">{t('hr-analytics-yearly-payroll-description')}</p>
      </div>

      {/* Chart Content */}
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64">
        <span className="gba:text-muted-foreground gba:text-lg">{t('hr-analytics-coming-soon')}</span>
      </div>
    </Card>
  )
}

export default YearlyPayrollChart
