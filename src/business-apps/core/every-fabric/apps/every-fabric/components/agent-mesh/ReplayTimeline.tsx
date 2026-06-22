import { useMemo } from 'react'
import { ArrowCounterClockwiseIcon, BroadcastIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react'
import type { TraceFrame } from '../../utils/traceModel'
import { REPLAY_SPEEDS, type ReplayClockApi } from '../../hooks/useReplayClock'
import { useAgentMeshI18n } from './useAgentMeshI18n'

interface ReplayTimelineProps {
  clock: ReplayClockApi
  frames: TraceFrame[]
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor((ms % 1000) / 100)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis}`
}

const FRAME_KIND_COLOR: Record<TraceFrame['kind'], string> = {
  step: 'gba:bg-muted-foreground/40',
  subagent: 'gba:bg-sky-500',
  expert: 'gba:bg-violet-500',
  tool: 'gba:bg-foreground/40',
  skill: 'gba:bg-amber-500',
  decision: 'gba:bg-primary',
  hitl: 'gba:bg-orange-500',
  capability_missing: 'gba:bg-destructive',
  terminal: 'gba:bg-emerald-500',
  artifact: 'gba:bg-emerald-500/70'
}

/**
 * Aggregate close-by frames into a fixed number of buckets so the timeline
 * track shows readable, evenly-spaced ticks (matches the target design)
 * instead of dozens of overlapping marks for chatty traces.
 */
function bucketTicks(
  frames: TraceFrame[],
  durationMs: number,
  bucketCount = 24
): { left: number; kind: TraceFrame['kind']; count: number }[] {
  if (durationMs <= 0 || frames.length === 0 || bucketCount <= 0) return []
  const buckets = new Map<number, { kind: TraceFrame['kind']; count: number }>()
  const KIND_WEIGHT: Record<TraceFrame['kind'], number> = {
    decision: 5,
    terminal: 5,
    capability_missing: 4,
    hitl: 4,
    expert: 3,
    subagent: 3,
    skill: 2,
    artifact: 2,
    tool: 1,
    step: 0
  }
  for (const frame of frames) {
    const idx = Math.min(bucketCount - 1, Math.floor((frame.offsetMs / durationMs) * bucketCount))
    const existing = buckets.get(idx)
    if (!existing) {
      buckets.set(idx, { kind: frame.kind, count: 1 })
      continue
    }
    existing.count += 1
    if (KIND_WEIGHT[frame.kind] > KIND_WEIGHT[existing.kind]) {
      existing.kind = frame.kind
    }
  }
  return Array.from(buckets.entries())
    .map(([idx, value]) => ({
      left: ((idx + 0.5) / bucketCount) * 100,
      kind: value.kind,
      count: value.count
    }))
    .sort((a, b) => a.left - b.left)
}

export const ReplayTimeline: React.FC<ReplayTimelineProps> = ({ clock, frames }) => {
  const { t } = useAgentMeshI18n()
  const ticks = useMemo(() => bucketTicks(frames, clock.durationMs), [frames, clock.durationMs])

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    clock.seek(value)
  }

  const isLive = clock.isLive
  const disableTransport = clock.durationMs <= 0

  return (
    <section
      className="gba:flex gba:items-center gba:gap-4 gba:rounded-[1.5rem] gba:border gba:border-border/60 gba:bg-card gba:px-5 gba:py-3.5"
      data-testid="mesh-replay-timeline"
      aria-label={t('agent-mesh-replay-aria')}
    >
      <button
        type="button"
        onClick={clock.toggle}
        disabled={disableTransport}
        aria-label={clock.isPlaying ? t('agent-mesh-replay-pause') : t('agent-mesh-replay-play')}
        className="gba:inline-flex gba:items-center gba:justify-center gba:h-11 gba:w-11 gba:rounded-full gba:bg-foreground gba:text-background gba:hover:bg-foreground/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-40 gba:transition-colors gba:shadow-[0_2px_6px_rgba(15,23,42,0.18)]"
        data-testid="mesh-replay-toggle"
      >
        {clock.isPlaying ? (
          <PauseIcon className="gba:h-5 gba:w-5" weight="fill" />
        ) : (
          <PlayIcon className="gba:h-5 gba:w-5" weight="fill" />
        )}
      </button>

      <button
        type="button"
        onClick={() => clock.seek(0)}
        disabled={disableTransport}
        aria-label={t('agent-mesh-replay-restart')}
        className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:disabled:cursor-not-allowed gba:disabled:opacity-40 gba:transition-colors"
        data-testid="mesh-replay-restart"
      >
        <ArrowCounterClockwiseIcon className="gba:h-4 gba:w-4" />
      </button>

      <div className="gba:relative gba:flex-1 gba:min-w-0 gba:py-3">
        <div className="gba:relative gba:h-[2px] gba:rounded-full gba:bg-border">
          <div
            className="gba:absolute gba:inset-y-0 gba:left-0 gba:rounded-full gba:bg-foreground"
            style={{ width: `${clock.progress * 100}%` }}
          />
          {ticks.map(tick => (
            <span
              key={`${tick.left}-${tick.kind}`}
              title={t('agent-mesh-replay-events', { count: tick.count })}
              className={`gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:h-1.5 gba:w-1.5 gba:rounded-full ${FRAME_KIND_COLOR[tick.kind]}`}
              style={{ left: `${tick.left}%` }}
              aria-hidden
            />
          ))}
          <span
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:flex gba:h-3.5 gba:w-3.5 gba:items-center gba:justify-center gba:rounded-full gba:border-2 gba:border-foreground gba:bg-background gba:shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
            style={{ left: `${clock.progress * 100}%` }}
            aria-hidden
          />
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(1, clock.durationMs)}
          step={1}
          value={clock.positionMs}
          onChange={handleSeek}
          disabled={disableTransport}
          className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:cursor-pointer gba:opacity-0"
          aria-label={t('agent-mesh-replay-seek')}
          data-testid="mesh-replay-seek"
        />
      </div>

      <div className="gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:font-mono gba:text-muted-foreground">
        <span data-testid="mesh-replay-position">{formatClock(clock.positionMs)}</span>
        <span aria-hidden>/</span>
        <span data-testid="mesh-replay-duration">{formatClock(clock.durationMs)}</span>
      </div>

      <div className="gba:flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border/40 gba:bg-background/85 gba:px-1 gba:py-0.5">
        {REPLAY_SPEEDS.map(speed => (
          <button
            key={speed}
            type="button"
            onClick={() => clock.setSpeed(speed)}
            aria-pressed={clock.speed === speed}
            className={`gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:min-w-[28px] gba:rounded-full gba:px-1.5 gba:text-[11px] gba:font-semibold gba:transition-colors ${
              clock.speed === speed
                ? 'gba:bg-foreground gba:text-background'
                : 'gba:text-muted-foreground gba:hover:text-foreground'
            }`}
            data-testid={`mesh-replay-speed-${speed}`}
          >
            {speed}×
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={clock.jumpToLive}
        aria-pressed={isLive}
        className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2.5 gba:py-1 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:transition-colors ${
          isLive
            ? 'gba:bg-emerald-500/15 gba:text-emerald-600'
            : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60'
        }`}
        data-testid="mesh-replay-live"
      >
        <BroadcastIcon className="gba:h-3 gba:w-3" weight={isLive ? 'fill' : 'regular'} />
        {t('agent-mesh-replay-live')}
      </button>
    </section>
  )
}
