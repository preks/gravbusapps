import type { FlowComment, StepDataResponse, TaskComment } from '@/common/network/flows/useFlowProgressClient'
import type { FlowStep, HistoryEvent } from '../types'

const SYNTHETIC_TASK_ID_PREFIXES = ['start-']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUsableTaskId(taskId: string | undefined, flowId?: string): taskId is string {
  if (!taskId || !taskId.trim()) return false
  const normalizedId = taskId.trim()
  if (flowId && normalizedId === flowId) return false
  if (SYNTHETIC_TASK_ID_PREFIXES.some(prefix => normalizedId.startsWith(prefix))) return false
  return /^[a-zA-Z0-9-_]+$/.test(normalizedId)
}

export function historyEventsForStep(
  historyEvents: HistoryEvent[],
  step: Pick<FlowStep, 'stepIndex' | 'title'>
): HistoryEvent[] {
  const normalizedTitle = step.title.trim().toLowerCase()
  return historyEvents.filter(event => {
    if (event.stepIndex === step.stepIndex) return true
    return event.stepTitle.trim().toLowerCase() === normalizedTitle
  })
}

export function resolveStepTaskId(
  step: Pick<FlowStep, 'stepIndex' | 'title' | 'id'>,
  stepData: StepDataResponse | null,
  historyEvents: HistoryEvent[],
  flowId?: string
): string | undefined {
  const candidates: string[] = []

  stepData?.data.forEach(row => {
    if (isUsableTaskId(row.taskId, flowId)) {
      candidates.push(row.taskId)
    }
  })

  historyEventsForStep(historyEvents, step).forEach(event => {
    if (isUsableTaskId(event.taskId, flowId)) {
      candidates.push(event.taskId)
    }
  })

  const businessTaskId = candidates.find(id => UUID_PATTERN.test(id))
  if (businessTaskId) return businessTaskId

  return candidates[0]
}

export function flowCommentsForStep(flowComments: FlowComment[], stepIndex: number): TaskComment[] {
  return flowComments
    .filter(comment => comment.stepIndex === stepIndex)
    .map((comment, index) => ({
      id: `flow-${stepIndex}-${index}-${comment.commentedAt}`,
      comment: comment.comment,
      commentedBy: comment.commentedBy,
      commentedAt: comment.commentedAt,
      visibility: comment.visibility ?? 'EXTERNAL',
      action: comment.action
    }))
}

export function mergeTaskComments(...commentLists: TaskComment[][]): TaskComment[] {
  const seen = new Set<string>()
  const merged: TaskComment[] = []

  commentLists.forEach(list => {
    list.forEach(comment => {
      const dedupeKey = `${comment.commentedAt}|${comment.commentedBy}|${comment.comment}`
      if (seen.has(dedupeKey)) return
      seen.add(dedupeKey)
      merged.push(comment)
    })
  })

  return merged.sort((left, right) => new Date(left.commentedAt).getTime() - new Date(right.commentedAt).getTime())
}

export function findStepIndexForTaskId(
  taskId: string | undefined,
  historyEvents: HistoryEvent[],
  flowSteps: FlowStep[]
): number | undefined {
  const normalizedTaskId = taskId?.trim()
  if (!normalizedTaskId) return undefined

  for (const event of historyEvents) {
    if (event.taskId === normalizedTaskId && typeof event.stepIndex === 'number' && event.stepIndex >= 0) {
      return event.stepIndex
    }
  }

  for (const step of flowSteps) {
    const stepHasTask = historyEventsForStep(historyEvents, step).some(event => event.taskId === normalizedTaskId)
    if (stepHasTask) {
      return step.stepIndex
    }
  }

  return undefined
}

export function stepMatchesTaskId(
  step: Pick<FlowStep, 'stepIndex' | 'title'>,
  taskId: string | undefined,
  historyEvents: HistoryEvent[],
  stepData: StepDataResponse | null,
  flowId?: string
): boolean {
  const normalizedTaskId = taskId?.trim()
  if (!normalizedTaskId) return false

  if (resolveStepTaskId(step, stepData, historyEvents, flowId) === normalizedTaskId) {
    return true
  }

  return historyEventsForStep(historyEvents, step).some(event => event.taskId === normalizedTaskId)
}
