import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  IconAvatar
} from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { PipelineSelector } from '../../opportunities/widgets/PipelineSelector'
import type { Pipeline, StageItem } from '../../opportunities/widgets/types'

export interface OpenPipelineByStageChartProps {
  data: StageItem[]
  isLoading?: boolean
  moduleColor?: string
  pipelines?: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
  onStageClick?: (stage: string, stageRef: string, pipelineId?: string) => void
}

export const OpenPipelineByStageChart: React.FC<OpenPipelineByStageChartProps> = ({
  data,
  isLoading = false,
  moduleColor = 'default',
  pipelines = [],
  selectedPipelineId,
  onPipelineChange,
  onStageClick
}) => {
  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Open Opportunities'
        }
      }) satisfies ChartConfig,
    []
  )
  const totalOpenOpportunities = useMemo(() => data.reduce((sum, stage) => sum + stage.count, 0), [data])

  const renderHeader = () => (
    <CardHeader>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative />
          <div>
            <CardTitle>Open Pipeline by Stage</CardTitle>
            <CardDescription>Open opportunities grouped by pipeline stage</CardDescription>
          </div>
        </div>
        <PipelineSelector
          pipelines={pipelines}
          selectedPipelineId={selectedPipelineId}
          onPipelineChange={onPipelineChange}
          dataTestId="open-pipeline-stage-selector"
        />
      </div>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card data-testid="open-pipeline-by-stage-loading">
        {renderHeader()}
        <CardContent>
          <div className="gba:flex gba:h-48 gba:items-center gba:justify-center gba:text-muted-foreground">
            Loading open pipeline stages...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card data-testid="open-pipeline-by-stage-empty">
        {renderHeader()}
        <CardContent>
          <div className="gba:flex gba:h-48 gba:items-center gba:justify-center gba:text-muted-foreground">
            No open opportunity stage data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="open-pipeline-by-stage-chart">
      {renderHeader()}
      <CardContent>
        <div className="gba:space-y-3">
          <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-center gba:bg-gray-50 gba:p-2 gba:rounded-lg">
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{data.length}</div>
              <div className="gba:text-xs gba:text-gray-600">Stages</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{totalOpenOpportunities}</div>
              <div className="gba:text-xs gba:text-gray-600">Open Opportunities</div>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="gba:h-48 gba:w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 40, bottom: 5 }}
              style={onStageClick ? { cursor: 'pointer' } : undefined}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={75} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => [`${value} Open`, '']} />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[0, 3, 3, 0]}
                onClick={(item: StageItem) => {
                  if (onStageClick && item?.stage && item?.stageRef) {
                    onStageClick(item.stage, item.stageRef, selectedPipelineId)
                  }
                }}
                style={onStageClick ? { cursor: 'pointer' } : undefined}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpenPipelineByStageChart
