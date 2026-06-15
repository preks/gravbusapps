/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'

import type { FlowDetailState } from '../useFlowDetail'
import { useFlowExecutionState } from '../useFlowExecutionState'

const mockUseFlowDetail = jest.fn()
jest.mock('../useFlowDetail', () => ({
  useFlowDetail: (options: unknown) => mockUseFlowDetail(options)
}))

function detailState(overrides: Partial<FlowDetailState>): FlowDetailState {
  return {
    overview: null,
    history: [],
    status: { code: 'RUNNING', label: 'Running', variant: 'running' },
    isLoading: false,
    error: null,
    ...overrides
  }
}

describe('useFlowExecutionState', () => {
  beforeEach(() => mockUseFlowDetail.mockReset())

  it('returns an empty execution state when there is no overview', () => {
    mockUseFlowDetail.mockReturnValue(detailState({}))
    const { result } = renderHook(() => useFlowExecutionState({ workflowId: 'wf', accessToken: 't' }))
    expect(result.current.executionState).toEqual({ nodeStates: {} })
  })

  it('maps step statuses to node states and marks the active step', () => {
    mockUseFlowDetail.mockReturnValue(
      detailState({
        overview: {
          id: 'wf',
          status: 'RUNNING',
          steps: [
            { stepIndex: 0, title: 'Fetch', status: 'COMPLETED' },
            { stepIndex: 1, title: 'Score', status: 'IN_PROGRESS' },
            { stepIndex: 2, title: 'Apply', status: 'QUEUED' }
          ],
          progress: { currentStep: 2 }
        }
      })
    )
    const { result } = renderHook(() => useFlowExecutionState({ workflowId: 'wf', accessToken: 't' }))
    const { nodeStates, activeNodeId } = result.current.executionState
    expect(nodeStates['step-0']).toBe('completed')
    expect(nodeStates['step-1']).toBe('active')
    expect(nodeStates['step-2']).toBe('pending')
    expect(nodeStates.start).toBe('completed')
    expect(activeNodeId).toBe('step-1')
  })

  it('polls faster than the text views while running', () => {
    mockUseFlowDetail.mockReturnValue(detailState({}))
    renderHook(() => useFlowExecutionState({ workflowId: 'wf', accessToken: 't' }))
    expect(mockUseFlowDetail).toHaveBeenCalledWith(expect.objectContaining({ pollIntervalMs: 8_000 }))
  })
})
