import React from 'react'
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
import { LineChart, Line, XAxis, YAxis } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'
import { createChartTooltipFormatter } from '../../shared/lifecycleChartUtils'

export interface OpportunityVelocityData {
  flowTrend: {
    month: string
    startDate: string
    endDate: string
    opportunitiesCreated: number
    opportunitiesWon: number
  }[]
}

interface OpportunityVelocityAnalysisProps {
  data: OpportunityVelocityData
  moduleColor?: string
  onPointClick?: (
    label: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon'
  ) => void
  renderDrillDown?: React.ReactNode
}

const velocityChartConfig = {
  opportunitiesCreated: { label: 'Opportunities Created' },
  opportunitiesWon: { label: 'Opportunities Won' }
} satisfies ChartConfig

const velocityTooltipFormatter = createChartTooltipFormatter(velocityChartConfig)

export const OpportunityVelocityAnalysis: React.FC<OpportunityVelocityAnalysisProps> = ({
  data,
  moduleColor = 'default',
  onPointClick,
  renderDrillDown
}) => {
  return (
    <>
      <Card data-testid="opportunity-velocity-analysis">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={TrendUpIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>Opportunity Flow Trend</CardTitle>
            <CardDescription>Created and won opportunities over the last 6 months</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`gba:h-80${onPointClick ? ' gba:cursor-pointer' : ''}`}>
            <ChartContainer config={velocityChartConfig} className="gba:w-full gba:h-full">
              <LineChart
                data={data.flowTrend}
                onClick={clickData => {
                  if (!onPointClick || clickData?.activeTooltipIndex == null) return
                  const point = data.flowTrend[clickData.activeTooltipIndex as number]
                  if (!point) return
                  onPointClick(point.month, point.startDate, point.endDate, 'opportunitiesCreated')
                }}
              >
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent labelKey="month" formatter={velocityTooltipFormatter} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="opportunitiesCreated"
                  stroke="var(--color-opportunitiesCreated)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="opportunitiesWon"
                  stroke="var(--color-opportunitiesWon)"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      {renderDrillDown}
    </>
  )
}

export default OpportunityVelocityAnalysis
