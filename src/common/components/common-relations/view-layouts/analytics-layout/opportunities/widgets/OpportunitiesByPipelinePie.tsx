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
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPieIcon } from '@phosphor-icons/react'

export interface PipelineItem {
  pipeline: string
  count: number
  percentage: number
}

interface OpportunitiesByPipelinePieProps {
  data: PipelineItem[]
  moduleColor?: string
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const OpportunitiesByPipelinePie: React.FC<OpportunitiesByPipelinePieProps> = ({
  data,
  moduleColor = 'default'
}) => {
  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      const key = toKey(item.pipeline)
      config[key] = { label: item.pipeline }
    })
    return config as ChartConfig
  }, [data])

  const chartData = useMemo(() => {
    return data.map(item => {
      const key = toKey(item.pipeline)
      return {
        [key]: item.count,
        pipeline: item.pipeline,
        value: item.count,
        count: item.count,
        percentage: item.percentage,
        fill: `var(--color-${key})`
      }
    })
  }, [data])

  if (data.length === 0) {
    return (
      <Card data-testid="opportunities-by-pipeline-chart">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={ChartPieIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>Opportunities by Pipeline</CardTitle>
            <CardDescription>Pipeline distribution overview</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-[200px] gba:text-muted-foreground">
            No pipeline data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="opportunities-by-pipeline-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Opportunities by Pipeline</CardTitle>
          <CardDescription>Pipeline distribution overview</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:w-full gba:h-[200px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={60}
              dataKey="value"
              nameKey="pipeline"
              label={({ percentage }) => `${percentage}%`}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload
                  const total = chartData.reduce((s, i) => s + i.count, 0)
                  const percentage = total > 0 ? ((data.count / total) * 100).toFixed(1) : '0.0'
                  return (
                    <div className="gba:bg-white gba:p-2 gba:border gba:rounded gba:shadow">
                      <p className="gba:font-medium">{data.pipeline}</p>
                      <p className="gba:text-sm">
                        {data.count} ({percentage}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunitiesByPipelinePie
