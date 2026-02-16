/**
 * ProgressTilesGrid - Grid layout for build progress tiles
 *
 * Displays 5 tiles for each component type:
 * - Screens, Agents, Functions, Flows, Data Models
 *
 * Shows overall progress and allows expanding/collapsing details
 */

import React from 'react'
import { Progress, Badge } from '@newwork/nw-design-system'
import { CheckCircle2, Clock, Loader2, Search, Link2, Recycle } from 'lucide-react'
import { BuildTile } from './BuildTile'
import type { TileState, ComponentType, BuildStatus, BuildPhase } from '../../types'

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
 * Get phase display info - Monochrome
 */
function getPhaseInfo(phase: BuildPhase | null): { icon: React.ReactNode; label: string } {
  switch (phase) {
    case 'discovery':
      return { icon: <Search className="gba:w-4 gba:h-4" />, label: 'Discovery' }
    case 'building':
      return { icon: <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />, label: 'Building' }
    case 'wiring':
      return { icon: <Link2 className="gba:w-4 gba:h-4" />, label: 'Connecting' }
    case 'complete':
      return { icon: <CheckCircle2 className="gba:w-4 gba:h-4" />, label: 'Complete' }
    default:
      return { icon: <Clock className="gba:w-4 gba:h-4" />, label: 'Pending' }
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
  // Derive display counts from tile states (not the premature completedCount counter).
  // During the publish phase, tiles that are still being generated show as 'building',
  // so they won't count as "built" until generation is actually done.
  const displayBuiltCount = Object.values(tiles).reduce((count, tile) => {
    if (tile.status === 'completed') {
      return count + tile.items.filter((i: any) => i.status === 'completed').length
    }
    return count
  }, 0)
  const displayReusedCount = Object.values(tiles).reduce((count, tile) => {
    return count + tile.items.filter((i: any) => i.status === 'reused').length
  }, 0)

  const overallStatus = getOverallStatus(isBuilding, completedCount, failedCount, reusedCount, totalCount)
  const phaseInfo = getPhaseInfo(currentPhase ?? null)

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Overall Progress Header - Monochrome */}
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <h3 className="gba:font-semibold gba:text-foreground">
                  {overallStatus === 'building' && 'Building your components...'}
                  {overallStatus === 'completed' && 'Build complete'}
                  {overallStatus === 'error' && 'Build completed with errors'}
                  {overallStatus === 'pending' && 'Ready to build'}
                </h3>

                {/* Phase badge - Monochrome */}
                {currentPhase && isBuilding && (
                  <Badge variant="secondary" className="gba:bg-muted gba:text-foreground gba:border-border">
                    <span className="gba:flex gba:items-center gba:gap-1.5">
                      {phaseInfo.icon}
                      {phaseInfo.label}
                    </span>
                  </Badge>
                )}
              </div>

              <p className="gba:text-sm gba:text-muted-foreground">
                {displayBuiltCount} built
                {displayReusedCount > 0 && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:ml-1">
                    <Recycle className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                    {displayReusedCount} reused
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

        {/* Progress bar - Monochrome */}
        <Progress value={overallProgress} className="gba:h-2 [&>div]:gba:bg-foreground" />
      </div>

      {/* Tiles Grid - sorted: active first, completed/reused next, pending/skipped last */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
        {[...tileOrder]
          .sort((a, b) => {
            const priority = (status: string) => {
              if (['building', 'discovering', 'wiring', 'analyzing'].includes(status)) return 0
              if (['completed', 'reused', 'error'].includes(status)) return 1
              return 2 // pending, skipped
            }
            return priority(tiles[a].status) - priority(tiles[b].status)
          })
          .map(type => (
            <BuildTile key={type} tile={tiles[type]} data-testid={`${testId}-tile-${type}`} />
          ))}
      </div>
    </div>
  )
}

export default ProgressTilesGrid
