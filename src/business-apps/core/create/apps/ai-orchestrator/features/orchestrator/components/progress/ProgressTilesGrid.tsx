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
  isProgressEstimated?: boolean
  showHeader?: boolean
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
  isProgressEstimated = false,
  showHeader = true,
  'data-testid': testId = 'progress-tiles-grid'
}) => {
  // Truthful counters are derived from item lifecycle states in the tiles.
  const displayBuiltCount = Object.values(tiles).reduce(
    (count, tile) => count + tile.items.filter((i: any) => i.status === 'completed').length,
    0
  )
  const displayReusedCount = Object.values(tiles).reduce((count, tile) => {
    return count + tile.items.filter((i: any) => i.status === 'reused').length
  }, 0)
  const displayFailedCount = Object.values(tiles).reduce((count, tile) => {
    return count + tile.items.filter((i: any) => i.status === 'error').length
  }, 0)

  const effectiveCompleted = Math.max(completedCount, displayBuiltCount)
  const effectiveReused = Math.max(reusedCount, displayReusedCount)
  const effectiveFailed = Math.max(failedCount, displayFailedCount)
  const overallStatus = getOverallStatus(isBuilding, effectiveCompleted, effectiveFailed, effectiveReused, totalCount)
  const phaseInfo = getPhaseInfo(currentPhase ?? null)
  const revealedTilesRef = React.useRef<Set<ComponentType>>(new Set())

  const currentlyRelevantTiles = tileOrder.filter(type => {
    const tile = tiles[type]
    if (tile.items.length === 0) return false
    const hasRelevantItemState = tile.items.some((i: any) =>
      ['building', 'completed', 'reused', 'error', 'discovering', 'wiring'].includes(i.status)
    )
    const hasRelevantTileState = ['building', 'discovering', 'wiring', 'completed', 'error'].includes(tile.status)
    return hasRelevantTileState || hasRelevantItemState
  })
  if (currentlyRelevantTiles.length === 0 && !isBuilding) {
    revealedTilesRef.current = new Set()
  }
  currentlyRelevantTiles.forEach(type => revealedTilesRef.current.add(type))
  const visibleTiles = tileOrder.filter(type => revealedTilesRef.current.has(type))

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Overall Progress Header - Monochrome */}
      {showHeader && (
        <div className="gba:space-y-2.5">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h3 className="gba:font-semibold gba:text-sm gba:text-foreground">
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

                <p className="gba:text-xs gba:text-muted-foreground">
                  {displayBuiltCount} built
                  {displayReusedCount > 0 && (
                    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:ml-1">
                      <Recycle className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                      {displayReusedCount} reused
                    </span>
                  )}
                  {displayFailedCount > 0 && `, ${displayFailedCount} failed`}
                  {' of '}
                  {totalCount} components
                </p>

                {/* Phase message */}
                {phaseMessage && isBuilding && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-0.5">{phaseMessage}</p>
                )}
              </div>
            </div>
            <div className="gba:text-right">
              <span className="gba:text-xl gba:font-bold gba:text-foreground">{overallProgress}%</span>
              {isProgressEstimated && isBuilding && (
                <p className="gba:text-[10px] gba:text-muted-foreground gba:leading-none">estimated</p>
              )}
            </div>
          </div>

          {/* Progress bar - Monochrome */}
          <Progress value={overallProgress} className="gba:h-2 [&>div]:gba:bg-foreground" />
        </div>
      )}

      {/* Tiles List - stable order to avoid jumpy card movement */}
      <div className="gba:flex gba:flex-col gba:gap-2">
        {visibleTiles.map(type => (
          <BuildTile key={type} tile={tiles[type]} data-testid={`${testId}-tile-${type}`} />
        ))}
      </div>
    </div>
  )
}

export default ProgressTilesGrid
