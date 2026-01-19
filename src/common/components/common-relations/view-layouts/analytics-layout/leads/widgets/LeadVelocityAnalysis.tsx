import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { ClockIcon } from '@phosphor-icons/react'

export interface LeadVelocityDataPoint {
  month: string
  date: string
  leadsCreated: number
  leadsConverted: number
  conversionVelocity: number
}

export interface LeadVelocityAnalysisProps {
  avgTimeToConversion: number
  conversionRate: number
  volumeTrend: number
  velocityTrendData: LeadVelocityDataPoint[]
  isLoading?: boolean
  moduleColor?: string
}

export const LeadVelocityAnalysis: React.FC<LeadVelocityAnalysisProps> = ({
  avgTimeToConversion,
  conversionRate,
  volumeTrend,
  velocityTrendData,
  isLoading = false,
  moduleColor = 'default'
}) => {
  if (isLoading) {
    return (
      <Card data-testid="lead-velocity-analysis-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ClockIcon} variant={moduleColor as any} size="md" decorative />
            Lead Velocity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-gray-500">Loading velocity data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="lead-velocity-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ClockIcon} variant={moduleColor as any} size="md" decorative />
          Lead Velocity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-center">
            <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{avgTimeToConversion}</div>
              <div className="gba:text-sm gba:text-gray-600">Avg Days to Convert</div>
              <div className="gba:text-xs gba:text-gray-500">Real conversion timeline</div>
            </div>
            <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">{conversionRate}%</div>
              <div className="gba:text-sm gba:text-gray-600">Conversion Rate</div>
              <div className="gba:text-xs gba:text-gray-500">Lead to conversion success</div>
            </div>
          </div>

          <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg gba:text-center">
            <div className="gba:text-xl gba:font-bold gba:text-orange-600">
              {volumeTrend > 0 ? '+' : ''}
              {volumeTrend}%
            </div>
            <div className="gba:text-sm gba:text-gray-600">Lead Volume Trend</div>
            <div className="gba:text-xs gba:text-gray-500">Recent vs previous quarter</div>
          </div>

          {velocityTrendData.length > 0 ? (
            <div className="gba:h-56">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
                Conversion Velocity Trend (Monthly)
              </h4>
              <ChartContainer
                config={useMemo(
                  () => ({
                    leadsCreated: { label: 'Leads Created' },
                    leadsConverted: { label: 'Leads Converted' }
                  }),
                  []
                )}
                className="gba:w-full gba:h-full"
              >
                <BarChart
                  data={velocityTrendData}
                  maxBarSize={30}
                  barCategoryGap="25%"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="leadsCreated" name="leadsCreated" fill={`var(--color-leadsCreated)`} />
                  <Bar dataKey="leadsConverted" name="leadsConverted" fill={`var(--color-leadsConverted)`} />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-4">
              <p className="gba:text-sm">No velocity trend data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default LeadVelocityAnalysis
