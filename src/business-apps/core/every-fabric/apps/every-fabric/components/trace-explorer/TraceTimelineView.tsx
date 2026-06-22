// Gantt-style timeline view showing frames as bars in horizontal lanes per node.

import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { TraceModel, TraceFrame } from '../../utils/traceModel'
import type { ReplayClockApi } from '../../hooks/useReplayClock'
import { TraceLane } from './TraceLane'
import { TraceStepDetail } from './TraceStepDetail'
import { LEGEND_KINDS, traceColor } from './traceColors'
import translations from '../../_i18n'

interface TraceTimelineViewProps {
  model: TraceModel
  clock: ReplayClockApi
  isLive: boolean
}

const MAX_VISIBLE_FRAMES = 500
const TICK_COUNT = 6
const LANE_LABEL_WIDTH = 180

function buildLanes(frames: TraceFrame[]): Map<string, TraceFrame[]> {
  const lanes = new Map<string, TraceFrame[]>()
  for (const frame of frames) {
    const existing = lanes.get(frame.nodeId)
    if (existing) {
      existing.push(frame)
    } else {
      lanes.set(frame.nodeId, [frame])
    }
  }
  return lanes
}

function formatTick(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

export const TraceTimelineView: React.FC<TraceTimelineViewProps> = memo(({ model, clock, isLive }) => {
  const { t } = useTranslation(translations)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)

  const visibleFrames = useMemo(() => {
    const filtered = isLive ? model.frames : model.frames.filter(f => f.offsetMs <= clock.positionMs + 1)
    return filtered.length > MAX_VISIBLE_FRAMES ? filtered.slice(0, MAX_VISIBLE_FRAMES) : filtered
  }, [model.frames, clock.positionMs, isLive])

  const isTruncated = model.frames.length > MAX_VISIBLE_FRAMES

  const lanes = useMemo(() => buildLanes(visibleFrames), [visibleFrames])

  const laneNodes = useMemo(() => model.nodes.filter(n => lanes.has(n.id)), [model.nodes, lanes])

  const selectedFrame = useMemo(
    () => (selectedFrameId ? (model.frames.find(f => f.id === selectedFrameId) ?? null) : null),
    [model.frames, selectedFrameId]
  )

  const handleSelectFrame = useCallback(
    (frame: TraceFrame) => {
      setSelectedFrameId(prev => (prev === frame.id ? null : frame.id))
      if (!isLive) clock.seek(frame.offsetMs)
    },
    [isLive, clock]
  )

  const handleCloseDetail = useCallback(() => setSelectedFrameId(null), [])

  const durationMs = model.summary.durationMs

  const ticks = useMemo(() => {
    if (durationMs <= 0) return []
    const result: Array<{ pct: number; label: string }> = []
    for (let i = 0; i <= TICK_COUNT; i++) {
      const pct = i / TICK_COUNT
      result.push({ pct, label: formatTick(durationMs * pct) })
    }
    return result
  }, [durationMs])

  if (laneNodes.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:flex-1 gba:text-muted-foreground gba:text-sm"
        data-testid="trace-timeline-view"
      >
        {t('trace-explorer-timeline-empty')}
      </div>
    )
  }

  const playheadPct = durationMs > 0 ? (clock.positionMs / durationMs) * 100 : 0

  return (
    <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid="trace-timeline-view">
      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
        {/* Time axis ruler */}
        <div className="gba:relative gba:flex gba:items-end gba:h-7 gba:border-b gba:border-border/40 gba:bg-muted/20 gba:shrink-0">
          <div
            className="gba:shrink-0 gba:border-r gba:border-border/40 gba:h-full"
            style={{ width: LANE_LABEL_WIDTH }}
          />
          <div className="gba:relative gba:flex-1 gba:h-full">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="gba:absolute gba:bottom-0 gba:flex gba:flex-col gba:items-center gba:gap-0.5"
                style={{
                  left: `${tick.pct * 100}%`,
                  transform:
                    i === 0 ? 'translateX(0)' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)'
                }}
              >
                <span className="gba:text-[10px] gba:text-muted-foreground gba:tabular-nums gba:px-1">
                  {tick.label}
                </span>
              </div>
            ))}
            {durationMs > 0 && (
              <div
                className="gba:absolute gba:top-0 gba:bottom-0 gba:w-px gba:bg-destructive gba:transition-[left] gba:duration-75 gba:pointer-events-none"
                style={{ left: `${playheadPct}%` }}
              />
            )}
          </div>
        </div>

        {/* Lanes area with vertical grid */}
        <div className="gba:relative gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overflow-x-hidden">
          {/* Vertical grid lines, behind bars */}
          <div className="gba:absolute gba:inset-0 gba:pointer-events-none" style={{ paddingLeft: LANE_LABEL_WIDTH }}>
            <div className="gba:relative gba:h-full gba:w-full">
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="gba:absolute gba:top-0 gba:bottom-0 gba:w-px gba:bg-border/30"
                  style={{ left: `${tick.pct * 100}%` }}
                />
              ))}
              {/* Live playhead extended through lanes */}
              {durationMs > 0 && (
                <div
                  className="gba:absolute gba:top-0 gba:bottom-0 gba:w-px gba:bg-destructive/40"
                  style={{ left: `${playheadPct}%` }}
                />
              )}
            </div>
          </div>

          {/* Lanes */}
          <div className="gba:relative">
            {laneNodes.map(node => (
              <TraceLane
                key={node.id}
                node={node}
                frames={lanes.get(node.id) ?? []}
                durationMs={durationMs}
                labelWidth={LANE_LABEL_WIDTH}
                selectedFrameId={selectedFrameId}
                onSelectFrame={handleSelectFrame}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-2.5 gba:border-t gba:border-border/40 gba:bg-muted/10 gba:shrink-0">
          {LEGEND_KINDS.map(kind => {
            const color = traceColor(kind)
            return (
              <div key={kind} className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px]">
                <span className={`gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm ${color.bar}`} />
                <span className="gba:text-muted-foreground">{t(color.labelKey)}</span>
              </div>
            )
          })}
          {isTruncated && (
            <span className="gba:ml-auto gba:text-[11px] gba:text-warning-foreground">
              {t('trace-explorer-timeline-truncated', {
                shown: MAX_VISIBLE_FRAMES,
                total: model.frames.length
              })}
            </span>
          )}
        </div>
      </div>

      {/* Side panel when a bar is selected */}
      {selectedFrame && (
        <div className="gba:w-[280px] gba:shrink-0">
          <TraceStepDetail frame={selectedFrame} onClose={handleCloseDetail} />
        </div>
      )}
    </div>
  )
})

TraceTimelineView.displayName = 'TraceTimelineView'
