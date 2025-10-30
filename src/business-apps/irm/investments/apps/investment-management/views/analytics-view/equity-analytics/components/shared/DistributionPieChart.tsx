import React, { useMemo, useCallback } from 'react'
import { PieChart, Pie, Cell, TooltipProps } from 'recharts'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { Icon } from '@phosphor-icons/react'

interface DistributionData {
  type: string
  count?: number
  totalAmount?: number
  percentage?: number
  [key: string]: any
}

interface DistributionPieChartProps {
  title: string
  description: string
  icon: Icon
  iconVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  data: DistributionData[]
  valueType: 'count' | 'amount'
  currency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
  formatCurrency?: (amount: number, currency: string) => string
}

// Custom tooltip component for distribution pie charts
const DistributionTooltipContent: React.FC<
  TooltipProps<number, string> & {
    valueType: 'count' | 'amount'
    currency?: string
    formatCurrency?: (amount: number, currency: string) => string
    chartData: any[]
  }
> = ({ active, payload, valueType, currency, formatCurrency, chartData }) => {
  if (!active || !payload?.length) {
    return null
  }

  const dataPoint = payload[0]

  // Calculate percentage of total
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const percentage = total > 0 ? ((dataPoint.value as number) / total) * 100 : 0

  return (
    <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
        <div
          className="gba:w-3 gba:h-3 gba:rounded-full"
          style={{ backgroundColor: `var(--color-${dataPoint.payload.name})` }}
        />
        <span className="gba:font-medium gba:text-gray-700">{dataPoint.payload.type}</span>
      </div>
      <div className="gba:text-lg gba:font-semibold gba:text-gray-900">
        {(() => {
          if (valueType === 'count') {
            return `${dataPoint.value} investments`
          }
          if (formatCurrency && currency) {
            return formatCurrency(dataPoint.value as number, currency)
          }
          return dataPoint.value
        })()}
      </div>
      <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
    </div>
  )
}

export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({
  title,
  description,
  icon,
  iconVariant = 'default',
  data,
  valueType,
  currency,
  onCurrencyChange,
  availableCurrencies,
  formatCurrency
}) => {
  // Generate chart configuration
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of data) {
      const key = item.type.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.type }
    }
    return config
  }, [data])

  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((item: any) => ({
      ...item,
      name: item.type.toLowerCase().replaceAll(/\s+/g, ''),
      value: valueType === 'count' ? item.count : item.totalAmount
    }))
  }, [data, valueType])

  // Memoized tooltip render function
  const renderTooltip = useCallback(
    (props: any) => (
      <DistributionTooltipContent
        {...props}
        valueType={valueType}
        currency={currency}
        formatCurrency={formatCurrency}
        chartData={chartData}
      />
    ),
    [valueType, currency, formatCurrency, chartData]
  )

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={icon} variant={iconVariant} size="md" decorative />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {currency && onCurrencyChange && availableCurrencies ? (
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="gba:w-24 gba:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(curr => (
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="gba:w-24 gba:h-8"></div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[350px] gba:w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="var(--color-default)"
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry: any) => {
                const key = entry.type.toLowerCase().replaceAll(/\s+/g, '')
                return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
              })}
            </Pie>
            <ChartTooltip content={renderTooltip} />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
