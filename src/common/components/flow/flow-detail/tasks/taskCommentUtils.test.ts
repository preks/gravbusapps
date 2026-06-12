import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import type { FlowStep, HistoryEvent } from '../types'
import {
  flowCommentsForStep,
  findStepIndexForTaskId,
  isUsableTaskId,
  mergeTaskComments,
  resolveStepTaskId,
  stepMatchesTaskId
} from './taskCommentUtils'

const baseStep: FlowStep = {
  id: 'step-1',
  title: 'Review request',
  status: 'COMPLETED',
  stepIndex: 1
}

describe('taskCommentUtils', () => {
  it('rejects synthetic and flow-level task ids', () => {
    expect(isUsableTaskId(undefined)).toBe(false)
    expect(isUsableTaskId('start-flow_123', 'flow_123')).toBe(false)
    expect(isUsableTaskId('flow_123', 'flow_123')).toBe(false)
    expect(isUsableTaskId('938e1583-c85e-441b-88b1-8ea1cbb31cb7', 'flow_123')).toBe(true)
  })

  it('resolves task id from step data and audit history', () => {
    const stepData: StepDataResponse = {
      data: [],
      totalCount: 0,
      hasMore: false,
      stepIndex: 1,
      flowId: 'flow_123',
      pagination: { offset: 0, limit: 20 }
    }

    const historyEvents: HistoryEvent[] = [
      {
        type: 'step',
        timestamp: '2026-06-12T10:00:00.000Z',
        stepIndex: 1,
        stepTitle: 'Review request',
        eventTitle: 'COMPLETE',
        description: 'Completed',
        action: 'COMPLETE',
        userId: 'user-1',
        userName: 'User One',
        taskId: '938e1583-c85e-441b-88b1-8ea1cbb31cb7'
      }
    ]

    expect(resolveStepTaskId(baseStep, stepData, historyEvents, 'flow_123')).toBe(
      '938e1583-c85e-441b-88b1-8ea1cbb31cb7'
    )
  })

  it('prefers business task ids from step data', () => {
    const stepData: StepDataResponse = {
      data: [
        {
          flowId: 'flow_123',
          taskId: '938e1583-c85e-441b-88b1-8ea1cbb31cb7',
          userId: 'user-1',
          userName: 'User One',
          timestamp: '2026-06-12T10:00:00.000Z',
          stepTitle: 'Review request',
          inputData: { note: 'done' }
        }
      ],
      totalCount: 1,
      hasMore: false,
      stepIndex: 1,
      flowId: 'flow_123',
      pagination: { offset: 0, limit: 20 }
    }

    expect(resolveStepTaskId(baseStep, stepData, [], 'flow_123')).toBe('938e1583-c85e-441b-88b1-8ea1cbb31cb7')
  })

  it('maps and merges flow comments by step index', () => {
    const mapped = flowCommentsForStep(
      [
        {
          stepIndex: 1,
          stepTitle: 'Review request',
          comment: 'Looks good',
          commentedBy: 'user-1',
          commentedAt: '2026-06-12T10:00:00.000Z',
          action: 'COMMENT',
          visibility: 'INTERNAL_TASK'
        },
        {
          stepIndex: 2,
          stepTitle: 'Approve',
          comment: 'Other step',
          commentedBy: 'user-2',
          commentedAt: '2026-06-12T11:00:00.000Z',
          action: 'COMMENT'
        }
      ],
      1
    )

    expect(mapped).toHaveLength(1)
    expect(mapped[0].comment).toBe('Looks good')

    const merged = mergeTaskComments(mapped, [
      {
        comment: 'Looks good',
        commentedBy: 'user-1',
        commentedAt: '2026-06-12T10:00:00.000Z',
        visibility: 'INTERNAL_TASK'
      },
      {
        comment: 'Follow up',
        commentedBy: 'user-2',
        commentedAt: '2026-06-12T10:30:00.000Z',
        visibility: 'EXTERNAL'
      }
    ])

    expect(merged).toHaveLength(2)
  })

  it('finds step index for a task id from audit history', () => {
    const historyEvents: HistoryEvent[] = [
      {
        type: 'step',
        timestamp: '2026-06-12T10:00:00.000Z',
        stepIndex: 2,
        stepTitle: 'Approve request',
        eventTitle: 'COMPLETE',
        description: 'Completed',
        action: 'COMPLETE',
        userId: 'user-1',
        userName: 'User One',
        taskId: 'task-business-123'
      }
    ]

    expect(findStepIndexForTaskId('task-business-123', historyEvents, [baseStep])).toBe(2)
  })

  it('matches a step once task id appears in step data', () => {
    const stepData: StepDataResponse = {
      data: [
        {
          flowId: 'flow_123',
          taskId: 'task-business-456',
          userId: 'user-1',
          userName: 'User One',
          timestamp: '2026-06-12T10:00:00.000Z',
          stepTitle: 'Review request',
          inputData: { note: 'done' }
        }
      ],
      totalCount: 1,
      hasMore: false,
      stepIndex: 1,
      flowId: 'flow_123',
      pagination: { offset: 0, limit: 20 }
    }

    expect(stepMatchesTaskId(baseStep, 'task-business-456', [], stepData, 'flow_123')).toBe(true)
  })
})
