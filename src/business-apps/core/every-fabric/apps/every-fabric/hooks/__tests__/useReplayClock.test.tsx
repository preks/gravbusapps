import { act, renderHook } from '@testing-library/react'
import { REPLAY_SPEEDS, useReplayClock } from '../useReplayClock'

describe('useReplayClock', () => {
  it('starts pinned to durationMs in live mode', () => {
    const { result } = renderHook(() => useReplayClock({ durationMs: 5000, isLive: true }))
    expect(result.current.positionMs).toBe(5000)
    expect(result.current.isLive).toBe(true)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.progress).toBeCloseTo(1)
  })

  it('seek pauses live mode and clamps to duration', () => {
    const { result } = renderHook(() => useReplayClock({ durationMs: 5000, isLive: true }))
    act(() => result.current.seek(8000))
    expect(result.current.positionMs).toBe(5000)
    act(() => result.current.seek(-100))
    expect(result.current.positionMs).toBe(0)
  })

  it('jumpToLive snaps back to durationMs and clears scrubbed flag', () => {
    const { result, rerender } = renderHook(
      ({ duration, live }: { duration: number; live: boolean }) =>
        useReplayClock({ durationMs: duration, isLive: live }),
      { initialProps: { duration: 5000, live: true } }
    )
    act(() => result.current.seek(2000))
    expect(result.current.positionMs).toBe(2000)
    expect(result.current.isLive).toBe(false)

    rerender({ duration: 9000, live: true })
    expect(result.current.positionMs).toBe(2000)

    act(() => result.current.jumpToLive())
    expect(result.current.positionMs).toBe(9000)
    expect(result.current.isLive).toBe(true)
  })

  it('seekProgress translates a fraction to ms', () => {
    const { result } = renderHook(() => useReplayClock({ durationMs: 4000, isLive: false }))
    act(() => result.current.seekProgress(0.5))
    expect(result.current.positionMs).toBe(2000)
    expect(result.current.progress).toBeCloseTo(0.5)
  })

  it('setSpeed snaps to the closest supported value', () => {
    const { result } = renderHook(() => useReplayClock({ durationMs: 1000 }))
    act(() => result.current.setSpeed(3.6))
    expect(result.current.speed).toBe(4)
    act(() => result.current.setSpeed(1.4))
    expect(result.current.speed).toBe(1)
    expect(REPLAY_SPEEDS).toContain(result.current.speed)
  })

  // Regression: on a fresh page reload, the trace REST call hasn't returned
  // yet when AgentMeshScreen first mounts, so the clock initialises with
  // durationMs=0 and positionMs=0. Once the trace lands and durationMs
  // grows, the playhead must snap to the tail in replay mode — otherwise
  // every `offsetMs <= positionMs` filter in the screen returns nothing
  // and the user sees an empty Decision Simulation panel + a 00:00 timeline
  // ("session details and replay simulation is lost on refresh").
  it('snaps positionMs to durationMs when duration arrives after mount in replay mode', () => {
    const { result, rerender } = renderHook(
      ({ duration }: { duration: number }) => useReplayClock({ durationMs: duration, isLive: false }),
      { initialProps: { duration: 0 } }
    )
    expect(result.current.positionMs).toBe(0)
    expect(result.current.durationMs).toBe(0)

    rerender({ duration: 42500 })

    expect(result.current.positionMs).toBe(42500)
    expect(result.current.progress).toBeCloseTo(1)
  })

  it('does not re-snap to tail once the user has scrubbed', () => {
    const { result, rerender } = renderHook(
      ({ duration }: { duration: number }) => useReplayClock({ durationMs: duration, isLive: false }),
      { initialProps: { duration: 10000 } }
    )
    expect(result.current.positionMs).toBe(10000)

    act(() => result.current.seek(2000))
    expect(result.current.positionMs).toBe(2000)

    rerender({ duration: 15000 })
    expect(result.current.positionMs).toBe(2000)
  })
})
