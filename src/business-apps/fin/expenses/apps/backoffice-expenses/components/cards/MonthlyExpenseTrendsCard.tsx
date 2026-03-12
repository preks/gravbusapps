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
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart, Bar, CartesianGrid } from 'recharts'
import { MonthlyExpenseTrend } from '../../types'
import translations from '../../_i18n'
import { ChartBarIcon } from '@phosphor-icons/react'
import ExpenseBarChartDecorators from '../charts/ExpenseBarChartDecorators'
import { getChartColor } from '../../utils/chartColorUtils'

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
  const { t } = useTranslation(translations)
  const currentYear = new Date().getFullYear()

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

  const monthKeyMap: Record<string, string> = {
    Jan: 'month-short-jan',
    Feb: 'month-short-feb',
    Mar: 'month-short-mar',
    Apr: 'month-short-apr',
    May: 'month-short-may',
    Jun: 'month-short-jun',
    Jul: 'month-short-jul',
    Aug: 'month-short-aug',
    Sep: 'month-short-sep',
    Oct: 'month-short-oct',
    Nov: 'month-short-nov',
    Dec: 'month-short-dec'
  }

  const getTranslatedMonthName = (monthName: string): string => {
    const ftlKey = monthKeyMap[monthName]
    return ftlKey ? t(ftlKey) : monthName
  }

  const renderCardTitle = () => (
    <CardTitle className="gba:flex gba:items-center gba:gap-2">
      <IconAvatar icon={ChartBarIcon} variant={safeVariant} size="md" decorative />
      {t('chart-monthly-expense-trends')} {currentYear}
    </CardTitle>
  )

  const chartConfig = useMemo(
    () => ({
      totalAmount: {
        label: t('chart-total-amount'),
        color: getChartColor('chart1')
      }
    }),
    [t]
  )

  if (loading) {
    return (
      <Card data-testid="monthly-expense-trends-loading">
        <CardHeader>{renderCardTitle()}</CardHeader>
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
        <CardHeader>{renderCardTitle()}</CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <div>
              <p className="gba:text-sm">
                {t('common-error')}: {error.message}
              </p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="monthly-expense-trends-card">
      <CardHeader>{renderCardTitle()}</CardHeader>
      <CardContent>
        {monthlyTrends.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="monthly-expense-trends-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">{t('empty-no-data')}</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
              {t('empty-no-trends-data', { year: currentYear })}
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="gba:h-[320px] gba:w-full"
            data-testid="monthly-expense-trends-chart"
          >
            <BarChart data={monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <ExpenseBarChartDecorators
                xDataKey="monthName"
                tooltipLabelKey="monthName"
                selectedCurrencyCode={selectedCurrencyCode}
                xTickFormatter={getTranslatedMonthName}
              />
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
