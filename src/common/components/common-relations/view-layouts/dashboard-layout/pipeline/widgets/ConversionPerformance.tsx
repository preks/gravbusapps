import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@newwork/nw-design-system'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'

export interface WinRateMetrics {
  monthToDate: {
    won: number
    lost: number
    winRate: number
  }
  quarterToDate: {
    won: number
    lost: number
    winRate: number
  }
}

const formatPercentage = (value: number | undefined, decimals: number = 1): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0%'
  }
  return `${value.toFixed(decimals)}%`
}

const getWinRateColorClass = (winRate: number): string => {
  if (winRate >= 70) return 'gba:text-green-600'
  if (winRate >= 50) return 'gba:text-orange-600'
  return 'gba:text-red-600'
}

export interface ConversionPerformanceProps {
  winRateMetrics: WinRateMetrics
  pipelineId: string
}

export const ConversionPerformance: React.FC<ConversionPerformanceProps> = ({ winRateMetrics, pipelineId }) => {
  // Provide default values if metrics are undefined
  const safeMetrics = {
    monthToDate: {
      won: winRateMetrics?.monthToDate?.won ?? 0,
      lost: winRateMetrics?.monthToDate?.lost ?? 0,
      winRate: winRateMetrics?.monthToDate?.winRate ?? 0
    },
    quarterToDate: {
      won: winRateMetrics?.quarterToDate?.won ?? 0,
      lost: winRateMetrics?.quarterToDate?.lost ?? 0,
      winRate: winRateMetrics?.quarterToDate?.winRate ?? 0
    }
  }

  const getProgressColor = (winRate: number) => {
    if (winRate >= 70) return 'gba:bg-green-500'
    if (winRate >= 50) return 'gba:bg-orange-500'
    return 'gba:bg-red-500'
  }

  const getTrendIcon = (winRate: number) => {
    if (winRate >= 60) return <TrendingUp className="gba:h-4 gba:w-4 gba:text-green-500" />
    if (winRate >= 40) return null
    return <TrendingDown className="gba:h-4 gba:w-4 gba:text-red-500" />
  }

  return (
    <Card data-testid={`win-rate-kpis-${pipelineId}`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Trophy className="gba:h-5 gba:w-5" />
          <CardTitle>Win Rate Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4">
          {/* Month to Date */}
          <Card className="gba:bg-blue-50 gba:border-blue-200">
            <CardContent className="gba:p-4">
              <div data-testid={`win-rate-month-${pipelineId}`}>
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <span className="gba:font-medium gba:text-sm">Month to Date</span>
                  {getTrendIcon(safeMetrics.monthToDate.winRate)}
                </div>

                <div className="gba:text-center gba:mb-3">
                  <div
                    className={`gba:text-2xl gba:font-bold ${getWinRateColorClass(safeMetrics.monthToDate.winRate)}`}
                  >
                    {formatPercentage(safeMetrics.monthToDate.winRate)}
                  </div>
                  <span className="gba:text-gray-600 gba:text-xs">Win Rate</span>
                </div>

                <Progress
                  value={safeMetrics.monthToDate.winRate}
                  className={`gba:mb-2 ${getProgressColor(safeMetrics.monthToDate.winRate)}`}
                />

                <div className="gba:flex gba:justify-between gba:text-xs">
                  <span className="gba:text-green-600">Won: {safeMetrics.monthToDate.won}</span>
                  <span className="gba:text-red-600">Lost: {safeMetrics.monthToDate.lost}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quarter to Date */}
          <Card className="gba:bg-green-50 gba:border-green-200">
            <CardContent className="gba:p-4">
              <div data-testid={`win-rate-quarter-${pipelineId}`}>
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <span className="gba:font-medium gba:text-sm">Quarter to Date</span>
                  {getTrendIcon(safeMetrics.quarterToDate.winRate)}
                </div>

                <div className="gba:text-center gba:mb-3">
                  <div
                    className={`gba:text-2xl gba:font-bold ${getWinRateColorClass(safeMetrics.quarterToDate.winRate)}`}
                  >
                    {formatPercentage(safeMetrics.quarterToDate.winRate)}
                  </div>
                  <span className="gba:text-gray-600 gba:text-xs">Win Rate</span>
                </div>

                <Progress
                  value={safeMetrics.quarterToDate.winRate}
                  className={`gba:mb-2 ${getProgressColor(safeMetrics.quarterToDate.winRate)}`}
                />

                <div className="gba:flex gba:justify-between gba:text-xs">
                  <span className="gba:text-green-600">Won: {safeMetrics.quarterToDate.won}</span>
                  <span className="gba:text-red-600">Lost: {safeMetrics.quarterToDate.lost}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-blue-600">
                {safeMetrics.monthToDate.won + safeMetrics.quarterToDate.won}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Total Won</span>
            </div>
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-red-600">
                {safeMetrics.monthToDate.lost + safeMetrics.quarterToDate.lost}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Total Lost</span>
            </div>
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-green-600">
                {((safeMetrics.monthToDate.winRate + safeMetrics.quarterToDate.winRate) / 2).toFixed(1)}%
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Avg Rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversionPerformance
