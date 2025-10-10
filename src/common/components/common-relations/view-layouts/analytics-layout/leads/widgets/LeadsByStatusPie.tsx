import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@newwork/nw-design-system'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'

export interface LeadsByStatusItem {
  status: string
  count: number
}

export interface LeadsByStatusPieProps {
  data: LeadsByStatusItem[]
  moduleColor?: string
}

const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const LeadsByStatusPie: React.FC<LeadsByStatusPieProps> = ({ data, moduleColor }) => {
  const dataKey = 'leads'
  const nameKey = 'status'

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toKey(item.status)
      return {
        [nameKey]: key,
        [dataKey]: item.count,
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {
      [dataKey]: {}
    }
    data.forEach(item => {
      const key = toKey(item.status)
      config[key] = { label: item.status }
    })
    return config as ChartConfig
  }, [data])

  const totalLeads = useMemo(() => {
    return data?.reduce((sum, item) => sum + item.count, 0) || 0
  }, [data])

  return (
    <Card data-testid="leads-by-status-chart" className="gba:flex gba:flex-col">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <div>
          <CardTitle>Leads by Status</CardTitle>
          <CardDescription>Distribution by status</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[300px] gba:pb-0"
        >
          <PieChart>
            <Pie data={chartData} cx="50%" cy="40%" outerRadius={75} dataKey={dataKey} nameKey={nameKey} />
            <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
            <ChartLegend
              content={
                <ChartLegendContent className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center" />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default LeadsByStatusPie
