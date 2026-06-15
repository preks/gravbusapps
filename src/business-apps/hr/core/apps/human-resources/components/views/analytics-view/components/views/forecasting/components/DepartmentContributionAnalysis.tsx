import React from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDepartmentContributionAnalysis } from '../../../../hooks/useDepartmentContributionAnalysis'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import dayjs from 'dayjs'

const DOT_COLOR_CLASSES = [
  'gba:bg-chart-1',
  'gba:bg-chart-2',
  'gba:bg-chart-3',
  'gba:bg-chart-4',
  'gba:bg-chart-5',
  'gba:bg-chart-6'
]

const DepartmentContributionAnalysis: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const startDate = dayjs(`${year}-01-01`).format('YYYY-MM-DD')
  const endDate = dayjs(`${year}-12-31`).format('YYYY-MM-DD')
  const { data, loading, error } = useDepartmentContributionAnalysis(props.accessToken, startDate, endDate)
  const { t } = useTranslation(hrTranslations)

  if (loading) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center">
        <Spinner data-testid="department-contribution-analysis-loading" />
      </div>
    )
  }
  if (error) {
    return (
      <div data-testid="department-contribution-analysis-error" className="gba:p-4">
        <span className="gba:text-destructive">{t('hr-data-filter-error')}</span>
      </div>
    )
  }
  if (!data.length) {
    return <div data-testid="department-contribution-analysis-empty">{t('hr-analytics-no-data')}</div>
  }

  // Data is already sorted by currentSalary descending from the hook
  const sorted = data

  return (
    <div className="gba:h-full gba:w-full" data-testid="department-contribution-analysis">
      <div className="gba:flex gba:flex-row gba:gap-16 gba:w-full gba:py-2">
        {/* Current Month Breakdown */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
            {t('hr-analytics-current-month-breakdown')}
          </div>
          {sorted.map((dep, index) => {
            return (
              <div
                key={dep.departmentId}
                className="gba:flex gba:items-center gba:mb-2"
                data-testid={`department-breakdown-${dep.departmentId}`}
              >
                <span className={`gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2 ${DOT_COLOR_CLASSES[index % DOT_COLOR_CLASSES.length]}`}></span>
                <span className="gba:w-32 gba:text-xs gba:text-foreground">{dep.departmentName}</span>
                <span className="gba:w-20 gba:text-right gba:font-medium">
                  ${(dep.currentSalary / 1e3).toFixed(0)}K
                </span>
                <span className="gba:w-12 gba:text-xs gba:text-muted-foreground gba:text-right">
                  {dep.percentage.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
        {/* Growth Trends */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">{t('hr-analytics-growth-trends')}</div>
          {sorted.map((dep, index) => {
            const growth = dep.growthPercentage
            return (
              <div
                key={dep.departmentId}
                className="gba:flex gba:items-center gba:mb-2"
                data-testid={`department-growth-${dep.departmentId}`}
              >
                <span className={`gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2 ${DOT_COLOR_CLASSES[index % DOT_COLOR_CLASSES.length]}`}></span>
                <span className="gba:w-32 gba:text-xs gba:text-foreground">{dep.departmentName}</span>
                <span
                  className={`gba:w-20 gba:text-right gba:font-semibold ${growth >= 0 ? 'gba:text-success' : 'gba:text-destructive'}`}
                >
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(1)}%
                </span>
                <span className="gba:text-xs gba:text-muted-foreground gba:ml-2">YTD {t('hr-analytics-growth')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DepartmentContributionAnalysis
export { DepartmentContributionAnalysis }
