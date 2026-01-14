import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Progress, Spinner } from '@newwork/nw-design-system'
import { BarChart3, Phone, Mail, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

export interface ActivityVolumeMetrics {
  last7Days: {
    total: number
    types: Array<{
      code: string
      value: string
      count: number
    }>
  }
  last30Days: {
    total: number
    types: Array<{
      code: string
      value: string
      count: number
    }>
  }
}

export interface ActivityVolumeProps {
  activityVolume: ActivityVolumeMetrics
  pipelineId: string
  isLoading?: boolean
}

export const ActivityVolume: React.FC<ActivityVolumeProps> = ({ activityVolume, pipelineId, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-orange-100 gba:rounded-lg">
              <BarChart3 className="gba:h-5 gba:w-5 gba:text-orange-600" />
            </div>
            <CardTitle>Activity Volume</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-40">
            <div className="gba:text-center">
              <Spinner size="sm" />
              <div className="gba:mt-2 gba:text-sm gba:text-gray-600">Loading activities...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Provide default values if metrics are undefined
  const safeVolume = {
    last7Days: {
      total: activityVolume?.last7Days?.total ?? 0,
      types: activityVolume?.last7Days?.types ?? []
    },
    last30Days: {
      total: activityVolume?.last30Days?.total ?? 0,
      types: activityVolume?.last30Days?.types ?? []
    }
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="gba:h-4 gba:w-4 gba:text-success" />
    } else if (current < previous) {
      return <TrendingDown className="gba:h-4 gba:w-4 gba:text-destructive" />
    }
    return null
  }

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Dynamic icon and color based on activity type code
  const getActivityIcon = (code: string) => {
    const normalizedCode = code.toLowerCase()
    if (normalizedCode.includes('call')) return <Phone className="gba:h-4 gba:w-4 gba:text-primary" />
    if (normalizedCode.includes('email')) return <Mail className="gba:h-4 gba:w-4 gba:text-success" />
    if (normalizedCode.includes('meeting')) return <Calendar className="gba:h-4 gba:w-4 gba:text-warning" />
    return <BarChart3 className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
  }

  // Dynamic color palette for progress bars
  const getActivityColor = (index: number) => {
    const colors = [
      'gba:bg-primary',
      'gba:bg-success',
      'gba:bg-warning',
      'gba:bg-info',
      'gba:bg-destructive',
      'gba:bg-secondary'
    ]
    return colors[index % colors.length]
  }

  // Format daily average with appropriate precision
  const formatDailyAvg = (value: number): string => {
    if (value === 0) return '0'
    if (value < 0.1) return value.toFixed(2) // Show 2 decimals for very small values
    if (value < 10) return value.toFixed(1) // Show 1 decimal for values < 10
    return Math.round(value).toString() // Round for larger values
  }

  return (
    <Card data-testid={`activity-volume-${pipelineId}`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <BarChart3 className="gba:h-5 gba:w-5" />
          <CardTitle>Activity Volume</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Comparison */}
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4 gba:mb-6">
          <Card>
            <CardContent className="gba:p-4">
              <div data-testid={`activity-7days-${pipelineId}`}>
                <span className="gba:text-gray-600 gba:text-xs">Last 7 Days</span>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600 gba:my-1">
                  {safeVolume.last7Days.total}
                </div>
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                  {getTrendIcon(safeVolume.last7Days.total, Math.round(safeVolume.last30Days.total / 4.3))}
                  <span className="gba:text-xs">
                    {getTrendPercentage(safeVolume.last7Days.total, Math.round(safeVolume.last30Days.total / 4.3))}% vs
                    avg
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gba:p-4">
              <div data-testid={`activity-30days-${pipelineId}`}>
                <span className="gba:text-gray-600 gba:text-xs">Last 30 Days</span>
                <div className="gba:text-2xl gba:font-bold gba:text-green-600 gba:my-1">
                  {safeVolume.last30Days.total}
                </div>
                <span className="gba:text-xs">Daily Avg: {formatDailyAvg(safeVolume.last30Days.total / 30)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Breakdown - Dynamic from catalog - Only show if types exist */}
        {safeVolume.last7Days.types.length > 0 && (
          <div className="gba:mb-4">
            <span className="gba:font-medium gba:text-sm gba:mb-3 gba:block">Activity Breakdown (7 vs 30 days)</span>

            {(() => {
              // Calculate global maximum across ALL activity types
              const globalMax = Math.max(
                ...safeVolume.last7Days.types.map(t => t.count),
                ...safeVolume.last30Days.types.map(t => t.count),
                1 // Minimum of 1 to avoid division by zero
              )

              return safeVolume.last7Days.types.map((type7d, index) => {
                // Find matching 30-day type
                const type30d = safeVolume.last30Days.types.find(t => t.code === type7d.code)
                const current7Days = type7d.count
                const total30Days = type30d?.count ?? 0
                const progress7Days = (current7Days / globalMax) * 100
                const progress30Days = (total30Days / globalMax) * 100

                // Only show types with activity
                if (current7Days === 0 && total30Days === 0) return null

                return (
                  <div key={type7d.code} className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {getActivityIcon(type7d.code)}
                        <span className="gba:text-sm">{type7d.value}</span>
                      </div>
                      <div className="gba:flex gba:gap-3 gba:items-center">
                        <span className="gba:text-xs">
                          7d: <strong>{current7Days}</strong>
                        </span>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          30d: <strong>{total30Days}</strong>
                        </span>
                      </div>
                    </div>

                    {/* 7 Days Progress */}
                    <div className="gba:mb-1">
                      <Progress
                        value={progress7Days}
                        className={`gba:h-2 ${current7Days > 0 ? getActivityColor(index) : 'gba:bg-muted'}`}
                      />
                    </div>

                    {/* 30 Days Progress */}
                    <div className="gba:mb-1">
                      <Progress value={progress30Days} className="gba:h-2 gba:bg-muted" />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* Activity Summary */}
        <div className="gba:p-3 gba:bg-card gba:rounded-lg gba:border">
          <div className="gba:grid gba:grid-cols-3 gba:gap-2 gba:text-center">
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-primary">
                {formatDailyAvg(safeVolume.last7Days.total / 7)}
              </div>
              <span className="gba:text-muted-foreground gba:text-xs">Daily Avg (7d)</span>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-success">
                {formatDailyAvg(safeVolume.last30Days.total / 30)}
              </div>
              <span className="gba:text-muted-foreground gba:text-xs">Daily Avg (30d)</span>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-warning">
                {getTrendPercentage(safeVolume.last7Days.total / 7, safeVolume.last30Days.total / 30)}%
              </div>
              <span className="gba:text-muted-foreground gba:text-xs">Change</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityVolume
