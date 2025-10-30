import React, { useMemo, useCallback } from 'react'
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
import { PieChart, Pie, Cell } from 'recharts'
import { CurrencyCircleDollarIcon, ChartDonutIcon } from '@phosphor-icons/react'
import type { DistributionData } from './distributionUtils'

// Distribution chart tooltip component for investment count
interface DistributionCountTooltipContentProps {
  active?: boolean
  payload?: any[]
  chartData: any[]
}

const DistributionCountTooltipContent: React.FC<DistributionCountTooltipContentProps> = ({
  active,
  payload,
  chartData
}) => {
  if (active && payload?.length) {
    const dataPoint = payload[0].payload

    // Calculate percentage of total
    const total = chartData.reduce((sum: number, item: any) => sum + item.count, 0)
    const percentage = total > 0 ? (dataPoint.count / total) * 100 : 0

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${dataPoint.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{dataPoint.type}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{dataPoint.count} investments</div>
        <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
      </div>
    )
  }
  return null
}

interface InvestmentSizeChartProps {
  data: DistributionData[]
  currency: string
  onCurrencyChange: (currency: string) => void
  availableCurrencies: string[]
  isLoading?: boolean
  error?: string | null
}

export const InvestmentSizeChart: React.FC<InvestmentSizeChartProps> = ({
  data,
  currency,
  onCurrencyChange,
  availableCurrencies,
  isLoading = false,
  error = null
}) => {
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    // Create config with explicit order to maintain sort
    for (const [index, item] of data.entries()) {
      const key = `range${index}`
      config[key] = { label: item.type }
    }
    return config
  }, [data])

  // Memoized tooltip render function
  const renderTooltip = useCallback(
    (props: any) => <DistributionCountTooltipContent {...props} chartData={data} />,
    [data]
  )

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={CurrencyCircleDollarIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle>Investment Size ({currency})</CardTitle>
              <CardDescription>Distribution by investment amount ranges</CardDescription>
            </div>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                <div className="gba:text-gray-500 gba:text-lg">Loading investment size data...</div>
              </div>
            )
          }
          if (error) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{error}</div>
              </div>
            )
          }
          if (data.length === 0) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                <div className="gba:text-gray-500 gba:text-lg">No investment size data available for {currency}</div>
              </div>
            )
          }
          return (
            <ChartContainer config={chartConfig} className="gba:h-[350px] gba:w-full">
              <PieChart>
                <Pie
                  data={data.map((item: any, index: any) => ({
                    ...item,
                    name: `range${index}`,
                    value: item.count,
                    sortOrder: index
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry: any, index: number) => {
                    const key = `range${index}`
                    return <Cell key={`cell-${entry.type}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          )
        })()}
      </CardContent>
    </Card>
  )
}

interface InvestmentDurationChartProps {
  data: DistributionData[]
  currency: string
  onCurrencyChange: (currency: string) => void
  availableCurrencies: string[]
  isLoading?: boolean
  error?: string | null
}

export const InvestmentDurationChart: React.FC<InvestmentDurationChartProps> = ({
  data,
  currency,
  onCurrencyChange,
  availableCurrencies,
  isLoading = false,
  error = null
}) => {
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    // Create config with explicit order to maintain sort
    for (const [index, item] of data.entries()) {
      const key = `duration${index}`
      config[key] = { label: item.type }
    }
    return config
  }, [data])

  // Memoized tooltip render function
  const renderTooltip = useCallback(
    (props: any) => <DistributionCountTooltipContent {...props} chartData={data} />,
    [data]
  )

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartDonutIcon} variant="secondary" size="md" decorative />
            <div>
              <CardTitle>Investment Duration ({currency})</CardTitle>
              <CardDescription>Distribution by holding period</CardDescription>
            </div>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                <div className="gba:text-gray-500 gba:text-lg">Loading investment duration data...</div>
              </div>
            )
          }
          if (error) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{error}</div>
              </div>
            )
          }
          if (data.length === 0) {
            return (
              <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                <div className="gba:text-gray-500 gba:text-lg">No investment duration data available</div>
              </div>
            )
          }
          return (
            <ChartContainer config={chartConfig} className="gba:h-[350px] gba:w-full">
              <PieChart>
                <Pie
                  data={data.map((item: any, index: any) => ({
                    ...item,
                    name: `duration${index}`,
                    value: item.count,
                    sortOrder: index
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry: any, index: number) => {
                    const key = `duration${index}`
                    return <Cell key={`cell-${entry.type}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          )
        })()}
      </CardContent>
    </Card>
  )
}
