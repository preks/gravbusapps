import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { PhaseTimeline } from '../widgets/PhaseTimeline'
import { BuildConsoleLog, type BuildLogEntry } from '../widgets/BuildConsoleLog'
import { ProgressTilesGrid } from '../progress/ProgressTilesGrid'
import type { BuildPhase, TileState } from '../../types'

export interface BuildingViewProps {
  currentPhase: BuildPhase | null
  completedPhases: BuildPhase[]
  overallProgress: number
  completedCount: number
  reusedCount: number
  totalCount: number
  failedCount: number
  buildLogs: BuildLogEntry[]
  phaseMessage: string | null
  isBuilding: boolean
  tiles: TileState
  onCancel: () => void
}

export const BuildingView: React.FC<BuildingViewProps> = ({
  currentPhase,
  completedPhases,
  overallProgress,
  completedCount,
  reusedCount,
  totalCount,
  failedCount,
  buildLogs,
  phaseMessage,
  isBuilding,
  tiles,
  onCancel
}) => {
  return (
    <Canvas title="Building" subtitle="Creating your components">
      <div className="gba:space-y-6">
        <PhaseTimeline
          currentPhase={currentPhase}
          completedPhases={completedPhases}
          overallProgress={overallProgress}
          className="gba:sticky gba:top-4 gba:z-10 gba:bg-background gba:py-4"
        />

        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:font-medium gba:text-foreground">Overall Progress</span>
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{overallProgress}%</span>
          </div>
          <div className="gba:w-full gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
            <div
              className="gba:h-full gba:bg-foreground gba:transition-all gba:duration-300 gba:ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {completedCount} completed • {reusedCount} reused • {totalCount - completedCount - reusedCount} remaining
          </p>
        </div>

        <BuildConsoleLog logs={buildLogs} currentOperation={phaseMessage} isBuilding={isBuilding} />

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
        />

        <div className="gba:flex gba:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={!isBuilding}>
            Cancel Build
          </Button>
        </div>
      </div>
    </Canvas>
  )
}
