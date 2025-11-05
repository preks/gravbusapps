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
import { GrowthData } from '../../types/compensationTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

interface GrowthTimelineChartProps {
  t: (key: string, params?: any) => string
  growthData: GrowthData
  loading: boolean
  locale: string
}

/**
 * Growth Timeline Chart Component
 * Interactive line chart showing compensation growth over time
 */
const GrowthTimelineChart: React.FC<GrowthTimelineChartProps> = ({ t, growthData, loading, locale }) => {
  // Chart configuration
  const chartConfig = useMemo(
    () =>
      ({
        totalCompensation: {
          label: t('growth-chart-total-compensation')
        },
        baseSalary: {
          label: t('growth-chart-base-salary')
        }
      }) satisfies ChartConfig,
    [t]
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
          <CardTitle>{t('growth-timeline-title')}</CardTitle>
          <CardDescription>{t('growth-timeline-loading')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
          <div className="gba:text-center gba:text-muted-foreground">{t('growth-loading-chart')}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="growth-timeline-chart">
      <CardHeader>
        <CardTitle>{t('growth-timeline-title')}</CardTitle>
        <CardDescription>{t('growth-timeline-description', { years: 3 })}</CardDescription>
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
                      const label =
                        name === 'totalCompensation'
                          ? t('growth-chart-total-compensation')
                          : t('growth-chart-base-salary')
                      return [
                        formatCurrencyString(Number(value), {
                          currency: 'EUR',
                          locale: locale,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }),
                        label
                      ]
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
