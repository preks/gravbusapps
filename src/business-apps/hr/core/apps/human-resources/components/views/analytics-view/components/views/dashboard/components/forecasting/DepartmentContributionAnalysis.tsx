import React from 'react'
import { Card, Spin } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDepartmentMonthlySalaryStack } from '../../../../../hooks/useDepartmentMonthlySalaryStack'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const DepartmentContributionAnalysis: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const { data, loading } = useDepartmentMonthlySalaryStack(props, year)
  const { t } = useTranslation(hrTranslations)
  if (loading) {
    return <Spin data-testid="department-contribution-analysis-loading" />
  }
  if (!data.length) {
    return <div data-testid="department-contribution-analysis-empty">{t('hr-analytics-no-data')}</div>
  }
  // Use first and last month for growth calculation
  const firstMonth = data[0]
  const lastMonth = data[data.length - 1]
  // Sort departments by salary descending for current month
  const sorted = [...lastMonth.departments].sort((a, b) => b.salary - a.salary)

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
          {sorted.map(dep => (
            <div
              key={dep.id}
              className="gba:flex gba:items-center gba:mb-2"
              data-testid={`department-breakdown-${dep.id}`}
            >
              <span
                className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                style={{ background: dep.color }}
              ></span>
              <span className="gba:w-32 gba:text-xs gba:text-foreground">{dep.name}</span>
              <span className="gba:w-20 gba:text-right gba:font-medium">${(dep.salary / 1e3).toFixed(0)}K</span>
              <span className="gba:w-12 gba:text-xs gba:text-muted-foreground gba:text-right">
                {dep.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
        {/* Growth Trends */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
            {t('hr-analytics-growth-trends')}
          </div>
          {sorted.map(dep => {
            const first = firstMonth.departments.find(d => d.id === dep.id)
            const growth = first && first.salary > 0 ? ((dep.salary - first.salary) / first.salary) * 100 : 0
            return (
              <div
                key={dep.id}
                className="gba:flex gba:items-center gba:mb-2"
                data-testid={`department-growth-${dep.id}`}
              >
                <span
                  className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                  style={{ background: dep.color }}
                ></span>
                <span className="gba:w-32 gba:text-xs gba:text-foreground">{dep.name}</span>
                <span
                  className={`gba:w-20 gba:text-right gba:font-semibold ${growth >= 0 ? 'gba:text-success' : 'gba:text-destructive'}`}
                >
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(1)}%
                </span>
                <span className="gba:text-xs gba:text-muted-foreground gba:ml-2">
                  YTD {t('hr-analytics-growth')}
                </span>
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
