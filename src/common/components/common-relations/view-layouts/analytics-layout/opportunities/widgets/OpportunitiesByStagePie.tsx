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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPieIcon } from '@phosphor-icons/react'
import { OpportunitiesStageChartProps, toChartKey } from './types'
import { PipelineSelector } from './PipelineSelector'

export const OpportunitiesByStagePie: React.FC<OpportunitiesStageChartProps> = ({
  data,
  moduleColor = 'default',
  pipelines = [],
  selectedPipelineId,
  onPipelineChange,
  onStageClick
}) => {
  const dataKey = 'opportunities'
  const nameKey = 'stage'

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toChartKey(item.stage)
      return {
        [nameKey]: key,
        [dataKey]: item.count,
        fill: `var(--color-${key})`,
        stageRef: item.stageRef,
        stageName: item.stage
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      const key = toChartKey(item.stage)
      config[key] = { label: item.stage }
    })
    return config as ChartConfig
  }, [data])

  const stageNameByKey = useMemo(() => {
    if (!data) return {} as Record<string, string>
    return Object.fromEntries(data.map(item => [toChartKey(item.stage), item.stage]))
  }, [data])

  return (
    <Card data-testid="opportunities-by-stage-chart" className="gba:flex gba:flex-col">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar
              icon={ChartPieIcon}
              variant={moduleColor as any}
              size="md"
              iconWeight="regular"
              decorative={true}
            />
            <div>
              <CardTitle>Opportunities by Stage</CardTitle>
              <CardDescription>Stage progression analysis</CardDescription>
            </div>
          </div>
          <PipelineSelector
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            onPipelineChange={onPipelineChange}
            dataTestId="opportunities-stage-pipeline-selector"
          />
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[400px] gba:pb-0"
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="40%"
              outerRadius={100}
              dataKey={dataKey}
              nameKey={nameKey}
              style={onStageClick ? { cursor: 'pointer' } : undefined}
              onClick={(item: any) => {
                if (onStageClick && item?.stageRef && item?.stageName) {
                  onStageClick(item.stageName, item.stageRef)
                }
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  labelKey={dataKey}
                  nameKey={nameKey}
                  formatter={(value: number, name: string) => {
                    const displayName = stageNameByKey[name] ?? name
                    return [`${displayName} ${value}`, '']
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent className="gba:flex-wrap gba:gap-4 [&>*]:whitespace-nowrap" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunitiesByStagePie
