/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useSmoothStreamingText } from './useSmoothStreamingText'

type FrameCb = (ts: number) => void

describe('useSmoothStreamingText', () => {
  let frames: FrameCb[]
  let now: number

  beforeEach(() => {
    frames = []
    now = 0
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameCallback) => {
      frames.push(cb as unknown as FrameCb)
      return frames.length
    })
    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /** Drive the rAF queue forward by `ms`, flushing every pending frame callback. */
  const advance = (ms: number) => {
    now += ms
    act(() => {
      const pending = frames
      frames = []
      pending.forEach(cb => cb(now))
    })
  }

  it('shows the full target immediately when disabled', () => {
    const { result } = renderHook(() => useSmoothStreamingText('Hello world', { enabled: false }))
    expect(result.current.revealed).toBe('Hello world')
    expect(result.current.isCatchingUp).toBe(false)
  })

  it('reveals progressively and never exceeds the target while streaming', () => {
    const { result } = renderHook(() => useSmoothStreamingText('Hello world', { enabled: true }))

    // First frame reveals a prefix, not the whole string.
    advance(30)
    expect(result.current.revealed.length).toBeGreaterThan(0)
    expect('Hello world'.startsWith(result.current.revealed)).toBe(true)

    // Driving enough frames eventually catches up to the full target.
    for (let i = 0; i < 50 && result.current.revealed !== 'Hello world'; i += 1) {
      advance(30)
    }
    expect(result.current.revealed).toBe('Hello world')
    expect(result.current.isCatchingUp).toBe(false)
  })

  it('continues forward when the target is extended (does not restart)', () => {
    const { result, rerender } = renderHook(({ target }) => useSmoothStreamingText(target, { enabled: true }), {
      initialProps: { target: 'Hello' }
    })

    for (let i = 0; i < 20 && result.current.revealed !== 'Hello'; i += 1) {
      advance(30)
    }
    expect(result.current.revealed).toBe('Hello')

    rerender({ target: 'Hello world, this is more text' })
    // The first revealed slice after extension still begins with what was shown.
    advance(30)
    expect('Hello world, this is more text'.startsWith(result.current.revealed)).toBe(true)
    expect(result.current.revealed.length).toBeGreaterThanOrEqual('Hello'.length)
  })

  it('snaps to the full target immediately once streaming stops', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useSmoothStreamingText('Complete answer body', { enabled }),
      { initialProps: { enabled: true } }
    )

    advance(30)
    expect(result.current.revealed).not.toBe('Complete answer body')

    rerender({ enabled: false })
    expect(result.current.revealed).toBe('Complete answer body')
    expect(result.current.isCatchingUp).toBe(false)
  })
})
