import React, { useMemo } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
// import { formatCurrency } from '../utils/formatters';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'

interface ComparisonCardProps {
  title: string
  currentValue: number
  previousValue: number
  currentLabel: string
  previousLabel: string
  currencyCode?: string
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  currentValue,
  previousValue,
  currentLabel,
  previousLabel,
  currencyCode = 'EUR'
}) => {
  // Transform data for chart
  const chartData = useMemo(
    () => [
      {
        period: currentLabel,
        value: currentValue,
        fill: '#3B82F6'
      },
      {
        period: previousLabel,
        value: previousValue,
        fill: '#9CA3AF'
      }
    ],
    [currentValue, previousValue, currentLabel, previousLabel]
  )

  // Create chart configuration
  const chartConfig = useMemo(
    () => ({
      current: {
        label: currentLabel,
        color: '#3B82F6'
      },
      previous: {
        label: previousLabel,
        color: '#9CA3AF'
      }
    }),
    [currentLabel, previousLabel]
  )

  return (
    <Card data-testid={`comparison-card-${title.toLowerCase().replace(' ', '-')}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }} data-testid="comparison-card-content">
          {/* Statistics Display */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-6 gba:items-start">
            <div className="gba:text-center">
              <div
                className="gba:text-2xl gba:font-bold gba:text-blue-600 gba:min-h-[2.5rem] gba:flex gba:items-center gba:justify-center"
                data-testid="current-period-statistic"
              >
                {formatCurrencyDisplay(currentValue, currencyCode)}
              </div>
              <div className="gba:text-sm gba:text-gray-500 gba:mt-2">{currentLabel}</div>
            </div>
            <div className="gba:text-center">
              <div
                className="gba:text-2xl gba:font-bold gba:text-gray-500 gba:min-h-[2.5rem] gba:flex gba:items-center gba:justify-center"
                data-testid="previous-period-statistic"
              >
                {formatCurrencyDisplay(previousValue, currencyCode)}
              </div>
              <div className="gba:text-sm gba:text-gray-500 gba:mt-2">{previousLabel}</div>
            </div>
          </div>

          {/* Chart Visualization */}
          <ChartContainer config={chartConfig} className="gba:h-[180px]" data-testid="comparison-chart">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                textAnchor="middle"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={value => formatCurrencyDisplay(value, currencyCode)}
                width={80}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: any) => [
                      formatCurrencyDisplay(Number(value), currencyCode),
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.amount',
                        'Amount'
                      )
                    ]}
                  />
                }
              />
              <Bar dataKey="value" fill="var(--nw-color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default ComparisonCard
