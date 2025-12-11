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
  SelectValue,
  Spinner
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
  isLoading?: boolean
  error?: string | null
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
  formatCurrency,
  isLoading = false,
  error = null
}) => {
  // Transform data for chart and filter out zero/undefined values
  const chartData = useMemo(() => {
    return data
      .filter((item: any) => {
        const value = valueType === 'count' ? item.count : item.totalAmount
        // Strict validation: must have type, value must be positive number
        return (
          item.type &&
          item.type.trim() !== '' &&
          value &&
          typeof value === 'number' &&
          value > 0 &&
          !Number.isNaN(value)
        )
      })
      .map((item: any) => {
        const normalizedName = item.type.toLowerCase().replaceAll(/\s+/g, '')
        return {
          ...item,
          name: normalizedName,
          type: item.type,
          value: valueType === 'count' ? item.count : item.totalAmount
        }
      })
  }, [data, valueType])

  // Generate chart configuration only for items with actual values
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    // Only add config for items that are in chartData
    chartData.forEach(item => {
      if (item.name && item.name.trim() !== '') {
        config[item.name] = { label: item.type }
      }
    })
    return config
  }, [chartData])

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

  // Custom legend that only shows items in chartData
  const customLegendContent = useCallback(
    (props: any) => {
      const { payload } = props
      if (!payload || !Array.isArray(payload)) return null

      // Only show legend items that have data
      const filteredPayload = payload.filter((item: any) => {
        return chartData.some((dataItem: any) => dataItem.name === item.value)
      })

      return <ChartLegendContent {...props} payload={filteredPayload} />
    },
    [chartData]
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
        {(() => {
          // Show loading state
          if (isLoading) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                <Spinner size="lg" />
              </div>
            )
          }

          // Show error state
          if (error) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                <span className="gba:text-destructive gba:text-sm gba:font-medium">Error loading data</span>
                <span className="gba:text-gray-500 gba:text-xs">{error}</span>
              </div>
            )
          }

          // Show chart or empty state
          if (chartData.length > 0) {
            return (
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
                    {chartData.map((entry: any) => (
                      <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                    ))}
                  </Pie>
                  <ChartTooltip content={renderTooltip} />
                  <ChartLegend content={customLegendContent} />
                </PieChart>
              </ChartContainer>
            )
          }

          // Show empty state only if not loading and no data
          return (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
              <span className="gba:text-gray-500 gba:text-sm gba:font-medium">No data available</span>
              <span className="gba:text-gray-400 gba:text-xs">Try selecting a different currency</span>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
