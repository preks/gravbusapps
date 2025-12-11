import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@newwork/nw-design-system'
import { BarChart3, Phone, Mail, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

export interface ActivityVolumeMetrics {
  last7Days: {
    total: number
    calls: number
    emails: number
    meetings: number
  }
  last30Days: {
    total: number
    calls: number
    emails: number
    meetings: number
  }
}

export interface ActivityVolumeProps {
  activityVolume: ActivityVolumeMetrics
  pipelineId: string
}

export const ActivityVolume: React.FC<ActivityVolumeProps> = ({ activityVolume, pipelineId }) => {
  // Provide default values if metrics are undefined
  const safeVolume = {
    last7Days: {
      total: activityVolume?.last7Days?.total ?? 0,
      calls: activityVolume?.last7Days?.calls ?? 0,
      emails: activityVolume?.last7Days?.emails ?? 0,
      meetings: activityVolume?.last7Days?.meetings ?? 0
    },
    last30Days: {
      total: activityVolume?.last30Days?.total ?? 0,
      calls: activityVolume?.last30Days?.calls ?? 0,
      emails: activityVolume?.last30Days?.emails ?? 0,
      meetings: activityVolume?.last30Days?.meetings ?? 0
    }
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="gba:h-4 gba:w-4 gba:text-green-500" />
    } else if (current < previous) {
      return <TrendingDown className="gba:h-4 gba:w-4 gba:text-red-500" />
    }
    return null
  }

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getActivityIcon = (type: 'calls' | 'emails' | 'meetings') => {
    switch (type) {
      case 'calls':
        return <Phone className="gba:h-4 gba:w-4 gba:text-blue-600" />
      case 'emails':
        return <Mail className="gba:h-4 gba:w-4 gba:text-green-600" />
      case 'meetings':
        return <Calendar className="gba:h-4 gba:w-4 gba:text-orange-600" />
    }
  }

  const getActivityColor = (type: 'calls' | 'emails' | 'meetings') => {
    switch (type) {
      case 'calls':
        return 'gba:bg-blue-500'
      case 'emails':
        return 'gba:bg-green-500'
      case 'meetings':
        return 'gba:bg-orange-500'
    }
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
                <span className="gba:text-xs">Daily Avg: {Math.round(safeVolume.last30Days.total / 30)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Breakdown */}
        <div className="gba:mb-4">
          <span className="gba:font-medium gba:text-sm gba:mb-3 gba:block">Activity Breakdown (7 vs 30 days)</span>

          {(['calls', 'emails', 'meetings'] as const).map(activityType => {
            const current7Days = safeVolume.last7Days[activityType]
            const total30Days = safeVolume.last30Days[activityType]
            const avg30Days = Math.round(total30Days / 4.3) // 30 days / 7 days
            const maxValue = Math.max(current7Days, avg30Days)
            const progress7Days = maxValue > 0 ? (current7Days / maxValue) * 100 : 0
            const progressAvg = maxValue > 0 ? (avg30Days / maxValue) * 100 : 0

            return (
              <div key={activityType} className="gba:mb-4">
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {getActivityIcon(activityType)}
                    <span className="gba:text-sm gba:capitalize">{activityType}</span>
                  </div>
                  <div className="gba:flex gba:gap-3 gba:items-center">
                    <span className="gba:text-xs">
                      7d: <strong>{current7Days}</strong>
                    </span>
                    <span className="gba:text-xs gba:text-gray-500">30d avg: {avg30Days}</span>
                  </div>
                </div>

                {/* 7 Days Progress */}
                <div className="gba:mb-1">
                  <Progress value={progress7Days} className={`gba:h-2 ${getActivityColor(activityType)}`} />
                </div>

                {/* 30 Days Average Progress */}
                <div className="gba:mb-1">
                  <Progress value={progressAvg} className="gba:h-2 gba:bg-gray-400" />
                </div>

                <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500">
                  <span>Recent week</span>
                  <span>30-day average</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity Summary */}
        <div className="gba:p-3 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:grid gba:grid-cols-3 gba:gap-2 gba:text-center">
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-blue-600">
                {Math.round((safeVolume.last7Days.total / 7) * 10) / 10}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Daily Avg (7d)</span>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-green-600">
                {Math.round((safeVolume.last30Days.total / 30) * 10) / 10}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Daily Avg (30d)</span>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-orange-600">
                {getTrendPercentage(safeVolume.last7Days.total, Math.round(safeVolume.last30Days.total / 4.3))}%
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Change</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityVolume
