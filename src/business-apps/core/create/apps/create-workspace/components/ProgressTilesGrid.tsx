/**
 * ProgressTilesGrid - Grid layout for build progress tiles
 *
 * Displays 5 tiles for each component type:
 * - Screens, Agents, Functions, Flows, Data Models
 *
 * Shows overall progress and allows expanding/collapsing details
 */

import React from 'react'
import { Progress, cn, Badge } from '@newwork/nw-design-system'
import { CheckCircle2, XCircle, Clock, Loader2, Search, Link2, Recycle } from 'lucide-react'
import { BuildTile } from './tiles'
import type { TileState, ComponentType, BuildStatus, BuildPhase } from '../types/orchestrator'

export interface ProgressTilesGridProps {
  tiles: TileState
  overallProgress: number
  completedCount: number
  failedCount: number
  reusedCount?: number
  totalCount: number
  isBuilding: boolean
  currentPhase?: BuildPhase | null
  phaseMessage?: string | null
  'data-testid'?: string
}

// Order of tiles to display
const tileOrder: ComponentType[] = ['data_model', 'function', 'agent', 'flow', 'screen']

/**
 * Get phase display info
 */
function getPhaseInfo(phase: BuildPhase | null): { icon: React.ReactNode; label: string; color: string } {
  switch (phase) {
    case 'discovery':
      return { icon: <Search className="gba:w-4 gba:h-4" />, label: 'Discovery', color: 'info' }
    case 'building':
      return { icon: <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />, label: 'Building', color: 'info' }
    case 'wiring':
      return { icon: <Link2 className="gba:w-4 gba:h-4" />, label: 'Connecting', color: 'info' }
    case 'complete':
      return { icon: <CheckCircle2 className="gba:w-4 gba:h-4" />, label: 'Complete', color: 'success' }
    default:
      return { icon: <Clock className="gba:w-4 gba:h-4" />, label: 'Pending', color: 'offline' }
  }
}

/**
 * Get overall status from counts
 */
function getOverallStatus(
  isBuilding: boolean,
  completedCount: number,
  failedCount: number,
  reusedCount: number,
  totalCount: number
): BuildStatus {
  if (isBuilding) return 'building'
  if (totalCount === 0) return 'pending'
  if (completedCount + reusedCount === totalCount) return 'completed'
  if (failedCount > 0 && completedCount + failedCount + reusedCount === totalCount) return 'error'
  return 'pending'
}

/**
 * ProgressTilesGrid component
 */
export const ProgressTilesGrid: React.FC<ProgressTilesGridProps> = ({
  tiles,
  overallProgress,
  completedCount,
  failedCount,
  reusedCount = 0,
  totalCount,
  isBuilding,
  currentPhase,
  phaseMessage,
  'data-testid': testId = 'progress-tiles-grid'
}) => {
  const overallStatus = getOverallStatus(isBuilding, completedCount, failedCount, reusedCount, totalCount)
  const phaseInfo = getPhaseInfo(currentPhase ?? null)

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Overall Progress Header */}
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            {overallStatus === 'building' && <Loader2 className="gba:w-5 gba:h-5 gba:text-info gba:animate-spin" />}
            {overallStatus === 'completed' && <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-success" />}
            {overallStatus === 'error' && <XCircle className="gba:w-5 gba:h-5 gba:text-destructive" />}
            {overallStatus === 'pending' && <Clock className="gba:w-5 gba:h-5 gba:text-muted-foreground" />}

            <div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <h3 className="gba:font-semibold gba:text-foreground">
                  {overallStatus === 'building' && 'Building your components...'}
                  {overallStatus === 'completed' && 'Build complete!'}
                  {overallStatus === 'error' && 'Build completed with errors'}
                  {overallStatus === 'pending' && 'Ready to build'}
                </h3>

                {/* Phase badge */}
                {currentPhase && isBuilding && (
                  <Badge variant={phaseInfo.color as 'info' | 'success' | 'offline'}>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      {phaseInfo.icon}
                      {phaseInfo.label}
                    </span>
                  </Badge>
                )}
              </div>

              <p className="gba:text-sm gba:text-muted-foreground">
                {completedCount} built
                {reusedCount > 0 && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:ml-1">
                    <Recycle className="gba:w-3 gba:h-3 gba:text-success" />
                    {reusedCount} reused
                  </span>
                )}
                {failedCount > 0 && `, ${failedCount} failed`}
                {' of '}
                {totalCount} components
              </p>

              {/* Phase message */}
              {phaseMessage && isBuilding && (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-1">{phaseMessage}</p>
              )}
            </div>
          </div>

          <span className="gba:text-2xl gba:font-bold gba:text-foreground">{overallProgress}%</span>
        </div>

        <Progress
          value={overallProgress}
          className={cn(
            'gba:h-2',
            overallStatus === 'completed' && '[&>div]:gba:bg-success',
            overallStatus === 'error' && '[&>div]:gba:bg-destructive'
          )}
        />
      </div>

      {/* Tiles Grid */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
        {tileOrder.map(type => (
          <BuildTile key={type} tile={tiles[type]} data-testid={`${testId}-tile-${type}`} />
        ))}
      </div>
    </div>
  )
}

export default ProgressTilesGrid
