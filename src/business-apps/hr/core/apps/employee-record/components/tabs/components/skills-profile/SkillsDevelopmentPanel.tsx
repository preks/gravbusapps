import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { SkillDistribution } from './skillsProfile.utils'

interface SkillsDevelopmentPanelProps {
  distribution: SkillDistribution[]
  t: (key: string, args?: Record<string, unknown>) => string
}

export const SkillsDevelopmentPanel: React.FC<SkillsDevelopmentPanelProps> = ({ distribution, t }) => {
  const chartColor = 'var(--nw-chart-2)'
  const chartData = useMemo(
    () =>
      distribution.map(item => ({
        name: item.label,
        count: item.count,
        fill: chartColor
      })),
    [distribution]
  )

  const chartConfig = useMemo(
    (): ChartConfig => ({
      count: { label: t('skills-development-distribution'), color: chartColor }
    }),
    [t]
  )

  const hasDistribution = chartData.some(d => d.count > 0)

  return (
    <Card data-testid="skills-distribution-card" className="gba:h-full">
      <CardHeader className="gba:px-4 gba:pt-3 gba:pb-1">
        <CardTitle className="gba:text-sm gba:font-bold">{t('skills-development-distribution')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:px-4 gba:pb-3 gba:pt-0">
        {hasDistribution ? (
          <ChartContainer config={chartConfig} className="gba:h-[120px] gba:w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 4, top: 2, bottom: 2 }}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <XAxis type="category" dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis type="number" allowDecimals={false} width={22} tick={{ fontSize: 10 }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <p className="gba:text-xs gba:text-muted-foreground">{t('skills-development-distribution-empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
