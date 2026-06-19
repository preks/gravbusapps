/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { RunFlowApprovalSection } from '../RunFlowApprovalSection'
import type { RunFlowApproval } from '../flow-detail/runFlowApprovals'
import type { WorkforceRun } from '../workforceTypes'

const approve = jest.fn().mockResolvedValue(undefined)
const reject = jest.fn().mockResolvedValue(undefined)
const refresh = jest.fn().mockResolvedValue(undefined)
const getUserProfileBrief = jest.fn().mockResolvedValue({ user_id: 'user-9' })

let mockApprovals: RunFlowApproval[] = []

jest.mock('../flow-detail/runFlowApprovals', () => ({
  useRunFlowApprovals: () => ({ approvals: mockApprovals, isLoading: false, refresh })
}))

jest.mock('../flow-detail/useFlowTaskApproval', () => ({
  useFlowTaskApproval: () => ({ approve, reject })
}))

jest.mock('../flow-detail/useFlowStepResult', () => ({
  useFlowStepResult: () => ({ data: null, isLoading: false, error: null })
}))

jest.mock('../flow-detail/FlowStepResult', () => ({
  FlowStepResult: () => <div data-testid="flow-step-result-stub">proposed patch</div>
}))

jest.mock('../../../hooks/useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => ({ getUserProfileBrief })
}))

function buildApproval(): RunFlowApproval {
  return {
    flowId: 'flow-1',
    flowName: 'Enpal validation',
    prevStepReference: 'step_10',
    step: {
      stepIndex: 11,
      title: 'Human Approval of Proposed Patch',
      type: 'APPROVAL',
      status: 'IN_PROGRESS',
      taskId: 'task-77',
      assignmentMode: 'ASSIGN',
      assignedUserId: 'user-9'
    }
  }
}

const run = { session_id: 'sess-1', agent_id: 'agent-1', status: 'completed', input: 'task' } as WorkforceRun

describe('RunFlowApprovalSection', () => {
  beforeEach(() => {
    approve.mockClear()
    reject.mockClear()
    refresh.mockClear()
    getUserProfileBrief.mockClear()
    mockApprovals = []
  })

  it('renders nothing when there is no waiting approval', () => {
    const { container } = render(
      <RunFlowApprovalSection run={run} accessToken="token" onRefreshAfterSubmit={() => Promise.resolve()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('approves a waiting flow task and refreshes', async () => {
    mockApprovals = [buildApproval()]
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    render(<RunFlowApprovalSection run={run} accessToken="token" onRefreshAfterSubmit={onRefresh} />)

    expect(screen.getByTestId('workforce-run-detail-flow-approval')).toHaveTextContent(
      'Human Approval of Proposed Patch'
    )
    expect(screen.getByTestId('flow-step-result-stub')).toBeInTheDocument()

    await waitFor(() => expect(getUserProfileBrief).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('flow-approval-approve'))

    await waitFor(() =>
      expect(approve).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-77', userId: 'user-9', assignmentMode: 'ASSIGN' })
      )
    )
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('rejects a waiting flow task with the entered comment', async () => {
    mockApprovals = [buildApproval()]
    render(<RunFlowApprovalSection run={run} accessToken="token" onRefreshAfterSubmit={() => Promise.resolve()} />)

    await waitFor(() => expect(getUserProfileBrief).toHaveBeenCalled())
    fireEvent.change(screen.getByTestId('flow-approval-comment'), { target: { value: 'Missing docs' } })
    fireEvent.click(screen.getByTestId('flow-approval-reject'))

    await waitFor(() =>
      expect(reject).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-77', comment: 'Missing docs' }))
    )
  })
})
