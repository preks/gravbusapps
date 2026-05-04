// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@newwork/nw-design-system'
import { ChartLineUp, UsersThree } from '@phosphor-icons/react'

interface PerformanceGrowthSectionProps {
  onTrack: number
  atRisk: number
  behind: number
  completed: number
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
  completed,
  totalGoals,
  averageProgress,
  loading,
  onNavigateToTeamPerformance,
  onNavigateToTeamPerformanceOverview
}) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:p-4">
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

  const metrics = [
    { label: 'On track', value: onTrack, colorClass: 'gba:text-success' },
    { label: 'At risk', value: atRisk, colorClass: 'gba:text-warning' },
    { label: 'Behind', value: behind, colorClass: 'gba:text-destructive' },
    { label: 'Completed', value: completed, colorClass: 'gba:text-foreground' }
  ]

  return (
    <Card data-testid="performance-growth-section" className="gba:rounded-xl gba:p-4">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Performance & Growth</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Active cycle goal progress</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <div className="gba:grid gba:grid-cols-4 gba:gap-2">
          {metrics.map(m => (
            <div key={m.label} className="gba:text-center gba:py-2 gba:px-1 gba:rounded-lg gba:bg-muted/30">
              <p className={`gba:text-xl gba:font-bold gba:leading-tight gba:tabular-nums ${m.colorClass}`}>
                {m.value ?? 0}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        <div>
          <Progress value={averageProgress} className="gba:h-1.5 gba:mb-1" />
          <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
            {averageProgress}% avg. progress · {totalGoals} total goals
          </p>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <Button onClick={onNavigateToTeamPerformance} variant="outline" size="sm" className="gba:h-8">
            <UsersThree size={14} className="gba:mr-1" />
            Team performance
          </Button>
          {onNavigateToTeamPerformanceOverview && (
            <Button onClick={onNavigateToTeamPerformanceOverview} variant="outline" size="sm" className="gba:h-8">
              <ChartLineUp size={14} className="gba:mr-1" />
              Performance trends
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
