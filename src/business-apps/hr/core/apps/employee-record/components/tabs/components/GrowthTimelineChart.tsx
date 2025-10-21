'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot } from 'recharts'
import { GrowthData } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface GrowthTimelineChartProps {
  growthData: GrowthData
  loading: boolean
}

/**
 * Growth Timeline Chart Component
 * Interactive line chart showing compensation growth over time
 */
const GrowthTimelineChart: React.FC<GrowthTimelineChartProps> = ({ growthData, loading }) => {
  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Chart configuration
  const chartConfig = useMemo(
    () =>
      ({
        totalCompensation: {
          label: 'Total Compensation'
        },
        baseSalary: {
          label: 'Base Salary'
        }
      }) satisfies ChartConfig,
    []
  )

  // Use all data points for smooth line
  const chartData = useMemo(() => {
    return growthData.dataPoints
  }, [growthData.dataPoints])

  // Get milestone data points for markers
  const milestonePoints = useMemo(() => {
    return growthData.dataPoints.filter(point => point.milestone)
  }, [growthData.dataPoints])

  if (loading) {
    return (
      <Card data-testid="growth-timeline-chart">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.growth_timeline', 'Compensation Growth Timeline')}
          </CardTitle>
          <CardDescription>Loading growth data...</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
          <div className="gba:text-center gba:text-muted-foreground">Loading chart...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="growth-timeline-chart">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.growth_timeline', 'Compensation Growth Timeline')}
        </CardTitle>
        <CardDescription>Last 3 years of compensation progression</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:w-full gba:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />

              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  // Show every 6th label for cleaner axis
                  if (index % 6 === 0 || index === chartData.length - 1) {
                    return value
                  }
                  return ''
                }}
                className="gba:text-muted-foreground"
              />

              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={value => `€${(value / 1000).toFixed(0)}k`}
                className="gba:text-muted-foreground"
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: any, name: string) => {
                      const label = name === 'totalCompensation' ? 'Total Compensation' : 'Base Salary'
                      return [formatCurrency(Number(value)), label]
                    }}
                  />
                }
              />

              <ChartLegend content={<ChartLegendContent />} />

              {/* Base Salary Line */}
              <Line type="monotone" dataKey="baseSalary" stroke="var(--color-baseSalary)" strokeWidth={2} dot={false} />

              {/* Total Compensation Line (Bold) */}
              <Line
                type="monotone"
                dataKey="totalCompensation"
                stroke="var(--color-totalCompensation)"
                strokeWidth={3}
                dot={false}
              />

              {/* Milestone Markers - Simple colored dots */}
              {milestonePoints.map((point, index) => (
                <ReferenceDot
                  key={`milestone-${index}`}
                  x={point.displayDate}
                  y={point.totalCompensation}
                  r={5}
                  fill="var(--color-totalCompensation)"
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default GrowthTimelineChart
