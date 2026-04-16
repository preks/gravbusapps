import type { UnifiedTask } from '../types'

type TaskLink = {
  type?: string
  metadata?: Record<string, unknown>
}

type TaskFormField = Record<string, any>

const DECISION_FIELD_NAME = 'decision'
const DECISION_FIELD_TYPE = 'RADIO'

export function getTaskAppTag(task: UnifiedTask): string {
  const tags = {
    ...((task.sourceMetadata?.tags ?? {}) as Record<string, unknown>),
    ...(((task.workflowMeta as { tags?: Record<string, unknown> } | undefined)?.tags ?? {}) as Record<string, unknown>),
    ...((task.tags ?? {}) as Record<string, unknown>)
  }

  return String(tags.app ?? tags.app_tag ?? '')
}

export function resolveDocumentApprovalRequestId(task: UnifiedTask, entityLink?: TaskLink): string | undefined {
  const requestId =
    task.tags?.approvalRequestId ||
    task.sourceMetadata?.tags?.approvalRequestId ||
    task.workflowMeta?.tags?.approvalRequestId ||
    entityLink?.metadata?.approvalRequestId

  return typeof requestId === 'string' && requestId.length > 0 ? requestId : undefined
}

export function isDocumentApprovalTask(task: UnifiedTask, entityLink?: TaskLink): boolean {
  return getTaskAppTag(task) === 'document-approval' && Boolean(resolveDocumentApprovalRequestId(task, entityLink))
}

export function filterFormFieldsForDocumentApproval(
  task: UnifiedTask,
  entityLink?: TaskLink,
  form: unknown = task.form
): TaskFormField[] {
  if (!Array.isArray(form)) {
    return []
  }

  if (!isDocumentApprovalTask(task, entityLink)) {
    return form as TaskFormField[]
  }

  return (form as TaskFormField[]).filter(field => {
    const fieldName = String(field?.name ?? field?.id ?? '')
    const fieldType = String(field?.type ?? '').toUpperCase()
    return !(fieldName === DECISION_FIELD_NAME && fieldType === DECISION_FIELD_TYPE)
  })
}
