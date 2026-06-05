import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Avatar,
  EmptyState,
  Spinner
} from '@newwork/nw-design-system'
import { Trophy, Crown, Star, User } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/common/utils/numberFormatter'

export interface SalesRepPerformance {
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  opportunitiesWon: number
  opportunitiesLost: number
  totalOpportunities?: number
  totalValue: number
  winRate: number
  activitiesCount: number
}

export interface PerformanceLeaderboardProps {
  leaderboard: SalesRepPerformance[]
  pipelineId: string
  currency?: string
  isLoading?: boolean
}

export const PerformanceLeaderboard: React.FC<PerformanceLeaderboardProps> = ({
  leaderboard,
  pipelineId,
  currency = 'EUR',
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
              <Trophy className="gba:h-5 gba:w-5 gba:text-green-600" />
            </div>
            <CardTitle>Performance Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-40">
            <div className="gba:text-center">
              <Spinner size="sm" />
              <div className="gba:mt-2 gba:text-sm gba:text-gray-600">Loading leaderboard...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="gba:h-4 gba:w-4 gba:text-yellow-500" />
      case 1:
        return <Trophy className="gba:h-4 gba:w-4 gba:text-gray-400" />
      case 2:
        return <Star className="gba:h-4 gba:w-4 gba:text-amber-600" />
      default:
        return <span className="gba:text-xs gba:font-bold gba:text-gray-500">#{index + 1}</span>
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'gba:bg-yellow-500'
      case 1:
        return 'gba:bg-gray-400'
      case 2:
        return 'gba:bg-amber-600'
      default:
        return 'gba:bg-gray-300'
    }
  }

  const getPerformanceColor = (winRate: number) => {
    if (winRate >= 70) return 'gba:text-green-600'
    if (winRate >= 50) return 'gba:text-orange-600'
    return 'gba:text-red-600'
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card data-testid={`sales-leaderboard-${pipelineId}`}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Trophy className="gba:h-5 gba:w-5" />
            <CardTitle>Sales Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            type="no-data"
            title="No Sales Data"
            description="No sales performance data available"
            data-testid="performance-leaderboard-empty-state"
          />
        </CardContent>
      </Card>
    )
  }

  // Take top 3 performers
  const topPerformers = leaderboard.slice(0, 3)
  const maxValue = Math.max(...topPerformers.map(rep => rep.totalValue))

  return (
    <Card data-testid={`sales-leaderboard-${pipelineId}`}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Trophy className="gba:h-5 gba:w-5" />
            <CardTitle>Sales Leaderboard</CardTitle>
          </div>
          <Badge variant="secondary">Top {topPerformers.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {topPerformers.map((rep, index) => {
            const progressPercent = maxValue > 0 ? (rep.totalValue / maxValue) * 100 : 0

            return (
              <div
                key={rep.employeeId}
                data-testid={`leaderboard-item-${rep.employeeId}`}
                className="gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg"
              >
                {/* Rep Info Row */}
                <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:relative">
                      <Avatar className={`gba:h-8 gba:w-8 ${index < 3 ? getRankColor(index) : 'gba:bg-gray-300'}`}>
                        <User className="gba:h-4 gba:w-4" />
                      </Avatar>
                      <div className="gba:absolute gba:-top-1 gba:-right-1 gba:bg-white gba:rounded-full gba:p-0.5">
                        {getRankIcon(index)}
                      </div>
                    </div>
                    <div>
                      <div className="gba:font-medium gba:text-sm">{rep.displayName}</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {rep.totalOpportunities ?? rep.opportunitiesWon + rep.opportunitiesLost} opportunities •{' '}
                        {rep.activitiesCount} activities
                      </div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:text-sm gba:font-bold gba:text-blue-600">
                      {formatCurrency(rep.totalValue, currency)}
                    </div>
                    <div className={`gba:text-xs ${getPerformanceColor(rep.winRate)}`}>
                      {formatPercentage(rep.winRate)} win rate
                    </div>
                  </div>
                </div>

                {/* Performance Progress Bar */}
                <div className="gba:mb-2">
                  <Progress value={progressPercent} className={`gba:h-2 ${getRankColor(index)}`} />
                </div>

                {/* Performance Details */}
                <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500">
                  <span>
                    Won: {rep.opportunitiesWon} | Lost: {rep.opportunitiesLost}
                  </span>
                  <span>
                    Avg Opportunity:{' '}
                    {formatCurrency(rep.opportunitiesWon > 0 ? rep.totalValue / rep.opportunitiesWon : 0, currency)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Leaderboard Summary */}
        <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:flex gba:justify-between gba:mb-2">
            <span className="gba:text-gray-600 gba:text-xs">Total Team Performance:</span>
          </div>
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
            <div>
              <div className="gba:font-bold gba:text-blue-600 gba:text-sm">
                {formatCurrency(
                  topPerformers.reduce((sum, rep) => sum + rep.totalValue, 0),
                  currency
                )}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Total Value</span>
            </div>
            <div>
              <div className="gba:font-bold gba:text-green-600 gba:text-sm">
                {topPerformers.reduce((sum, rep) => sum + rep.opportunitiesWon, 0)}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Opportunities Won</span>
            </div>
            <div>
              <div className="gba:font-bold gba:text-orange-600 gba:text-sm">
                {formatPercentage(
                  topPerformers.length > 0
                    ? topPerformers.reduce((sum, rep) => sum + rep.winRate, 0) / topPerformers.length
                    : 0
                )}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Avg Win Rate</span>
            </div>
          </div>
        </div>

        {/* Performance Badges */}
        {topPerformers.length > 0 && (
          <div className="gba:mt-3 gba:flex gba:gap-2 gba:flex-wrap">
            {topPerformers[0] && (
              <Badge variant="default" className="gba:text-xs">
                Top Performer: {topPerformers[0].displayName}
              </Badge>
            )}
            {topPerformers.find(rep => rep.winRate === Math.max(...topPerformers.map(r => r.winRate))) && (
              <Badge variant="secondary" className="gba:text-xs">
                Best Win Rate: {formatPercentage(Math.max(...topPerformers.map(r => r.winRate)))}
              </Badge>
            )}
            {topPerformers.find(
              rep => rep.activitiesCount === Math.max(...topPerformers.map(r => r.activitiesCount))
            ) && (
              <Badge variant="outline" className="gba:text-xs">
                Most Active: {Math.max(...topPerformers.map(r => r.activitiesCount))} activities
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PerformanceLeaderboard
