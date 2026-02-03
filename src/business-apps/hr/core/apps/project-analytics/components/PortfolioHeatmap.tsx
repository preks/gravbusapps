import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { ProjectAnalyticsData } from '../types'

interface PortfolioHeatmapProps {
  projects: ProjectAnalyticsData[]
  onProjectClick: (project: ProjectAnalyticsData) => void
  prefixDataTestId?: string
}

/**
 * Portfolio Heatmap showing projects in a quadrant view:
 * X-axis: Time Elapsed (%)
 * Y-axis: Budget Used (%)
 *
 * Quadrants:
 * - Top-Left: Over Budget (high budget, low time)
 * - Top-Right: At Risk (high budget, high time)
 * - Bottom-Left: Underused (low budget, low time)
 * - Bottom-Right: Healthy (low budget, high time)
 */
export const PortfolioHeatmap: React.FC<PortfolioHeatmapProps> = ({
  projects,
  onProjectClick,
  prefixDataTestId = 'portfolio-heatmap'
}) => {
  // Calculate position for each project dot
  const getProjectPosition = (project: ProjectAnalyticsData): { x: number; y: number } => {
    // Clamp values between 0-100 for display, but allow over 100% for y
    const x = Math.min(Math.max(project.elapsedTimePercent, 0), 100)
    const y = Math.min(Math.max(project.budgetConsumptionPercent, 0), 120)
    return { x, y }
  }

  // Get color based on risk status
  const getProjectColor = (project: ProjectAnalyticsData): string => {
    switch (project.riskStatus) {
      case 'on-track':
        return 'gba:bg-success'
      case 'at-risk':
        return 'gba:bg-warning'
      case 'over-budget':
        return 'gba:bg-destructive'
      case 'not-started':
        return 'gba:bg-muted'
      default:
        return 'gba:bg-primary'
    }
  }

  // Filter projects that have meaningful data
  const plotableProjects = projects.filter(
    p => p.hoursBudget && p.hoursBudget > 0 && (p.elapsedTimePercent > 0 || p.budgetConsumptionPercent > 0)
  )

  return (
    <Card data-testid={prefixDataTestId}>
      <CardHeader>
        <CardTitle className="gba:text-base">Portfolio Health Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:relative gba:w-full gba:h-[400px] gba:border gba:border-border gba:rounded-lg gba:bg-card">
          {/* Y-axis label */}
          <div className="gba:absolute gba:-left-8 gba:top-1/2 gba:-translate-y-1/2 gba:-rotate-90 gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
            Budget Used (%)
          </div>

          {/* X-axis label */}
          <div className="gba:absolute gba:bottom-[-24px] gba:left-1/2 gba:-translate-x-1/2 gba:text-sm gba:text-muted-foreground">
            Time Elapsed (%)
          </div>

          {/* Quadrant lines */}
          <div className="gba:absolute gba:left-1/2 gba:top-0 gba:bottom-0 gba:w-px gba:bg-border gba:opacity-50" />
          <div className="gba:absolute gba:top-1/2 gba:left-0 gba:right-0 gba:h-px gba:bg-border gba:opacity-50" />

          {/* 100% budget line */}
          <div
            className="gba:absolute gba:left-0 gba:right-0 gba:h-px gba:bg-destructive/30"
            style={{ top: `${100 - (100 / 120) * 100}%` }}
          />

          {/* Quadrant Labels */}
          <div className="gba:absolute gba:top-2 gba:left-2 gba:text-xs gba:text-muted-foreground gba:opacity-50">
            Overrun Risk
          </div>
          <div className="gba:absolute gba:top-2 gba:right-2 gba:text-xs gba:text-muted-foreground gba:opacity-50">
            Critical
          </div>
          <div className="gba:absolute gba:bottom-2 gba:left-2 gba:text-xs gba:text-muted-foreground gba:opacity-50">
            Underutilized
          </div>
          <div className="gba:absolute gba:bottom-2 gba:right-2 gba:text-xs gba:text-muted-foreground gba:opacity-50">
            Healthy
          </div>

          {/* Y-axis ticks */}
          {[0, 25, 50, 75, 100].map(tick => (
            <div
              key={`y-${tick}`}
              className="gba:absolute gba:left-0 gba:text-xs gba:text-muted-foreground gba:-translate-x-6"
              style={{ top: `${100 - (tick / 120) * 100}%` }}
            >
              {tick}
            </div>
          ))}

          {/* X-axis ticks */}
          {[0, 25, 50, 75, 100].map(tick => (
            <div
              key={`x-${tick}`}
              className="gba:absolute gba:bottom-0 gba:text-xs gba:text-muted-foreground gba:translate-y-5"
              style={{ left: `${tick}%`, transform: `translateX(-50%) translateY(20px)` }}
            >
              {tick}
            </div>
          ))}

          {/* Project dots */}
          {plotableProjects.map(project => {
            const { x, y } = getProjectPosition(project)
            const colorClass = getProjectColor(project)

            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                className={`gba:absolute gba:w-4 gba:h-4 gba:rounded-full ${colorClass} gba:cursor-pointer gba:transition-transform gba:hover:scale-150 gba:border-2 gba:border-background`}
                style={{
                  left: `${x}%`,
                  top: `${100 - (y / 120) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => onProjectClick(project)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onProjectClick(project)
                  }
                }}
                title={`${project.name}: ${project.budgetConsumptionPercent}% budget, ${project.elapsedTimePercent}% time`}
                data-testid={`${prefixDataTestId}-dot-${project.id}`}
              />
            )
          })}

          {/* Empty state */}
          {plotableProjects.length === 0 && (
            <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:text-muted-foreground">
              No projects with budget data to display
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:mt-6">
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success" />
            <span className="gba:text-xs gba:text-muted-foreground">On Track</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-warning" />
            <span className="gba:text-xs gba:text-muted-foreground">At Risk</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-destructive" />
            <span className="gba:text-xs gba:text-muted-foreground">Over Budget</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-muted" />
            <span className="gba:text-xs gba:text-muted-foreground">Not Started</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
