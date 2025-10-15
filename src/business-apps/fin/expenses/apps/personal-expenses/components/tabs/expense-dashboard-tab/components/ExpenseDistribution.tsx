import React, { useMemo } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { DashboardStats } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpenseDistributionProps {
  stats: DashboardStats | undefined
  chartView: string | number
}

const CHART_COLORS = ['#1890FF', '#2FC25B', '#FACC14', '#223273', '#8543E0', '#13C2C2', '#3436C7', '#F04864']

export const ExpenseDistribution: React.FC<ExpenseDistributionProps> = ({ stats, chartView }) => {
  const getExpensesByType = () => {
    // Get translated period labels for comparison
    const quarterlyLabel = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.quarterly', 'Quarterly')
    const yearlyLabel = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.yearly', 'Yearly')
    const monthlyLabel = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.monthly', 'Monthly')

    switch (chartView) {
      case quarterlyLabel:
        return stats?.expensesByTypeQuarter || {}
      case yearlyLabel:
        return stats?.expensesByTypeYear || {}
      case monthlyLabel:
      default:
        return stats?.expensesByTypeMonth || {}
    }
  }

  const expensesByType = getExpensesByType()

  // Transform data for chart
  const chartData = useMemo(() => {
    const data = Object.entries(expensesByType)
      .map(([type, amount], index) => ({
        name: type,
        value: amount as number,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)

    // Calculate total and add percentages
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
    }))
  }, [expensesByType])

  // Custom label function for pie chart
  const renderLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  // Create chart configuration
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
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.expense_distribution',
              'Expense Distribution'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.no_expense_data_available',
                'No expense data available'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="expense-distribution-card">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_distribution', 'Expense Distribution')}
        </CardTitle>
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
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default ExpenseDistribution
