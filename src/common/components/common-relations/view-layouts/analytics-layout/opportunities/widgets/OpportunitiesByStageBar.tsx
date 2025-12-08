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
import { ChartBarIcon } from '@phosphor-icons/react'
import { OpportunitiesStageChartProps } from './types'
import { PipelineSelector } from './PipelineSelector'

export const OpportunitiesByStageBar: React.FC<OpportunitiesStageChartProps> = ({
  data,
  moduleColor = 'default',
  pipelines = [],
  selectedPipelineId,
  onPipelineChange
}) => {
  // Format large numbers for Y-axis
  const formatYAxis = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Opportunities'
        }
      }) satisfies ChartConfig,
    []
  )
  return (
    <Card data-testid="opportunities-by-stage-chart">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar
              icon={ChartBarIcon}
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
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:w-full gba:h-[300px]">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatYAxis} width={60} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value: number) => [`${value}`, 'Opportunities']} />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunitiesByStageBar
