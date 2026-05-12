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
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'

export interface LeadsBySourceItem {
  source: string
  sourceRef?: string
  count: number
}

export interface LeadsBySourcePieProps {
  data: LeadsBySourceItem[]
  moduleColor?: string
  isLoading?: boolean
  onSliceClick?: (label: string, ref: string) => void
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const LeadsBySourcePie: React.FC<LeadsBySourcePieProps> = ({ data, isLoading = false, onSliceClick }) => {
  const dataKey = 'leads'
  const nameKey = 'source'

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toKey(item.source)
      return {
        [nameKey]: key,
        [dataKey]: item.count,
        _label: item.source,
        _ref: item.sourceRef ?? '',
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      const key = toKey(item.source)
      config[key] = { label: item.source }
    })
    return config as ChartConfig
  }, [data])

  const labelByKey = useMemo(() => {
    const map: Record<string, string> = {}
    data?.forEach(item => {
      map[toKey(item.source)] = item.source
    })
    return map
  }, [data])

  if (isLoading) {
    return (
      <Card data-testid="leads-by-source-chart" className="gba:flex gba:flex-col">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <div>
            <CardTitle>Leads by Source</CardTitle>
            <CardDescription>Distribution by source</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:pb-0">
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="leads-by-source-chart" className="gba:flex gba:flex-col">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <div>
          <CardTitle>Leads by Source</CardTitle>
          <CardDescription>Distribution by source</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[300px] gba:pb-0"
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="40%"
              outerRadius={75}
              dataKey={dataKey}
              nameKey={nameKey}
              isAnimationActive={false}
            >
              {chartData.map(entry => (
                <Cell
                  key={String(entry[nameKey])}
                  fill={entry.fill as string}
                  cursor={onSliceClick ? 'pointer' : undefined}
                  onClick={onSliceClick ? () => onSliceClick(entry._label as string, entry._ref as string) : undefined}
                />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  labelKey={dataKey}
                  nameKey={nameKey}
                  formatter={(value: number, name: string) => {
                    const displayName = labelByKey[name] ?? name
                    return [`${displayName} ${value}`, '']
                  }}
                />
              }
            />
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

export default LeadsBySourcePie
