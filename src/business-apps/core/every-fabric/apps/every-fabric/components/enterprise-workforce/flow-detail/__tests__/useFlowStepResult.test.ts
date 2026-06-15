/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'

import { clearFlowStepResultCache, useFlowStepResult } from '../useFlowStepResult'

const mockGetStepDataByReference = jest.fn()
jest.mock('@/common/network/flows/useFlowProgressClient', () => ({
  useFlowProgressClient: () => ({ getStepDataByReference: mockGetStepDataByReference })
}))

function stepResponse(stepReference: string) {
  return {
    data: [
      {
        flowId: 'wf',
        taskId: 't1',
        userId: 'u1',
        userName: 'Ada',
        timestamp: '2026-01-01',
        stepTitle: 'Score',
        inputData: { risk: 'LOW' }
      }
    ],
    totalCount: 1,
    hasMore: false,
    stepReference,
    flowId: 'wf'
  }
}

describe('useFlowStepResult', () => {
  beforeEach(() => {
    mockGetStepDataByReference.mockReset()
    clearFlowStepResultCache()
  })

  it('does not fetch when disabled', () => {
    renderHook(() => useFlowStepResult({ workflowId: 'wf', stepReference: 'step_0', accessToken: 't', enabled: false }))
    expect(mockGetStepDataByReference).not.toHaveBeenCalled()
  })

  it('fetches and returns the step result when enabled', async () => {
    mockGetStepDataByReference.mockResolvedValue(stepResponse('step_0'))
    const { result } = renderHook(() =>
      useFlowStepResult({ workflowId: 'wf', stepReference: 'step_0', accessToken: 't', enabled: true })
    )

    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(mockGetStepDataByReference).toHaveBeenCalledWith('wf', 'step_0', { limit: 20 })
    expect(result.current.data?.data[0].inputData).toEqual({ risk: 'LOW' })
    expect(result.current.error).toBeNull()
  })

  it('serves the cached response without a second request', async () => {
    mockGetStepDataByReference.mockResolvedValue(stepResponse('step_0'))
    const first = renderHook(() =>
      useFlowStepResult({ workflowId: 'wf', stepReference: 'step_0', accessToken: 't', enabled: true })
    )
    await waitFor(() => expect(first.result.current.data).not.toBeNull())

    renderHook(() => useFlowStepResult({ workflowId: 'wf', stepReference: 'step_0', accessToken: 't', enabled: true }))
    expect(mockGetStepDataByReference).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    mockGetStepDataByReference.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() =>
      useFlowStepResult({ workflowId: 'wf', stepReference: 'step_2', accessToken: 't', enabled: true })
    )

    await waitFor(() => expect(result.current.error).toBe('boom'))
    expect(result.current.data).toBeNull()
  })
})
