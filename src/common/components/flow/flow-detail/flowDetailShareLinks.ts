import { Navigation, buildPlatformUrl } from '@/common/utils/navigationUtils'

const FLOW_TASK_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SYNTHETIC_TRIGGER_TASK_ID_PREFIX = 'start-'

/** True when taskId is a real Flow Engine task UUID (shareable without flowId in the URL). */
export function isRealFlowTaskId(taskId: string | undefined): taskId is string {
  return Boolean(taskId?.trim() && FLOW_TASK_UUID_PATTERN.test(taskId.trim()))
}

/** Synthetic focus id for the trigger step: `start-{flowId}`. */
export function parseSyntheticTriggerFlowId(taskId: string | undefined): string | null {
  if (!taskId?.trim().startsWith(SYNTHETIC_TRIGGER_TASK_ID_PREFIX)) {
    return null
  }
  const flowId = taskId.trim().slice(SYNTHETIC_TRIGGER_TASK_ID_PREFIX.length)
  return flowId || null
}

export function buildFlowDetailPath(flowId: string, taskId?: string): string {
  const normalizedTaskId = taskId?.trim()

  if (normalizedTaskId && isRealFlowTaskId(normalizedTaskId)) {
    return buildPlatformUrl(Navigation.FLOW_DETAIL, { taskId: normalizedTaskId })
  }

  const params: Record<string, string> = { flowId }
  if (normalizedTaskId) {
    params.taskId = normalizedTaskId
  }
  return buildPlatformUrl(Navigation.FLOW_DETAIL, params)
}

export function buildFlowDetailShareUrl(flowId: string, taskId?: string): string {
  const path = buildFlowDetailPath(flowId, taskId)
  if (typeof window !== 'undefined' && path.startsWith('/')) {
    return `${window.location.origin}${path}`
  }
  return path
}

export function buildFlowTriggerFocusTaskId(flowId: string): string {
  return `start-${flowId}`
}
