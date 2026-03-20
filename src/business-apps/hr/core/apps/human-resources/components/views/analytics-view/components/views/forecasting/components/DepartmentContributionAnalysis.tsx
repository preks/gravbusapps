import React from 'react'
import { Card, Spin, Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDepartmentContributionAnalysis } from '../../../../hooks/useDepartmentContributionAnalysis'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import dayjs from 'dayjs'

const { Text } = Typography

const DepartmentContributionAnalysis: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const startDate = dayjs(`${year}-01-01`).format('YYYY-MM-DD')
  const endDate = dayjs(`${year}-12-31`).format('YYYY-MM-DD')
  const { data, loading, error } = useDepartmentContributionAnalysis(props.accessToken, startDate, endDate)
  const { t } = useTranslation(hrTranslations)

  if (loading) {
    return <Spin data-testid="department-contribution-analysis-loading" />
  }
  if (error) {
    return (
      <div data-testid="department-contribution-analysis-error" className="gba:p-4">
        <Text className="gba:text-destructive">{t('hr-data-filter-error')}</Text>
      </div>
    )
  }
  if (!data.length) {
    return <div data-testid="department-contribution-analysis-empty">{t('hr-analytics-no-data')}</div>
  }

  // Data is already sorted by currentSalary descending from the hook
  const sorted = data

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="department-contribution-analysis"
      title={t('hr-analytics-department-contribution-analysis')}
    >
      <div className="gba:flex gba:flex-row gba:gap-16 gba:w-full gba:py-2">
        {/* Current Month Breakdown */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
            {t('hr-analytics-current-month-breakdown')}
          </div>
          {sorted.map((dep, index) => {
            // Use chart colors for consistency
            const colors = [
              'var(--nw-chart-1)',
              'var(--nw-chart-2)',
              'var(--nw-chart-3)',
              'var(--nw-chart-4)',
              'var(--nw-chart-5)',
              'var(--nw-chart-6)'
            ]
            const color = colors[index % colors.length]
            return (
              <div
                key={dep.departmentId}
                className="gba:flex gba:items-center gba:mb-2"
                data-testid={`department-breakdown-${dep.departmentId}`}
              >
                <span
                  className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                  style={{ background: color }}
                ></span>
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
            // Use chart colors for consistency
            const colors = [
              'var(--nw-chart-1)',
              'var(--nw-chart-2)',
              'var(--nw-chart-3)',
              'var(--nw-chart-4)',
              'var(--nw-chart-5)',
              'var(--nw-chart-6)'
            ]
            const color = colors[index % colors.length]
            const growth = dep.growthPercentage
            return (
              <div
                key={dep.departmentId}
                className="gba:flex gba:items-center gba:mb-2"
                data-testid={`department-growth-${dep.departmentId}`}
              >
                <span
                  className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                  style={{ background: color }}
                ></span>
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
    </Card>
  )
}

export default DepartmentContributionAnalysis
export { DepartmentContributionAnalysis }
