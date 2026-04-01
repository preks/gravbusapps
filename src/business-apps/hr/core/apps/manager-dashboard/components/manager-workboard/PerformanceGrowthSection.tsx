// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress, Badge } from '@newwork/nw-design-system'
import { CheckCircle2, XCircle, Target, BarChart3, Users } from 'lucide-react'

interface PerformanceGrowthSectionProps {
  onTrack: number
  atRisk: number
  behind: number
  totalGoals: number
  averageProgress: number
  loading: boolean
  onNavigateToTeamPerformance: () => void
  onNavigateToAtRiskGoals: () => void
  onNavigateToTeamPerformanceOverview?: () => void
}

export const PerformanceGrowthSection: React.FC<PerformanceGrowthSectionProps> = ({
  onTrack,
  atRisk,
  behind,
  totalGoals,
  averageProgress,
  loading,
  onNavigateToTeamPerformance,
  onNavigateToAtRiskGoals,
  onNavigateToTeamPerformanceOverview
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }} className="gba:p-4">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">Performance & Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-2">
            <div className="gba:h-6 gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasGoals = totalGoals > 0

  return (
    <Card data-testid="performance-growth-section" style={{ borderRadius: '12px' }} className="gba:p-4">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">Performance & Growth</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Goals progress distribution</p>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {hasGoals ? (
          <>
            {/* Distribution (Primary) */}
            <div className="gba:space-y-1.5">
              {onTrack > 0 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:p-1.5 gba:rounded-lg gba:bg-surface">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <CheckCircle2 className="gba:text-info-on-card" size={16} />
                    <span className="gba:text-xs gba:font-medium gba:text-info-on-card">On track</span>
                  </div>
                  <Badge variant="success" className="gba:text-xs gba:px-2 gba:py-0">
                    {onTrack}
                  </Badge>
                </div>
              )}

              {behind > 0 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:p-1.5 gba:rounded-lg gba:bg-surface">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <XCircle className="gba:text-destructive-on-card" size={16} />
                    <span className="gba:text-xs gba:font-medium gba:text-destructive-on-card">Behind</span>
                  </div>
                  <Badge variant="destructive" className="gba:text-xs gba:px-2 gba:py-0">
                    {behind}
                  </Badge>
                </div>
              )}
            </div>

            {/* Progress indicator (Secondary) */}
            <div className="gba:border-t gba:pt-2">
              <Progress value={averageProgress} className="gba:h-1.5 gba:mb-1" />
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                {averageProgress}% avg. progress · {totalGoals} total goals
              </p>
            </div>

            <Button onClick={onNavigateToTeamPerformance} variant="outline" size="sm" className="gba:w-full gba:h-8">
              <Users size={14} className="gba:mr-1.5" />
              View goals by team member
            </Button>

            {/* Action Button */}
            {(atRisk > 0 || behind > 0) && (
              <Button onClick={onNavigateToAtRiskGoals} variant="outline" size="sm" className="gba:w-full gba:h-8">
                <Target size={14} className="gba:mr-1.5" />
                Review at-risk goals
              </Button>
            )}
          </>
        ) : (
          <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
            <Target size={40} className="gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:text-sm gba:font-medium">No performance goals set</p>
            <p className="gba:text-xs gba:mb-3">Set goals to track team progress</p>
            <Button onClick={onNavigateToTeamPerformance} variant="outline" size="sm">
              Set goals
            </Button>
          </div>
        )}
        {onNavigateToTeamPerformanceOverview && (
          <div className="gba:border-t gba:pt-2 gba:mt-2">
            <Button
              onClick={onNavigateToTeamPerformanceOverview}
              variant="outline"
              size="sm"
              className="gba:w-full gba:h-8"
            >
              <BarChart3 size={14} className="gba:mr-1.5" />
              Team Performance Dashboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
