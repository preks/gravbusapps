import React from 'react'
import { Card, CardHeader, CardContent, CardTitle, Alert, useTranslation } from '@newwork/nw-design-system'
import { DashboardStats } from '../types'
import ComparisonCard from './ComparisonCard'
import ExpenseDistribution from './ExpenseDistribution'
import personalTranslations from '../../../../_i18n'

const getComparisonProps = (
  stats: DashboardStats,
  period: 'monthly' | 'quarterly' | 'yearly',
  t: (key: string) => string
) => {
  switch (period) {
    case 'quarterly':
      return {
        title: t('dashboard-comparison-quarterly'),
        currentValue: stats.currentQuarterExpenses?.total || 0,
        previousValue: stats.previousQuarterExpenses?.total || 0,
        currentLabel: t('dashboard-comparison-this-quarter'),
        previousLabel: t('dashboard-comparison-last-quarter')
      }
    case 'yearly':
      return {
        title: t('dashboard-comparison-yearly'),
        currentValue: stats.currentYearExpenses?.total || 0,
        previousValue: stats.previousYearExpenses?.total || 0,
        currentLabel: t('dashboard-comparison-this-year'),
        previousLabel: t('dashboard-comparison-last-year')
      }
    case 'monthly':
    default:
      return {
        title: t('dashboard-comparison-monthly'),
        currentValue: stats.currentMonthExpenses?.total || 0,
        previousValue: stats.previousMonthExpenses?.total || 0,
        currentLabel: t('dashboard-comparison-this-month'),
        previousLabel: t('dashboard-comparison-last-month')
      }
  }
}

export interface SpendingOverviewProps {
  stats: DashboardStats | undefined
  isLoading: boolean
  error: Error | null
  period: 'monthly' | 'quarterly' | 'yearly'
  currencyCode?: string
}

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({
  stats,
  isLoading,
  error,
  period,
  currencyCode
}) => {
  const { t } = useTranslation(personalTranslations)

  if (isLoading) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-loading">
        <CardContent>
          <div className="gba:py-8 gba:text-center">
            <div className="gba:text-gray-500">{t('dashboard-spending-no-data')}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">{t('dashboard-spending-error')}</h4>
          <p>{error.message}</p>
        </Alert>
      </Card>
    )
  }

  if (!stats) return null

  const comparisonProps = getComparisonProps(stats, period, t)

  return (
    <Card className="gba:spending-overview-card" data-testid="spending-overview-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>{t('dashboard-spending-overview-title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-row gba:gap-6">
          <div className="gba:w-1/2" data-testid="expense-distribution">
            <ExpenseDistribution stats={stats} period={period} />
          </div>
          <div className="gba:w-1/2" data-testid="comparison-card">
            <ComparisonCard {...comparisonProps} currencyCode={currencyCode} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
