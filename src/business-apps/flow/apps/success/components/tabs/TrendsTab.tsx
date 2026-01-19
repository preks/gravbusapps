import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert } from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Play,
  CheckCircle,
  Users,
  Target,
  Clock,
  Activity,
  Info
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTrendComparison } from '../../hooks/useFlowAnalytics'

interface TrendsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const TrendsTab: React.FC<TrendsTabProps> = ({ prefixDataTestId = 'trends-tab', accessToken, ...context }) => {
  const [timeframe, setTimeframe] = useState('wtd')

  const {
    data: trendData,
    isLoading,
    error,
    refetch
  } = useTrendComparison({
    timeframe,
    accessToken
  })

  // Helper function to get trend icon based on direction with context-aware colors
  const getTrendIcon = (direction: 'up' | 'down' | 'stable', size = 16, metricKey?: string) => {
    const sizeClass = size === 32 ? 'gba:h-8 gba:w-8' : size === 20 ? 'gba:h-5 gba:w-5' : 'gba:h-4 gba:w-4'

    // For metrics where "up" is bad (cycle time), reverse the color logic
    const isBadWhenUp = metricKey === 'avg-cycle-time-trend'

    switch (direction) {
      case 'up':
        const upColor = isBadWhenUp ? 'gba:text-red-600' : 'gba:text-green-600'
        return <TrendingUp className={`${sizeClass} ${upColor}`} />
      case 'down':
        const downColor = isBadWhenUp ? 'gba:text-green-600' : 'gba:text-red-600'
        return <TrendingDown className={`${sizeClass} ${downColor}`} />
      default:
        return <Minus className={`${sizeClass} gba:text-gray-500`} />
    }
  }

  // Helper function to format trend percentage with context-aware colors
  const formatTrendPercentage = (
    trend: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' },
    metricKey?: string
  ) => {
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''
    const absPercentage = Math.abs(trend.percentage)

    // For metrics where "up" is bad (cycle time), reverse the color logic
    const isBadWhenUp = metricKey === 'avg-cycle-time-trend'

    let color = 'gba:text-gray-500'
    if (trend.direction === 'up') {
      color = isBadWhenUp ? 'gba:text-red-600' : 'gba:text-green-600'
    } else if (trend.direction === 'down') {
      color = isBadWhenUp ? 'gba:text-green-600' : 'gba:text-red-600'
    }

    return {
      sign,
      percentage: absPercentage,
      color
    }
  }

  // Helper function to format current vs previous period labels
  const getPeriodLabels = (timeframe: string) => {
    switch (timeframe) {
      case 'last24h':
        return { current: 'Last 24 Hours', previous: 'Previous 24 Hours' }
      case 'wtd':
        return { current: 'This Week', previous: 'Previous Week' }
      case 'mtd':
        return { current: 'This Month', previous: 'Previous Month' }
      case 'qtd':
        return { current: 'This Quarter', previous: 'Previous Quarter' }
      case 'ytd':
        return { current: 'This Year', previous: 'Previous Year' }
      default:
        return { current: 'Current Period', previous: 'Previous Period' }
    }
  }

  const periodLabels = getPeriodLabels(timeframe)

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <h3>Error Loading Trend Analysis</h3>
        <p>{error.message}</p>
        <button
          onClick={refetch}
          className="gba:mt-2 gba:px-4 gba:py-2 gba:bg-red-600 gba:text-white gba:rounded gba:hover:bg-red-700"
        >
          Retry
        </button>
      </Alert>
    )
  }

  if (!trendData) {
    return (
      <Alert data-testid={`${prefixDataTestId}-no-data`}>
        <h3>No Trend Data Available</h3>
        <p>Unable to load trend comparison data. Please try again later.</p>
      </Alert>
    )
  }

  // Prepare trend comparison data
  const trendMetrics = [
    {
      key: 'workflows-started-trend',
      title: 'Workflows Started',
      value: trendData.current.workflowsStarted,
      prefix: <Play className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.workflowsStarted
    },
    {
      key: 'workflows-completed-trend',
      title: 'Workflows Completed',
      value: trendData.current.workflowsCompleted,
      prefix: <CheckCircle className="gba:h-4 gba:w-4" />,
      color: '#10b981',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.workflowsCompleted
    },
    {
      key: 'completion-rate-trend',
      title: 'Completion Rate',
      value: trendData.current.completionRate,
      suffix: '%',
      precision: 1,
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#8b5cf6',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.completionRate
    },
    {
      key: 'avg-cycle-time-trend',
      title: 'Average Cycle Time',
      value: trendData.current.avgCycleTime,
      suffix: 'h',
      precision: 1,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#f59e0b',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.avgCycleTime
    },
    {
      key: 'active-users-trend',
      title: 'Active Users',
      value: trendData.current.activeUsers,
      prefix: <Users className="gba:h-4 gba:w-4" />,
      color: '#ef4444',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.activeUsers
    },
    {
      key: 'avg-tasks-per-user-trend',
      title: 'Avg Tasks per User',
      value: trendData.current.avgTasksPerUser,
      precision: 1,
      prefix: <Activity className="gba:h-4 gba:w-4" />,
      color: '#06b6d4',
      description: `${periodLabels.current} vs ${periodLabels.previous}`,
      trend: trendData.trends.avgTasksPerUser
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Trend Analysis</h2>
          <p className="gba:text-gray-600">Compare current performance with previous periods</p>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
            data-testid={`${prefixDataTestId}-timeframe-selector`}
          >
            <option value="last24h">Last 24 Hours</option>
            <option value="wtd">Week to Date</option>
            <option value="mtd">Month to Date</option>
            <option value="qtd">Quarter to Date</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
      </div>

      {/* Data Availability Warning */}
      {trendData?.metadata && !trendData.metadata.hasPreviousData && (
        <Alert
          variant="default"
          className="gba:bg-amber-50 gba:border-amber-200"
          data-testid={`${prefixDataTestId}-data-warning`}
        >
          <Info className="gba:h-4 gba:w-4 gba:text-amber-600" />
          <div>
            <h4 className="gba:font-medium gba:text-amber-800">Limited Comparison Data</h4>
            <p className="gba:text-amber-700 gba:mt-1">
              {trendData.metadata.message}. Current period metrics are shown, but trend indicators may not be
              meaningful.
            </p>
          </div>
        </Alert>
      )}

      {/* Trend Comparison Cards - Focus on Change */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">Performance Trends</h3>

        {/* Compact Trend Cards - Smaller Side-by-Side Layout */}
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-6 gba:gap-4">
          {trendMetrics.map(metric => {
            const trendFormat = metric.trend ? formatTrendPercentage(metric.trend, metric.key) : null

            // For cycle time, reverse the positive/negative logic since up is bad
            const isBadWhenUp = metric.key === 'avg-cycle-time-trend'
            const isGoodTrend = isBadWhenUp ? metric.trend?.direction === 'down' : metric.trend?.direction === 'up'
            const isBadTrend = isBadWhenUp ? metric.trend?.direction === 'up' : metric.trend?.direction === 'down'

            return (
              <Card
                key={metric.key}
                className="gba:relative gba:shadow-md gba:border gba:border-gray-200 gba:bg-white gba:hover:shadow-lg gba:transition-all gba:duration-200"
              >
                <CardContent className="gba:p-3">
                  <div className="gba:space-y-2">
                    {/* Compact Header */}
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:p-1 gba:rounded gba:bg-gray-100">{metric.prefix}</div>
                      <h4 className="gba:text-xs gba:font-medium gba:text-gray-600 gba:leading-tight">
                        {metric.title}
                      </h4>
                    </div>

                    {/* Compact Trend Display */}
                    <div className="gba:text-center">
                      {metric.trend ? (
                        <div className="gba:space-y-1">
                          {/* Smaller Trend Icon */}
                          <div className="gba:flex gba:justify-center">
                            <div
                              className={`gba:p-1.5 gba:rounded-full ${
                                isGoodTrend ? 'gba:bg-green-100' : isBadTrend ? 'gba:bg-red-100' : 'gba:bg-gray-100'
                              }`}
                            >
                              {getTrendIcon(metric.trend.direction, 16, metric.key)}
                            </div>
                          </div>

                          {/* Percentage Change */}
                          <div className={`gba:text-xl gba:font-bold ${trendFormat?.color}`}>
                            {trendFormat?.sign}
                            {trendFormat?.percentage.toFixed(1)}%
                          </div>

                          {/* Change Value - Compact */}
                          <div className="gba:text-xs gba:text-gray-500">
                            ({metric.trend.change > 0 ? '+' : ''}
                            {metric.trend.change})
                          </div>

                          {/* Show note if no comparison data for this metric */}
                          {metric.trend.note && (
                            <div className="gba:text-xs gba:text-amber-600 gba:mt-1 gba:italic">
                              {metric.trend.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="gba:text-gray-400">
                          <div className="gba:p-1.5 gba:rounded-full gba:bg-gray-100 gba:inline-block gba:mb-1">
                            {getTrendIcon('stable', 16, metric.key)}
                          </div>
                          <div className="gba:text-sm gba:font-medium">No Change</div>
                        </div>
                      )}
                    </div>

                    {/* Current Value - Very Compact */}
                    <div className="gba:text-center gba:pt-1 gba:border-t gba:border-gray-200">
                      <div className="gba:text-xs gba:text-gray-500">Current</div>
                      <div className="gba:text-sm gba:font-semibold gba:text-gray-700">
                        {typeof metric.value === 'number' && metric.precision !== undefined
                          ? metric.value.toFixed(metric.precision)
                          : metric.value}
                        {metric.suffix && <span className="gba:text-xs gba:text-gray-500">{metric.suffix}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Trend Insights Summary */}
      <Card className="gba:mt-6 gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:border-blue-200">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-blue-900">
            <TrendingUp className="gba:h-5 gba:w-5" />
            Key Trend Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6 gba:text-sm">
            {/* Current vs Previous Summary */}
            <div className="gba:space-y-3">
              <h4 className="gba:font-semibold gba:text-blue-800 gba:border-b gba:border-blue-200 gba:pb-2">
                {trendData?.metadata?.hasPreviousData ? 'Performance Summary' : 'Current Performance'}
              </h4>
              <div className="gba:space-y-2 gba:text-gray-700">
                <div className="gba:flex gba:justify-between">
                  <span>Workflows Started:</span>
                  <span className="gba:font-medium">
                    {trendData.current.workflowsStarted} ({periodLabels.current})
                  </span>
                </div>
                <div className="gba:flex gba:justify-between">
                  <span>Workflows Completed:</span>
                  <span className="gba:font-medium">
                    {trendData.current.workflowsCompleted} ({periodLabels.current})
                  </span>
                </div>
                <div className="gba:flex gba:justify-between">
                  <span>Completion Rate:</span>
                  <span className="gba:font-medium">{trendData.current.completionRate.toFixed(1)}%</span>
                </div>
                <div className="gba:flex gba:justify-between">
                  <span>Active Users:</span>
                  <span className="gba:font-medium">{trendData.current.activeUsers}</span>
                </div>
              </div>
            </div>

            {/* Trend Direction Summary */}
            <div className="gba:space-y-3">
              <h4 className="gba:font-semibold gba:text-blue-800 gba:border-b gba:border-blue-200 gba:pb-2">
                {trendData?.metadata?.hasPreviousData ? 'Trend Direction' : 'Data Availability'}
              </h4>
              <div className="gba:space-y-2">
                {trendData?.metadata?.hasPreviousData ? (
                  // Show trend data when available
                  trendMetrics.slice(0, 4).map(metric => (
                    <div key={metric.key} className="gba:flex gba:items-center gba:justify-between">
                      <span className="gba:text-gray-700">{metric.title}:</span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {getTrendIcon(metric.trend?.direction || 'stable', 16, metric.key)}
                        <span
                          className={`gba:font-medium ${formatTrendPercentage(metric.trend || { change: 0, percentage: 0, direction: 'stable' }, metric.key).color}`}
                        >
                          {metric.trend
                            ? `${formatTrendPercentage(metric.trend, metric.key).sign}${formatTrendPercentage(metric.trend, metric.key).percentage.toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show explanation when no previous data available
                  <div className="gba:text-gray-600 gba:italic gba:text-center gba:py-4">
                    <Info className="gba:h-5 gba:w-5 gba:text-amber-500 gba:mx-auto gba:mb-2" />
                    <p>Trend comparison requires data from {periodLabels.previous.toLowerCase()}.</p>
                    <p className="gba:text-sm gba:mt-1">Check back after more data is collected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
