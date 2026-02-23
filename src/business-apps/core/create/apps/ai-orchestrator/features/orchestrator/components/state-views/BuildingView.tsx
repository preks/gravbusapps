import React from 'react'
import { Badge, Button, Card, CardContent } from '@newwork/nw-design-system'
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
      <div className="gba:space-y-4">
        <Card className="gba:border-border/80">
          <CardContent className="gba:p-4 gba:space-y-3">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                  <h3 className="gba:text-base gba:font-semibold gba:text-foreground">Building your components</h3>
                  <Badge variant="secondary" className="gba:text-xs">
                    {overallProgress}%
                  </Badge>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {completedCount + reusedCount} of {totalCount} completed
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onCancel} disabled={!isBuilding}>
                Cancel Build
              </Button>
            </div>

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
              className="gba:pt-1"
            />
          </CardContent>
        </Card>

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
