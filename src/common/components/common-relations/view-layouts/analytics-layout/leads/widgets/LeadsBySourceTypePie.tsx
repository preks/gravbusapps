import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'

export interface LeadsBySourceTypeItem {
  sourceType: string
  count: number
}

export interface LeadsBySourceTypePieProps {
  data: LeadsBySourceTypeItem[]
  moduleColor?: string
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const LeadsBySourceTypePie: React.FC<LeadsBySourceTypePieProps> = ({ data }) => {
  const dataKey = 'leads'
  const nameKey = 'sourceType'

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toKey(item.sourceType)
      return {
        [nameKey]: key,
        [dataKey]: item.count,
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      const key = toKey(item.sourceType)
      config[key] = { label: item.sourceType }
    })
    return config as ChartConfig
  }, [data])

  return (
    <Card data-testid="leads-by-source-type-chart" className="gba:flex gba:flex-col">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <div>
          <CardTitle>Leads by Source Type</CardTitle>
          <CardDescription>Distribution by source type</CardDescription>
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

export default LeadsBySourceTypePie
