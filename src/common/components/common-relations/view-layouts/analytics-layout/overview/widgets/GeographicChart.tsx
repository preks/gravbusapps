import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { GlobeIcon } from '@phosphor-icons/react'

export interface GeographicData {
  country: string
  accounts: number
}

export interface GeographicChartProps {
  data: GeographicData[]
  isLoading?: boolean
  moduleColor?: string
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const GeographicChart: React.FC<GeographicChartProps> = ({ data, isLoading, moduleColor = 'default' }) => {
  const dataKey = 'accounts'
  const nameKey = 'country'

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.slice(0, 5).map(item => {
      const key = toKey(item.country)
      const shortName = item.country.length > 12 ? item.country.substring(0, 10) + '...' : item.country
      return {
        [nameKey]: shortName,
        fullName: item.country,
        [dataKey]: item.accounts,
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {
      [dataKey]: {}
    }
    data.slice(0, 5).forEach(item => {
      const key = toKey(item.country)
      config[key] = { label: item.country }
    })
    return config as ChartConfig
  }, [data])

  const totalAccounts = useMemo(() => {
    return data?.reduce((sum, country) => sum + country.accounts, 0) || 0
  }, [data])

  if (isLoading) {
    return (
      <Card data-testid="geographic-chart-loading">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={GlobeIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Accounts by country</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-gray-500">Loading geographic data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card data-testid="geographic-chart-empty">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={GlobeIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Accounts by country</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <GlobeIcon className="gba:text-4xl gba:mb-4 gba:opacity-50" />
            <p className="gba:font-medium gba:mb-2">No geographic data available</p>
            <p className="gba:text-sm gba:max-w-md gba:mx-auto gba:leading-relaxed">
              Accounts need country information in their addresses or country references.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="geographic-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={GlobeIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Top 5 Countries by Accounts</CardTitle>
          <CardDescription>Geographic distribution</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-center gba:bg-gray-50 gba:p-2 gba:rounded-lg">
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{chartData.length}</div>
              <div className="gba:text-xs gba:text-gray-600">Countries</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{totalAccounts}</div>
              <div className="gba:text-xs gba:text-gray-600">Accounts</div>
            </div>
          </div>
          <div className="gba:h-48">
            <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 40, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey={nameKey} width={35} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => {
                        return label
                      }}
                    />
                  }
                />
                <Bar dataKey={dataKey} radius={[0, 3, 3, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GeographicChart
