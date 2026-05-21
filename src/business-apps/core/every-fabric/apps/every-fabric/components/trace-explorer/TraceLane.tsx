import { memo } from 'react'
import type { MeshNode, TraceFrame } from '../../utils/traceModel'
import { TraceBar } from './TraceBar'

interface TraceLaneProps {
  node: MeshNode
  frames: TraceFrame[]
  durationMs: number
  labelWidth: number
  selectedFrameId: string | null
  onSelectFrame: (frame: TraceFrame) => void
}

const KIND_INDICATOR: Record<MeshNode['kind'], string> = {
  orchestrator: 'gba:bg-primary',
  subagent: 'gba:bg-emerald-500',
  expert: 'gba:bg-violet-500',
  skill: 'gba:bg-teal-500',
  tool: 'gba:bg-sky-500'
}

/**
 * Single horizontal lane in the Gantt timeline, representing one agent/tool.
 * Renders bars for each frame whose `nodeId` matches this lane's node.
 */
export const TraceLane: React.FC<TraceLaneProps> = memo(
  ({ node, frames, durationMs, labelWidth, selectedFrameId, onSelectFrame }) => {
    if (durationMs <= 0) return null

    return (
      <div
        className="gba:flex gba:items-stretch gba:border-b gba:border-border/30 gba:hover:bg-muted/20 gba:transition-colors gba:h-10"
        data-testid={`trace-lane-${node.id}`}
      >
        <div
          className="gba:shrink-0 gba:flex gba:items-center gba:gap-2 gba:px-3 gba:border-r gba:border-border/40"
          style={{ width: labelWidth }}
        >
          <span
            className={`gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:shrink-0 ${KIND_INDICATOR[node.kind] ?? 'gba:bg-muted-foreground/40'}`}
          />
          <span
            className="gba:truncate gba:text-[12px] gba:font-medium gba:text-foreground"
            title={`${node.label} (${node.kind})`}
          >
            {node.label}
          </span>
        </div>

        <div className="gba:relative gba:flex-1 gba:min-w-0">
          {frames.map(frame => {
            const left = Math.max(0, Math.min(1, frame.offsetMs / durationMs))
            const barDuration = frame.durationMs ?? Math.max(durationMs * 0.005, 200)
            const width = Math.max(0, Math.min(1 - left, barDuration / durationMs))

            return (
              <TraceBar
                key={frame.id}
                frame={frame}
                left={left}
                width={width}
                isSelected={frame.id === selectedFrameId}
                onSelect={onSelectFrame}
              />
            )
          })}
        </div>
      </div>
    )
  }
)

TraceLane.displayName = 'TraceLane'
