import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import {
  InputType,
  type AssignmentTarget,
  type FlowTemplate,
  type InputBlock,
  type TaskAssignment
} from '@/common/network/flows/FlowTemplateClient'

export type RuntimeAssignment = {
  stepIndex: number
  stepTitle: string
  assignmentMode: string
  selectionMode: 'single' | 'multi'
  targets: AssignmentTarget | null
  assignedUserId: string | null
  assignedUserIds: string[]
}

export type LaunchFormMode = 'start-form' | 'first-task-form' | 'none'

export type LaunchFormContext = {
  mode: LaunchFormMode
  inputs: InputBlock[]
  fallbackStepIndex: number | null
}

type LauncherTask = {
  id: string
  flowId?: string
  form?: unknown[]
  scheduledAt?: string
}

const CONTROL_FLOW_TYPES = new Set(['DECISION', 'FORK', 'JOIN'])
const API_BASE = getFlowEngineApiBaseUrl()

const sleep = (ms: number) => new Promise(resolve => globalThis.setTimeout(resolve, ms))

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = await response.json()
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim()
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim()
    if (typeof payload?.details === 'string' && payload.details.trim()) return payload.details.trim()
  } catch {
    // Ignore JSON parsing errors and fall back to the provided message.
  }
  return fallback
}

export const isSystemTaskType = (stepType: unknown): boolean => {
  const t = String(stepType || '').toUpperCase()
  return t === 'FUNCTION' || t === 'AI_AGENT' || t === 'AI_TASK_EXPERT'
}

export const normalizeOption = (opt: any): { value: string; label: string } => {
  if (typeof opt === 'string') return { value: opt, label: opt }
  if (opt && typeof opt === 'object') {
    const value = opt.value ?? opt.code ?? opt.id
    const label = opt.label ?? opt.value ?? opt.name ?? opt.code ?? opt.id
    return { value: String(value ?? ''), label: String(label ?? '') }
  }
  return { value: String(opt ?? ''), label: String(opt ?? '') }
}

export const needsRuntimeAssignment = (step: any): boolean => {
  if (!step?.assignment) return false
  const targets = step.assignment.targets
  if (targets === null || targets === undefined) return true
  if (typeof targets === 'object' && Object.keys(targets || {}).length === 0) return true
  return false
}

const isFallbackUserTaskStep = (step: any): boolean => {
  if (!step || isSystemTaskType(step.type)) return false
  if (CONTROL_FLOW_TYPES.has(String(step.type || '').toUpperCase())) return false
  return Array.isArray(step.form) && step.form.length > 0
}

export const resolveLaunchFormContext = (template: FlowTemplate | null): LaunchFormContext => {
  const startForm =
    (Array.isArray((template as any)?.start?.form) && (template as any).start.form) ||
    (Array.isArray((template as any)?.start?.inputs) && (template as any).start.inputs) ||
    (Array.isArray((template as any)?.initStep?.form) && (template as any).initStep.form) ||
    (Array.isArray((template as any)?.initStep?.inputs) && (template as any).initStep.inputs) ||
    null

  if (Array.isArray(startForm) && startForm.length > 0) {
    return {
      mode: 'start-form',
      inputs: startForm,
      fallbackStepIndex: null
    }
  }

  const firstStep = (template as any)?.steps?.[0]
  if (isFallbackUserTaskStep(firstStep)) {
    return {
      mode: 'first-task-form',
      inputs: firstStep.form,
      fallbackStepIndex: 0
    }
  }

  return {
    mode: 'none',
    inputs: [],
    fallbackStepIndex: null
  }
}

export const collectRuntimeAssignments = (
  template: FlowTemplate | null,
  launchFormContext: LaunchFormContext
): RuntimeAssignment[] => {
  return ((template?.steps || []) as any[])
    .map((step, stepIndex) => {
      // When the launcher is using the first task form as fallback, we auto-complete
      // that first task as the current user, so its runtime assignment should not be prompted.
      if (stepIndex === 0 && launchFormContext.mode === 'first-task-form') return null
      if (isSystemTaskType(step.type)) return null
      if (String(step.assignment?.assignmentMode || '').toUpperCase() === 'CLAIM') return null
      if (!needsRuntimeAssignment(step)) return null
      return {
        stepIndex,
        stepTitle: step.title || `Step ${stepIndex + 1}`,
        assignmentMode: step.assignment?.assignmentMode || 'CLAIM',
        selectionMode: String(step.assignment?.assignmentMode || '').toUpperCase() === 'ASSIGN' ? 'multi' : 'single',
        targets: null,
        assignedUserId: null,
        assignedUserIds: []
      }
    })
    .filter(Boolean) as RuntimeAssignment[]
}

export const buildRuntimeAssignmentsPayload = (
  assignments: RuntimeAssignment[],
  options?: {
    template?: FlowTemplate | null
    launchFormContext?: LaunchFormContext
    defaultUserId?: string
  }
): Record<string, any> => {
  const runtimeAssignments: Record<string, any> = {}

  assignments.forEach(assignment => {
    if (!hasAssignmentTargets(assignment.targets)) return
    runtimeAssignments[`step_${assignment.stepIndex}`] = {
      assignmentMode: assignment.assignmentMode,
      targets: assignment.targets,
      allowReassignment: true
    }
  })

  const fallbackStepIndex = options?.launchFormContext?.fallbackStepIndex
  if (
    options?.launchFormContext?.mode === 'first-task-form' &&
    typeof fallbackStepIndex === 'number' &&
    options.defaultUserId
  ) {
    const fallbackStep = ((options.template as any)?.steps || [])[fallbackStepIndex]
    if (
      fallbackStep?.assignment &&
      String(fallbackStep.assignment.assignmentMode || '').toUpperCase() !== 'CLAIM' &&
      needsRuntimeAssignment(fallbackStep)
    ) {
      runtimeAssignments[`step_${fallbackStepIndex}`] = {
        assignmentMode: fallbackStep.assignment.assignmentMode || 'ASSIGN_SINGLE',
        targets: { users: [options.defaultUserId] },
        allowReassignment: true
      }
    }
  }

  return runtimeAssignments
}

export const getFallbackCompletionUserId = (
  assignments: RuntimeAssignment[],
  fallbackStepIndex: number | null,
  defaultUserId: string
): string => {
  const matchingAssignment = assignments.find(assignment => assignment.stepIndex === fallbackStepIndex)
  return matchingAssignment?.assignedUserId || matchingAssignment?.targets?.users?.[0] || defaultUserId
}

export const hasAssignmentTargets = (targets: AssignmentTarget | null | undefined): boolean => {
  if (!targets) return false
  return Object.values(targets).some(value => Array.isArray(value) && value.length > 0)
}

export const toRuntimeTaskAssignment = (assignment: RuntimeAssignment): TaskAssignment => ({
  assignmentMode: assignment.assignmentMode as any,
  targets: assignment.targets,
  allowReassignment: true
})

export const coerceFormDataBySchema = (inputs: InputBlock[], formData: Record<string, any>): Record<string, any> => {
  const next = { ...formData }

  inputs.forEach(input => {
    if (String(input?.type || '').toUpperCase() !== InputType.NUMBER) return
    const key = String(input?.name || '').trim()
    if (!key || !(key in next)) return

    const value = next[key]
    if (value === '' || value === null || value === undefined) {
      next[key] = undefined
      return
    }

    if (typeof value === 'number') return

    const parsed = Number(value)
    next[key] = Number.isNaN(parsed) ? value : parsed
  })

  return next
}

const findFallbackTask = (tasks: LauncherTask[], workflowId: string): LauncherTask | null => {
  const matchingTasks = tasks
    .filter(task => String(task.flowId || '').trim() === workflowId && Array.isArray(task.form) && task.form.length > 0)
    .sort((left, right) => {
      const leftTime = left.scheduledAt ? Date.parse(left.scheduledAt) : Number.POSITIVE_INFINITY
      const rightTime = right.scheduledAt ? Date.parse(right.scheduledAt) : Number.POSITIVE_INFINITY
      return leftTime - rightTime
    })

  return matchingTasks[0] || null
}

export const submitFirstTaskFormFallback = async (params: {
  accessToken: string
  userId: string
  workflowId: string
  templateId: string
  formData: Record<string, any>
}): Promise<void> => {
  const { accessToken, userId, workflowId, templateId, formData } = params
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }

  const attempts = [0, 250, 500, 1000, 1500, 2500]

  for (const delayMs of attempts) {
    if (delayMs > 0) {
      await sleep(delayMs)
    }

    const query = new URLSearchParams({
      includeAssigned: 'true',
      includeClaimable: 'true',
      limit: '20',
      offset: '0',
      templateId,
      search: workflowId
    })

    const lookupResponse = await fetch(`${API_BASE}/tasks/user/${encodeURIComponent(userId)}?${query.toString()}`, {
      headers
    })

    if (!lookupResponse.ok) {
      throw new Error(await parseErrorMessage(lookupResponse, 'Failed to look up the first user task after launch.'))
    }

    const lookupPayload = await lookupResponse.json()
    const tasks = Array.isArray(lookupPayload?.tasks) ? (lookupPayload.tasks as LauncherTask[]) : []
    const task = findFallbackTask(tasks, workflowId)

    if (!task) {
      continue
    }

    const completeResponse = await fetch(`${API_BASE}/tasks/${task.id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        action: 'COMPLETE',
        formData
      })
    })

    if (!completeResponse.ok) {
      throw new Error(await parseErrorMessage(completeResponse, 'Failed to submit the first task form after launch.'))
    }

    return
  }

  throw new Error('The launched first task was not available in time for automatic form submission.')
}
