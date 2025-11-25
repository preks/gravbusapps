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
  ChartLegendContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPieIcon } from '@phosphor-icons/react'

export interface StageItem {
  stage: string
  count: number
  value: number
}

interface OpportunitiesByStagePieProps {
  data: StageItem[]
  moduleColor?: string
  pipelines?: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const OpportunitiesByStagePie: React.FC<OpportunitiesByStagePieProps> = ({
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

  const dataKey = 'opportunities'
  const nameKey = 'stage'

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toKey(item.stage)
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
      const key = toKey(item.stage)
      config[key] = { label: item.stage }
    })
    return config as ChartConfig
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
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[400px] gba:pb-0"
        >
          <PieChart>
            <Pie data={chartData} cx="50%" cy="40%" outerRadius={100} dataKey={dataKey} nameKey={nameKey} />
            <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
            <ChartLegend content={<ChartLegendContent className="gba:flex-wrap gba:gap-4 [&>*]:whitespace-nowrap" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunitiesByStagePie
