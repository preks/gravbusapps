// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@newwork/nw-design-system'
import { BarChart3, Users } from 'lucide-react'

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNavigateToAtRiskGoals,
  onNavigateToTeamPerformanceOverview
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }} className="gba:p-4 gba:h-full">
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
    <Card data-testid="performance-growth-section" style={{ borderRadius: '12px' }} className="gba:p-4 gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">Performance & Growth</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Active cycle goal progress</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <style>{`
          [data-layout="perf-metrics"] {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 0.5rem;
          }
          [data-layout="perf-metrics"] > div {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }
          [data-layout="perf-buttons"] {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 0.5rem;
          }
          [data-layout="perf-buttons"] > button {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }
        `}</style>
        <div data-layout="perf-metrics">
          {metrics.map(m => (
            <div
              key={m.label}
              style={{
                textAlign: 'center',
                padding: '0.5rem 0.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--gba-surface, #f8f9fa)'
              }}
            >
              <p className={m.colorClass} style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>
                {m.value ?? 0}
              </p>
              <p
                className="gba:text-muted-foreground"
                style={{ fontSize: '0.65rem', marginTop: '2px', lineHeight: 1.2 }}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>

        <div>
          <Progress value={averageProgress} className="gba:h-1.5 gba:mb-1" />
          <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
            {averageProgress}% avg. progress · {totalGoals} total goals
          </p>
        </div>

        <div data-layout="perf-buttons">
          <Button onClick={onNavigateToTeamPerformance} variant="outline" size="sm" className="gba:h-8">
            <Users size={14} className="gba:mr-1" />
            Team goals
          </Button>
          {onNavigateToTeamPerformanceOverview && (
            <Button onClick={onNavigateToTeamPerformanceOverview} variant="outline" size="sm" className="gba:h-8">
              <BarChart3 size={14} className="gba:mr-1" />
              Trends
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
