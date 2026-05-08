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

export interface OpportunityVelocityData {
  flowTrend: { month: string; opportunitiesCreated: number; opportunitiesWon: number }[]
}

interface OpportunityVelocityAnalysisProps {
  data: OpportunityVelocityData
  moduleColor?: string
}

export const OpportunityVelocityAnalysis: React.FC<OpportunityVelocityAnalysisProps> = ({
  data,
  moduleColor = 'default'
}) => {
  const chartConfig = {
    opportunitiesCreated: {
      label: 'Opportunities Created'
    },
    opportunitiesWon: {
      label: 'Opportunities Won'
    }
  } satisfies ChartConfig

  return (
    <Card data-testid="opportunity-velocity-analysis">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Opportunity Flow Trend</CardTitle>
          <CardDescription>Created and won opportunities over the last 6 months</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:h-80">
          <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
            <LineChart data={data.flowTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="opportunitiesCreated"
                stroke="var(--color-opportunitiesCreated)"
                strokeWidth={3}
              />
              <Line type="monotone" dataKey="opportunitiesWon" stroke="var(--color-opportunitiesWon)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunityVelocityAnalysis
