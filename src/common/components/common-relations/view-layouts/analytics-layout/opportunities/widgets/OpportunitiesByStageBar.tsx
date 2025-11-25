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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'

export interface StageItem {
  stage: string
  count: number
  value: number
}

interface OpportunitiesByStageBarProps {
  data: StageItem[]
  moduleColor?: string
  pipelines?: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
}

export const OpportunitiesByStageBar: React.FC<OpportunitiesByStageBarProps> = ({
  data,
  moduleColor = 'default',
  pipelines = [],
  selectedPipelineId,
  onPipelineChange
}) => {
  // Use first pipeline as default if no selection
  const effectivePipelineId = selectedPipelineId || (pipelines.length > 0 ? pipelines[0].id : undefined)

  const handlePipelineChange = (value: string) => {
    onPipelineChange?.(value)
  }

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
          {pipelines.length > 0 && onPipelineChange && (
            <div className="gba:min-w-48">
              <Select value={effectivePipelineId} onValueChange={handlePipelineChange}>
                <SelectTrigger data-testid="opportunities-stage-pipeline-selector">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
