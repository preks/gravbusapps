/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react'

import type { FlowDetailOverview, FlowDetailStep } from '../flowDetailTypes'
import { useFlowReplay } from '../useFlowReplay'

function overview(steps: FlowDetailStep[], status = 'COMPLETED'): FlowDetailOverview {
  return { id: 'wf', status, steps }
}

const RAN_STEPS: FlowDetailStep[] = [
  { stepIndex: 0, title: 'Fetch', status: 'COMPLETED', completedAt: '2026-06-01T10:00:01Z' },
  { stepIndex: 1, title: 'Score', status: 'COMPLETED', completedAt: '2026-06-01T10:00:02Z' },
  { stepIndex: 2, title: 'Apply', status: 'COMPLETED', completedAt: '2026-06-01T10:00:03Z' }
]

describe('useFlowReplay', () => {
  it('builds one frame per executed step plus a terminal frame', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    expect(result.current.frameCount).toBe(4)
    expect(result.current.hasReplay).toBe(true)
  })

  it('reports no replay when fewer than two steps ran', () => {
    const { result } = renderHook(() => useFlowReplay(overview([RAN_STEPS[0]])))
    expect(result.current.hasReplay).toBe(false)
  })

  it('ignores steps that did not run when ordering frames', () => {
    const steps: FlowDetailStep[] = [...RAN_STEPS, { stepIndex: 3, title: 'Skipped branch', status: 'QUEUED' }]
    const { result } = renderHook(() => useFlowReplay(overview(steps)))
    // 3 ran + terminal; the queued step is not part of the replay path.
    expect(result.current.frameCount).toBe(4)
  })

  it('defaults to the terminal frame so the finished route shows first', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    // Parked on the terminal frame (index 3) until the user engages playback,
    // so the default view is the completed flow rather than the first step.
    expect(result.current.frameIndex).toBe(3)
    expect(result.current.currentStepTitle).toBeUndefined()
  })

  it('steps forward and exposes the focused step state', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    act(() => result.current.seek(0))
    expect(result.current.currentStepTitle).toBe('Fetch')

    act(() => result.current.stepForward())

    expect(result.current.frameIndex).toBe(1)
    expect(result.current.currentStepTitle).toBe('Score')
    expect(result.current.frame?.nodeStates['step-1']).toBe('active')
    expect(result.current.frame?.nodeStates['step-0']).toBe('completed')
    expect(result.current.frame?.activeNodeId).toBe('step-1')
  })

  it('rewinds to the start when play is pressed from the terminal default', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    expect(result.current.frameIndex).toBe(3)

    act(() => result.current.play())

    expect(result.current.frameIndex).toBe(0)
    expect(result.current.isPlaying).toBe(true)
  })

  it('clamps seek within range', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    act(() => result.current.seek(99))
    expect(result.current.frameIndex).toBe(3)
    act(() => result.current.seek(-5))
    expect(result.current.frameIndex).toBe(0)
  })

  it('lights the end node on the terminal frame of a completed flow', () => {
    const { result } = renderHook(() => useFlowReplay(overview(RAN_STEPS)))
    act(() => result.current.seek(3))
    expect(result.current.frame?.nodeStates.end).toBe('completed')
    expect(result.current.frame?.nodeStates['step-2']).toBe('completed')
  })
})
