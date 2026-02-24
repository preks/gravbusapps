import React from 'react'
import { CheckCircle2, Loader2, Recycle, XCircle } from 'lucide-react'
import { Canvas } from '../layouts/Canvas'
import { PhaseTimeline } from '../widgets/PhaseTimeline'
import { BuildConsoleLog, type BuildLogEntry } from '../widgets/BuildConsoleLog'
import { ProgressTilesGrid } from '../progress/ProgressTilesGrid'
import { AppIconBadge } from '../ui/AppIconBadge'
import type { BuildPhase, TileState } from '../../types'
import type { AppMetadata } from '../../types/build'

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
  appMetadata?: AppMetadata
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
  appMetadata
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
      {/* App Identity Header */}
      {appMetadata && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-background gba:shrink-0">
          <AppIconBadge iconName={appMetadata.icon} size="md" />
          <div className="gba:min-w-0">
            <p className="gba:font-semibold gba:text-foreground gba:text-base gba:leading-tight">{appMetadata.name}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:truncate">{appMetadata.description}</p>
          </div>
        </div>
      )}

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
              isBuilding={isBuilding}
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
    </div>
  )
}
