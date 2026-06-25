import { useEffect, useRef, useState } from 'react'

interface UseSmoothStreamingTextOptions {
  /** When false the full target is shown immediately (no progressive reveal). */
  enabled?: boolean
  /** Baseline reveal speed in characters per second. */
  baseCharsPerSecond?: number
  /**
   * Time window (seconds) over which the reveal eases toward the newest
   * snapshot. Smaller values catch up faster (and feel snappier) at the cost of
   * larger per-frame jumps when the backlog is big.
   */
  catchUpSeconds?: number
}

const DEFAULT_BASE_CPS = 320
const DEFAULT_CATCHUP_SECONDS = 0.45
const MAX_FRAME_DELTA_MS = 100
// Commit at ~33fps. This keeps the reveal visually smooth while halving the
// markdown re-parse cost compared to firing on every animation frame.
const MIN_COMMIT_MS = 28

/**
 * Smoothly reveals a progressively-growing string (e.g. a cumulative LLM
 * response stream) one slice at a time so the UI types forward instead of
 * jumping between server snapshots.
 *
 * The reveal speed eases toward whatever the latest target is: when the model
 * produces text faster than the baseline rate the reveal accelerates so it
 * never lags far behind, and when the model pauses the reveal naturally idles.
 */
export function useSmoothStreamingText(
  target: string,
  options: UseSmoothStreamingTextOptions = {}
): { revealed: string; isCatchingUp: boolean } {
  const { enabled = true, baseCharsPerSecond = DEFAULT_BASE_CPS, catchUpSeconds = DEFAULT_CATCHUP_SECONDS } = options

  const safeTarget = target ?? ''
  const [revealedLength, setRevealedLength] = useState(enabled ? 0 : safeTarget.length)

  const targetRef = useRef(safeTarget)
  const revealedRef = useRef(enabled ? 0 : safeTarget.length)
  const rafRef = useRef<number | null>(null)
  const lastCommitTsRef = useRef<number | null>(null)

  targetRef.current = safeTarget

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      revealedRef.current = safeTarget.length
      lastCommitTsRef.current = null
      setRevealedLength(safeTarget.length)
      return
    }

    // Reset when the new target is no longer a forward extension of what we have
    // already revealed (new turn, placeholder swap, or a server-side rewrite).
    const revealedSoFar = safeTarget.slice(0, revealedRef.current)
    if (revealedRef.current > safeTarget.length || !safeTarget.startsWith(revealedSoFar)) {
      revealedRef.current = 0
      lastCommitTsRef.current = null
      setRevealedLength(0)
    }

    const tick = (ts: number) => {
      const lastCommit = lastCommitTsRef.current
      if (lastCommit !== null && ts - lastCommit < MIN_COMMIT_MS) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const tgt = targetRef.current
      const backlog = tgt.length - revealedRef.current
      if (backlog <= 0) {
        rafRef.current = null
        lastCommitTsRef.current = null
        return
      }

      const dt = lastCommit === null ? MIN_COMMIT_MS : Math.min(MAX_FRAME_DELTA_MS, ts - lastCommit)
      lastCommitTsRef.current = ts

      const speed = Math.max(baseCharsPerSecond, backlog / catchUpSeconds)
      const advance = Math.max(1, Math.round((speed * dt) / 1000))
      const next = Math.min(tgt.length, revealedRef.current + advance)

      if (next !== revealedRef.current) {
        revealedRef.current = next
        setRevealedLength(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [safeTarget, enabled, baseCharsPerSecond, catchUpSeconds])

  const revealed = enabled ? safeTarget.slice(0, Math.min(revealedLength, safeTarget.length)) : safeTarget
  const isCatchingUp = enabled && revealed.length < safeTarget.length
  return { revealed, isCatchingUp }
}
