/**
 * BuildingView - Active build progress state
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { PhaseTimeline } from '../../components/widgets/PhaseTimeline'
import { BuildConsoleLog, type BuildLogEntry } from '../../components/widgets/BuildConsoleLog'
import { ProgressTilesGrid } from '../../components/progress/ProgressTilesGrid'
import type { BuildPhase, TileState } from '../../types'

export interface BuildingViewProps {
  // Phase state
  currentPhase: BuildPhase | null
  completedPhases: BuildPhase[]
  overallProgress: number

  // Progress counts
  completedCount: number
  reusedCount: number
  failedCount: number
  totalCount: number

  // Build state
  isBuilding: boolean
  phaseMessage: string | null
  tiles: TileState
  logs: BuildLogEntry[]

  // Actions
  onCancel: () => void

  'data-testid'?: string
}

export const BuildingView: React.FC<BuildingViewProps> = ({
  currentPhase,
  completedPhases,
  overallProgress,
  completedCount,
  reusedCount,
  failedCount,
  totalCount,
  isBuilding,
  phaseMessage,
  tiles,
  logs,
  onCancel,
  'data-testid': testId
}) => {
  return (
    <div className="gba:space-y-6">
      {/* Phase timeline */}
      <PhaseTimeline
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        overallProgress={overallProgress}
        className="gba:sticky gba:top-4 gba:z-10 gba:bg-background gba:py-4"
        data-testid={`${testId}-phase-timeline`}
      />

      {/* Overall progress */}
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">Overall Progress</span>
          <span className="gba:text-sm gba:font-semibold gba:text-foreground">{overallProgress}%</span>
        </div>
        <div className="gba:w-full gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
          <div
            className="gba:h-full gba:bg-info gba:transition-all gba:duration-300 gba:ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="gba:text-xs gba:text-muted-foreground">
          {completedCount} completed • {reusedCount} reused • {totalCount - completedCount - reusedCount} remaining
        </p>
      </div>

      {/* Console log */}
      <BuildConsoleLog
        logs={logs}
        currentOperation={phaseMessage}
        isBuilding={isBuilding}
        data-testid={`${testId}-console`}
      />

      {/* Component tiles */}
      <ProgressTilesGrid
        tiles={tiles}
        overallProgress={overallProgress}
        completedCount={completedCount}
        failedCount={failedCount}
        reusedCount={reusedCount}
        totalCount={totalCount}
        isBuilding={isBuilding}
        currentPhase={currentPhase}
        phaseMessage={phaseMessage}
        data-testid={`${testId}-progress-grid`}
      />

      <div className="gba:flex gba:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={!isBuilding}>
          Cancel Build
        </Button>
      </div>
    </div>
  )
}
