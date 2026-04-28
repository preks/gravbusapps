import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@newwork/nw-design-system'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { TrendDataPoint, ScoreDistributionBand } from '../../utils/dashboardComputations'

const TREND_COLORS = {
  overall: 'var(--nw-color-primary-500)',
  companyValues: 'var(--nw-color-decorative-500)',
  skills: 'var(--nw-color-success-500)',
  distribution: 'var(--nw-color-info-500)'
} as const

interface PerformanceTrendsProps {
  trendData: TrendDataPoint[]
  distributionData: ScoreDistributionBand[]
  ratingScaleLimit: number
  loading: boolean
}

type DistributionTooltipProps = TooltipProps<number, string> & {
  payload?: Array<{ payload: ScoreDistributionBand }>
}

const DistributionTooltip: React.FC<DistributionTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const band = payload[0].payload
  return (
    <div className="gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-3 gba:text-sm gba:shadow-md gba:max-w-xs">
      <p className="gba:font-semibold gba:mb-1">{band.band}</p>
      <p className="gba:text-muted-foreground gba:text-xs gba:mb-2">Count: {band.count}</p>
      {band.employees.length > 0 ? (
        <ul className="gba:max-h-36 gba:overflow-y-auto gba:text-xs gba:space-y-0.5">
          {band.employees.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground">No employees in this band</p>
      )}
    </div>
  )
}

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({
  trendData,
  distributionData,
  ratingScaleLimit,
  loading
}) => {
  if (loading) {
    return (
      <div className="gba:flex gba:gap-6">
        <div className="gba:flex-1 gba:min-w-0">
          <Card className="gba:rounded-xl">
            <CardHeader className="gba:px-5 gba:pb-3 gba:pt-5">
              <CardTitle className="gba:text-base">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent className="gba:flex gba:min-h-[280px] gba:items-center gba:justify-center gba:px-5 gba:pb-5 gba:pt-0">
              <Spinner size="lg" />
            </CardContent>
          </Card>
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <Card className="gba:rounded-xl">
            <CardHeader className="gba:px-5 gba:pb-3 gba:pt-5">
              <CardTitle className="gba:text-base">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent className="gba:flex gba:min-h-[280px] gba:items-center gba:justify-center gba:px-5 gba:pb-5 gba:pt-0">
              <Spinner size="lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:gap-6">
      <div className="gba:flex-1 gba:min-w-0">
        <Card className="gba:rounded-xl">
          <CardHeader className="gba:px-5 gba:pb-3 gba:pt-5">
            <CardTitle className="gba:text-base">Performance Trends</CardTitle>
          </CardHeader>
          <CardContent className="gba:px-5 gba:pb-5 gba:pt-0">
            {trendData.length === 0 ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[280px] gba:text-sm gba:text-muted-foreground">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />
                  <XAxis dataKey="cycleName" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, ratingScaleLimit]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name="Overall"
                    stroke={TREND_COLORS.overall}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="companyValues"
                    name="Company values"
                    stroke={TREND_COLORS.companyValues}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="skills"
                    name="Skills"
                    stroke={TREND_COLORS.skills}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <Card className="gba:rounded-xl">
          <CardHeader className="gba:px-5 gba:pb-3 gba:pt-5">
            <CardTitle className="gba:text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="gba:px-5 gba:pb-5 gba:pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distributionData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />
                <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<DistributionTooltip />} />
                <Bar dataKey="count" name="Employees" fill={TREND_COLORS.distribution} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
