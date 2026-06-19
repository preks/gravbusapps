import { getWaitingApprovalStep } from '../runFlowApprovals'
import type { FlowDetailStep } from '../flowDetailTypes'

function step(partial: Partial<FlowDetailStep>): FlowDetailStep {
  return { stepIndex: 0, title: 'Step', status: 'IN_PROGRESS', ...partial }
}

describe('getWaitingApprovalStep', () => {
  it('returns an APPROVAL step that is active and has a task id', () => {
    const found = getWaitingApprovalStep([
      step({ stepIndex: 0, type: 'FUNCTION', status: 'COMPLETED' }),
      step({ stepIndex: 1, type: 'APPROVAL', status: 'IN_PROGRESS', taskId: 'task-1' })
    ])
    expect(found?.taskId).toBe('task-1')
  })

  it('accepts taskBusinessId when taskId is absent', () => {
    const found = getWaitingApprovalStep([
      step({ stepIndex: 1, type: 'APPROVAL', status: 'CLAIMED', taskBusinessId: 'task-biz-9' })
    ])
    expect(found?.taskBusinessId).toBe('task-biz-9')
  })

  it('ignores a completed approval step', () => {
    const found = getWaitingApprovalStep([
      step({ stepIndex: 1, type: 'APPROVAL', status: 'COMPLETED', taskId: 'task-1' })
    ])
    expect(found).toBeNull()
  })

  it('ignores an approval step without a task id', () => {
    const found = getWaitingApprovalStep([step({ stepIndex: 1, type: 'APPROVAL', status: 'IN_PROGRESS' })])
    expect(found).toBeNull()
  })

  it('ignores non-approval steps even when active', () => {
    const found = getWaitingApprovalStep([
      step({ stepIndex: 1, type: 'TASK', status: 'IN_PROGRESS', taskId: 'task-1' })
    ])
    expect(found).toBeNull()
  })

  it('returns the first waiting approval when several match', () => {
    const found = getWaitingApprovalStep([
      step({ stepIndex: 2, type: 'APPROVAL', status: 'IN_PROGRESS', taskId: 'task-a' }),
      step({ stepIndex: 5, type: 'APPROVAL', status: 'AVAILABLE', taskId: 'task-b' })
    ])
    expect(found?.taskId).toBe('task-a')
  })
})
