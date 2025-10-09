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
}

export const OpportunitiesByStageBar: React.FC<OpportunitiesByStageBarProps> = ({ data, moduleColor = 'default' }) => {
  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Opportunities'
        },
        value: {
          label: 'Total Value'
        }
      }) satisfies ChartConfig,
    []
  )
  return (
    <Card data-testid="opportunities-by-stage-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Opportunities by Stage</CardTitle>
          <CardDescription>Stage progression analysis</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:w-full gba:h-[300px]">
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value}` : `€${Number(value).toLocaleString()}`,
                    name === 'count' ? 'Opportunities' : 'Total Value'
                  ]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunitiesByStageBar
