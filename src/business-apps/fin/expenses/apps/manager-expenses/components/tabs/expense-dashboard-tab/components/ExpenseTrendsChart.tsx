import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { formatCurrencyDisplay } from '../../../../../personal-expenses/utils'
import { useCurrencyStore } from '../../../../store/useCurrencyStore'
import { ChartBarIcon } from '@phosphor-icons/react'
import translations from '../../../../_i18n'

interface ExpenseTrendsChartProps {
  data: {
    month: string
    amount: number
  }[]
  title?: string
  currencyFilter?: string
  moduleColor?: string
}

/**
 * Component to display monthly expense trends as a bar chart
 */
const ExpenseTrendsChart: React.FC<ExpenseTrendsChartProps> = ({ data, title, currencyFilter, moduleColor }) => {
  const { t } = useTranslation(translations)
  const { primaryCurrency } = useCurrencyStore()

  const displayCurrency = currencyFilter || primaryCurrency

  const chartHeading = title ?? t('dashboard-monthly-expense-trends')

  const chartConfig = useMemo(
    () => ({
      amount: {
        label: t('dashboard-chart-amount-label')
      }
    }),
    [t]
  )

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
            {chartHeading}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:p-8" data-testid="expense-trends-chart-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">
              {t('dashboard-charts-empty-title')}
            </h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('dashboard-charts-empty-description')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
          {chartHeading}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[320px] gba:w-full" data-testid="expense-trends-chart">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={value => formatCurrencyDisplay(value, displayCurrency)}
              tick={{ fontSize: 12 }}
              data-testid="expense-trends-chart-y-axis"
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
            <Bar
              dataKey="amount"
              name="amount"
              stroke={`var(--color-amount)`}
              fill={`var(--color-amount)`}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground" data-testid="expense-trends-bucketing-note">
          {t('dashboard-bucketing-note')}
        </div>
      </CardContent>
    </Card>
  )
}

export default ExpenseTrendsChart
