// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress, Badge } from '@newwork/nw-design-system'
import { CheckCircle2, AlertCircle, XCircle, Target } from 'lucide-react'

interface PerformanceGrowthSectionProps {
  onTrack: number
  atRisk: number
  behind: number
  totalGoals: number
  averageProgress: number
  loading: boolean
  onNavigateToTeamPerformance: () => void
}

export const PerformanceGrowthSection: React.FC<PerformanceGrowthSectionProps> = ({
  onTrack,
  atRisk,
  behind,
  totalGoals,
  averageProgress,
  loading,
  onNavigateToTeamPerformance
}) => {
  if (loading) {
    return (
      <Card style={{ minHeight: '200px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Performance & Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-8 gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasGoals = totalGoals > 0

  return (
    <Card
      data-testid="performance-growth-section"
      style={{ minHeight: '200px', borderRadius: '12px' }}
      className="gba:p-5"
    >
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-lg gba:font-semibold">Performance & Growth</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">Goals progress distribution</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {hasGoals ? (
          <>
            {/* Distribution (Primary) */}
            <div className="gba:space-y-2">
              {onTrack > 0 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-lg gba:bg-success/10">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <CheckCircle2 className="gba:text-success" size={18} />
                    <span className="gba:text-sm gba:font-medium">On track</span>
                  </div>
                  <Badge variant="success">{onTrack}</Badge>
                </div>
              )}

              {atRisk > 0 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-lg gba:bg-warning/10">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <AlertCircle className="gba:text-warning" size={18} />
                    <span className="gba:text-sm gba:font-medium">At risk</span>
                  </div>
                  <Badge variant="warning">{atRisk}</Badge>
                </div>
              )}

              {behind > 0 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-lg gba:bg-destructive/10">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <XCircle className="gba:text-destructive" size={18} />
                    <span className="gba:text-sm gba:font-medium">Behind</span>
                  </div>
                  <Badge variant="destructive">{behind}</Badge>
                </div>
              )}
            </div>

            {/* Progress indicator (Secondary) */}
            <div className="gba:border-t gba:pt-3">
              <Progress
                value={averageProgress}
                className="gba:h-2 gba:mb-1"
                indicatorClassName={
                  averageProgress >= 70
                    ? 'gba:bg-success'
                    : averageProgress >= 40
                      ? 'gba:bg-warning'
                      : 'gba:bg-destructive'
                }
              />
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                {averageProgress}% avg. progress · {totalGoals} total goals
              </p>
            </div>

            {/* Action Button */}
            {(atRisk > 0 || behind > 0) && (
              <Button onClick={onNavigateToTeamPerformance} variant="outline" className="gba:w-full">
                <Target size={16} className="gba:mr-2" />
                Review at-risk goals
              </Button>
            )}

            {atRisk === 0 && behind === 0 && (
              <div className="gba:p-3 gba:bg-success/10 gba:border gba:border-success/20 gba:rounded-lg">
                <p className="gba:text-sm gba:text-success gba:font-medium">All goals on track!</p>
              </div>
            )}
          </>
        ) : (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <Target size={48} className="gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:font-medium">No performance goals set</p>
            <p className="gba:text-sm gba:mb-4">Set goals to track team progress</p>
            <Button onClick={onNavigateToTeamPerformance} variant="outline" size="sm">
              Set goals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
