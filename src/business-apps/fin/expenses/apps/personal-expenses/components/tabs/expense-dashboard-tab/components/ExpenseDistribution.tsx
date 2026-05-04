import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  useTranslation,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { DashboardStats } from '../types'
import personalTranslations from '../../../../_i18n'

interface ExpenseDistributionProps {
  stats: DashboardStats | undefined
  period: 'monthly' | 'quarterly' | 'yearly'
}

const CHART_COLORS = ['#1890FF', '#2FC25B', '#FACC14', '#223273', '#8543E0', '#13C2C2', '#3436C7', '#F04864']

export const ExpenseDistribution: React.FC<ExpenseDistributionProps> = ({ stats, period }) => {
  const { t } = useTranslation(personalTranslations)

  const getExpensesByType = () => {
    switch (period) {
      case 'quarterly':
        return stats?.expensesByTypeQuarter || {}
      case 'yearly':
        return stats?.expensesByTypeYear || {}
      case 'monthly':
      default:
        return stats?.expensesByTypeMonth || {}
    }
  }

  const expensesByType = getExpensesByType()

  const chartData = useMemo(() => {
    const data = Object.entries(expensesByType)
      .map(([type, amount], index) => ({
        name: type,
        value: amount as number,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
    }))
  }, [expensesByType])

  const renderLabel = (entry: { percentage: string }) => {
    return `${entry.percentage}%`
  }

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    chartData.forEach((item, index) => {
      config[item.name.toLowerCase().replace(/\s+/g, '-')] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }
    })
    return config
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <Card data-testid="expense-distribution-card-empty">
        <CardHeader>
          <CardTitle>{t('dashboard-expense-distribution-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>{t('dashboard-expense-distribution-empty')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="expense-distribution-card">
      <CardHeader>
        <CardTitle>{t('dashboard-expense-distribution-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="gba:h-[300px]"
          data-testid="expense-distribution-chart-container"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              innerRadius="60%"
              strokeWidth={2}
              label={renderLabel}
            />
            <ChartLegend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default ExpenseDistribution
