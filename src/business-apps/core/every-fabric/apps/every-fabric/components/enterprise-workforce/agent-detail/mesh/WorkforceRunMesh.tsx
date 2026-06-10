// 3D/2D agent-mesh view for a single Workforce run.
//
// Feeds the shared AgentMeshCanvas (reused from the interactive surface) with a
// TraceModel built from the run's trace via `workforceTraceToModel`. While the
// run streams, the mesh updates live (isLive → no replay clamp) and a right-rail
// activity feed lists the latest steps as a human-readable transcript. When the
// run is terminal the mesh shows the full graph (replay at the end).

import { PulseIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { AgentMeshCanvas } from '../../../agent-mesh/AgentMeshCanvas'
import { LiveStatusPill } from '../../LiveStatusPill'
import { workforceTraceToModel } from '../../workforceTraceToModel'
import { formatTimeOnly } from '../../runDisplay'
import type { TraceFrame } from '../../../../utils/traceModel'
import type { WorkforceRunTraceEvent } from '../../workforceTypes'

export interface WorkforceRunMeshProps {
  trace: readonly WorkforceRunTraceEvent[] | undefined
  isStreaming: boolean
  isConnected: boolean
}

const FEED_LIMIT = 16

function frameTone(status: TraceFrame['status']): string {
  if (status === 'failed') return 'gba:text-destructive'
  if (status === 'running') return 'gba:text-primary'
  return 'gba:text-foreground'
}

const ActivitySidebar: React.FC<{ frames: TraceFrame[]; isStreaming: boolean; isConnected: boolean }> = ({
  frames,
  isStreaming,
  isConnected
}) => {
  const recent = useMemo(() => frames.slice(-FEED_LIMIT).reverse(), [frames])
  return (
    <aside
      className="gba:flex gba:w-72 gba:shrink-0 gba:flex-col gba:rounded-xl gba:border gba:border-border/60 gba:bg-card"
      data-testid="workforce-run-mesh-feed"
    >
      <header className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-border/60 gba:px-3 gba:py-2">
        <PulseIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="bold" />
        <h3 className="gba:text-xs gba:font-semibold gba:text-foreground">Live activity</h3>
        {isStreaming && (
          <span className="gba:ml-auto">
            <LiveStatusPill connected={isConnected} />
          </span>
        )}
      </header>
      <div className="gba:max-h-[420px] gba:flex-1 gba:overflow-y-auto gba:p-2">
        {recent.length === 0 ? (
          <p className="gba:px-1 gba:py-4 gba:text-center gba:text-[11px] gba:text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="gba:space-y-1.5">
            {recent.map(frame => (
              <li
                key={frame.id}
                className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-background gba:px-2.5 gba:py-1.5"
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className={`gba:truncate gba:text-[11px] gba:font-medium ${frameTone(frame.status)}`}>
                    {frame.title}
                  </span>
                  <span className="gba:shrink-0 gba:text-[10px] gba:text-muted-foreground">
                    {formatTimeOnly(frame.timestamp)}
                  </span>
                </div>
                {frame.summary && (
                  <p className="gba:mt-0.5 gba:truncate gba:text-[10px] gba:text-muted-foreground">{frame.summary}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  )
}

export const WorkforceRunMesh: React.FC<WorkforceRunMeshProps> = ({ trace, isStreaming, isConnected }) => {
  const model = useMemo(() => workforceTraceToModel(trace), [trace])
  const durationMs = model.summary.durationMs

  return (
    <div className="gba:flex gba:gap-3" data-testid="workforce-run-mesh">
      <div className="gba:h-[460px] gba:min-w-0 gba:flex-1 gba:overflow-hidden gba:rounded-xl gba:border gba:border-border/60 gba:bg-card">
        <AgentMeshCanvas
          model={model}
          positionMs={durationMs}
          durationMs={durationMs}
          isLive={isStreaming}
          dense
          showLiveHud={isStreaming}
        />
      </div>
      <ActivitySidebar frames={model.frames} isStreaming={isStreaming} isConnected={isConnected} />
    </div>
  )
}
