/**
 * Card component that displays a graph of monthly expense trends
 * Shows the total amount of paid expenses per month in EUR for the current year
 */

import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Alert,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MonthlyExpenseTrend } from '../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyForChart } from '../../utils/currencyUtils'
import { ChartBarIcon } from '@phosphor-icons/react'

export interface MonthlyExpenseTrendsCardProps {
  loading: boolean
  error: Error | null
  monthlyTrends: MonthlyExpenseTrend[]
  selectedCurrencyCode: string
  moduleColor?: string
}

const MonthlyExpenseTrendsCard: React.FC<MonthlyExpenseTrendsCardProps> = ({
  loading,
  error,
  monthlyTrends,
  selectedCurrencyCode,
  moduleColor
}) => {
  const currentYear = new Date().getFullYear()

  // Type guard for IconAvatar variant (from nw-design-system)
  type IconAvatarVariant =
    | 'default'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'info'
    | 'offline'
    | 'decorative'
    | 'ext1'
    | 'ext2'
    | 'ext3'
    | 'ext4'
    | 'ext5'
    | 'ext6'
    | 'ext7'
    | 'ext8'
    | 'pending'

  // Validate and get safe variant with proper typing
  const safeVariant: IconAvatarVariant | undefined = (() => {
    const validVariants: IconAvatarVariant[] = [
      'default',
      'secondary',
      'success',
      'warning',
      'destructive',
      'info',
      'offline',
      'decorative',
      'ext1',
      'ext2',
      'ext3',
      'ext4',
      'ext5',
      'ext6',
      'ext7',
      'ext8',
      'pending'
    ]
    return moduleColor && validVariants.includes(moduleColor as IconAvatarVariant)
      ? (moduleColor as IconAvatarVariant)
      : undefined
  })()

  // Helper function to translate month names
  const getTranslatedMonthName = (monthName: string): string => {
    const monthMap: { [key: string]: string } = {
      Jan: 'lowcoder:absence_report.totals_table.jan',
      Feb: 'lowcoder:absence_report.totals_table.feb',
      Mar: 'lowcoder:absence_report.totals_table.mar',
      Apr: 'lowcoder:absence_report.totals_table.apr',
      May: 'lowcoder:absence_report.totals_table.may',
      Jun: 'lowcoder:absence_report.totals_table.jun',
      Jul: 'lowcoder:absence_report.totals_table.jul',
      Aug: 'lowcoder:absence_report.totals_table.aug',
      Sep: 'lowcoder:absence_report.totals_table.sep',
      Oct: 'lowcoder:absence_report.totals_table.oct',
      Nov: 'lowcoder:absence_report.totals_table.nov',
      Dec: 'lowcoder:absence_report.totals_table.dec'
    }

    const translationKey = monthMap[monthName]
    if (translationKey) {
      return getTranslationFromI18nKeyAndLabel(translationKey, monthName)
    }
    return monthName
  }

  if (loading) {
    return (
      <Card data-testid="monthly-expense-trends-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant={safeVariant} size="md" decorative />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends',
              'Monthly Expense Trends'
            )}{' '}
            {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="monthly-expense-trends-error">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant={safeVariant} size="md" decorative />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends',
              'Monthly Expense Trends'
            )}{' '}
            {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <div>
              <p className="gba:text-sm">Error: {error.message}</p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Chart configuration for design system
  const chartConfig = useMemo(
    () => ({
      totalAmount: {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total Amount')
      }
    }),
    []
  )

  return (
    <Card data-testid="monthly-expense-trends-card">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ChartBarIcon} variant={safeVariant as any} size="md" decorative />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends',
            'Monthly Expense Trends'
          )}{' '}
          {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {monthlyTrends.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="monthly-expense-trends-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">No expense trends data found for {currentYear}.</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="gba:h-[320px] gba:w-full"
            data-testid="monthly-expense-trends-chart"
          >
            <BarChart data={monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" tick={{ fontSize: 12 }} interval={0} tickFormatter={getTranslatedMonthName} />
              <YAxis
                tickFormatter={value => formatCurrencyForChart(value, selectedCurrencyCode)}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="monthName" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="totalAmount"
                name="totalAmount"
                stroke={`var(--color-totalAmount)`}
                fill={`var(--color-totalAmount)`}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default MonthlyExpenseTrendsCard
