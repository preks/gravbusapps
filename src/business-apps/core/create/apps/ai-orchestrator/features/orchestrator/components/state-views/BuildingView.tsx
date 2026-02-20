import React from 'react'
import { CheckCircle2, Loader2, Recycle, XCircle } from 'lucide-react'
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
  tiles
}) => {
  return (
    <Canvas>
      <div className="gba:space-y-4">
        {/* Progress stats and phase timeline */}
        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-center gba:gap-4 gba:flex-wrap gba:text-xs">
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-emerald-600">
              <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />
              {completedCount} built
            </span>
            {reusedCount > 0 && (
              <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-blue-600">
                <Recycle className="gba:w-3.5 gba:h-3.5" />
                {reusedCount} reused
              </span>
            )}
            {failedCount > 0 && (
              <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-destructive">
                <XCircle className="gba:w-3.5 gba:h-3.5" />
                {failedCount} failed
              </span>
            )}
            {isBuilding && (
              <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-muted-foreground">
                <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" />
                {phaseMessage || 'Processing build...'}
              </span>
            )}
          </div>

          <PhaseTimeline
            currentPhase={currentPhase}
            completedPhases={completedPhases}
            overallProgress={overallProgress}
          />
        </div>

        <BuildConsoleLog logs={buildLogs} currentOperation={phaseMessage} isBuilding={isBuilding} maxHeight="220px" />

        <div className="gba:min-h-0">
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
            showHeader={false}
          />
        </div>
      </div>
    </Canvas>
  )
}
