import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, UsersIcon, ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { SalaryStatistics as SalaryStatisticsType } from '../types/salaryTypes'
import { formatCurrency } from '../utils/salaryCalculations'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SalaryStatisticsProps {
  statistics: SalaryStatisticsType
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

/**
 * SalaryStatistics component for displaying salary statistics
 * Uses the WidgetGroup component for consistent styling and behavior
 */
const SalaryStatistics: React.FC<SalaryStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const locale = getCurrentActiveUserLocale()

  // Transform statistics data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'average-salary',
      title: getTranslationFromI18nKeyAndLabel('salary.statistics.average', 'Average Salary'),
      value: formatCurrency(statistics.averageSalary, statistics.currency, locale),
      prefix: <CurrencyDollarIcon size={16} />,
      color: 'var(--nw-info)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'salary.statistics.average.description',
        'Average monthly salary across all employees'
      ),
      valueIsString: true
    },
    {
      key: 'median-salary',
      title: getTranslationFromI18nKeyAndLabel('salary.statistics.median', 'Median Salary'),
      value: formatCurrency(statistics.medianSalary, statistics.currency, locale),
      prefix: <ChartBarIcon size={16} />,
      color: 'var(--nw-info)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'salary.statistics.median.description',
        'Median monthly salary across all employees'
      ),
      valueIsString: true
    },
    {
      key: 'total-compensation',
      title: getTranslationFromI18nKeyAndLabel('salary.statistics.total', 'Total Compensation'),
      value: formatCurrency(statistics.totalCompensation, statistics.currency, locale),
      prefix: <TrendUpIcon size={16} />,
      color: 'var(--nw-success)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'salary.statistics.total.description',
        'Total monthly compensation including all components'
      ),
      valueIsString: true
    },
    {
      key: 'employee-count',
      title: getTranslationFromI18nKeyAndLabel('salary.statistics.employees', 'Employees'),
      value: statistics.employeeCount.toString(),
      prefix: <UsersIcon size={16} />,
      color: 'var(--nw-warning)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'salary.statistics.employees.description',
        'Total number of employees with active salary data'
      ),
      valueIsString: true
    }
  ]

  return (
    <div data-testid="salary-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel('salary.statistics.empty', 'No salary statistics available.')}
        data-testid="salary-statistics"
      />
    </div>
  )
}

export default SalaryStatistics
