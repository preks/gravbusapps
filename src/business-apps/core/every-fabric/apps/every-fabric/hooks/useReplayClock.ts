import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface ReplayClockOptions {
  /** Total wall-clock duration to replay (ms). When 0, the clock stays paused. */
  durationMs: number
  /**
   * Whether the underlying source is still streaming. When true the clock
   * stays pinned at `durationMs` and follows live updates instead of
   * scrubbing — useful so the Mesh always shows the latest state during a
   * running session.
   */
  isLive?: boolean
  /** Initial playback speed (1 = real time). */
  initialSpeed?: number
}

export interface ReplayClockApi {
  /** Current replay position in ms (0 .. durationMs). */
  positionMs: number
  /** Position normalized to [0, 1]. */
  progress: number
  durationMs: number
  isPlaying: boolean
  speed: number
  isLive: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  /** Jump to absolute ms within [0, durationMs]. Pauses live mode. */
  seek: (positionMs: number) => void
  /** Jump to a fraction in [0, 1]. */
  seekProgress: (progress: number) => void
  /** Set playback speed; valid values are typically in {0.5, 1, 2, 4}. */
  setSpeed: (speed: number) => void
  /** Re-attach the clock to the live tail (positionMs = durationMs, paused). */
  jumpToLive: () => void
}

const SUPPORTED_SPEEDS = [0.5, 1, 2, 4] as const

function clampSpeed(value: number): number {
  if (Number.isNaN(value) || value <= 0) return 1
  let closest = SUPPORTED_SPEEDS[0]
  let bestDiff = Math.abs(value - closest)
  for (const candidate of SUPPORTED_SPEEDS) {
    const diff = Math.abs(value - candidate)
    if (diff < bestDiff) {
      closest = candidate
      bestDiff = diff
    }
  }
  return closest
}

/**
 * Drives the replay timeline below the Agent Mesh and Trace Explorer.
 *
 * The clock has two modes:
 *
 *   - **Live**: while the source session is streaming, `positionMs` follows
 *     `durationMs` automatically and `isPlaying` is forced to `false`. The
 *     UI shows "LIVE" instead of a progress thumb.
 *   - **Replay**: once the user scrubs or the session terminates, the clock
 *     becomes a regular RAF-driven playhead with play/pause/speed.
 *
 * Implementation note: we use a single `requestAnimationFrame` loop and only
 * update React state when `positionMs` actually changes by ≥ 16 ms, which
 * keeps re-renders cheap during scrubbing.
 */
export function useReplayClock(options: ReplayClockOptions): ReplayClockApi {
  const { durationMs, isLive = false, initialSpeed = 1 } = options

  const [positionMs, setPositionMs] = useState<number>(durationMs)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [speed, setSpeedState] = useState<number>(() => clampSpeed(initialSpeed))
  const [hasUserScrubbed, setHasUserScrubbed] = useState<boolean>(false)

  const positionRef = useRef<number>(positionMs)
  const lastTickRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  // Tracks whether the playhead has been positioned against a non-zero
  // duration yet. On a fresh page reload of a completed-session screen
  // (Agent Mesh, Trace Explorer), `useState(durationMs)` runs while the
  // REST trace is still in flight, so `positionMs` initialises to 0.
  // Once the trace arrives, `durationMs` grows but nothing snaps the
  // playhead — `followLive` only fires for live sessions — and the
  // user is left staring at an "00:00 / 42s · 0 decisions" replay.
  // We snap once when the duration first becomes positive in replay
  // mode, mirroring the UX of opening the screen after the session
  // was already in memory (where `useState(durationMs)` lands on the
  // tail directly).
  const hasInitialisedRef = useRef<boolean>(durationMs > 0)

  const followLive = isLive && !hasUserScrubbed

  useEffect(() => {
    if (followLive) {
      positionRef.current = durationMs
      setPositionMs(durationMs)
      hasInitialisedRef.current = true
      return
    }

    if (!hasInitialisedRef.current && durationMs > 0 && !hasUserScrubbed) {
      hasInitialisedRef.current = true
      positionRef.current = durationMs
      setPositionMs(durationMs)
    }
  }, [durationMs, followLive, hasUserScrubbed])

  useEffect(() => {
    if (!isPlaying || followLive) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTickRef.current = null
      return undefined
    }

    const tick = (now: number) => {
      const last = lastTickRef.current
      lastTickRef.current = now
      if (last !== null) {
        const deltaMs = (now - last) * speed
        const next = Math.min(durationMs, positionRef.current + deltaMs)
        if (Math.abs(next - positionRef.current) >= 16) {
          positionRef.current = next
          setPositionMs(next)
        } else {
          positionRef.current = next
        }
        if (next >= durationMs) {
          setIsPlaying(false)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTickRef.current = null
    }
  }, [isPlaying, speed, durationMs, followLive])

  const play = useCallback(() => {
    if (durationMs <= 0) return
    if (positionRef.current >= durationMs) {
      positionRef.current = 0
      setPositionMs(0)
    }
    setHasUserScrubbed(true)
    setIsPlaying(true)
  }, [durationMs])

  const pause = useCallback(() => setIsPlaying(false), [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(durationMs, next))
      positionRef.current = clamped
      setPositionMs(clamped)
      setHasUserScrubbed(clamped < durationMs - 1)
    },
    [durationMs]
  )

  const seekProgress = useCallback(
    (progress: number) => {
      seek(progress * durationMs)
    },
    [durationMs, seek]
  )

  const setSpeed = useCallback((value: number) => {
    setSpeedState(clampSpeed(value))
  }, [])

  const jumpToLive = useCallback(() => {
    setHasUserScrubbed(false)
    positionRef.current = durationMs
    setPositionMs(durationMs)
    setIsPlaying(false)
  }, [durationMs])

  const progress = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0

  return useMemo(
    () => ({
      positionMs,
      progress,
      durationMs,
      isPlaying,
      speed,
      isLive: followLive,
      play,
      pause,
      toggle,
      seek,
      seekProgress,
      setSpeed,
      jumpToLive
    }),
    [
      positionMs,
      progress,
      durationMs,
      isPlaying,
      speed,
      followLive,
      play,
      pause,
      toggle,
      seek,
      seekProgress,
      setSpeed,
      jumpToLive
    ]
  )
}

export const REPLAY_SPEEDS = SUPPORTED_SPEEDS
