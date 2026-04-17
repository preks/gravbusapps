import type { UnifiedTask } from '../types'

type TaskLink = {
  type?: string
  metadata?: Record<string, unknown>
}

type TaskFormField = Record<string, any>

const DECISION_FIELD_NAME = 'decision'
const DECISION_FIELD_TYPE = 'RADIO'

export const DOCUMENT_APPROVAL_APP_TAG = 'document-approval'
export const DOCUMENT_APPROVAL_OUTCOME_APP_TAG = 'document-approval-outcome'

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
  return (
    getTaskAppTag(task) === DOCUMENT_APPROVAL_APP_TAG && Boolean(resolveDocumentApprovalRequestId(task, entityLink))
  )
}

export function isDocumentApprovalOutcomeTask(task: UnifiedTask, entityLink?: TaskLink): boolean {
  return (
    getTaskAppTag(task) === DOCUMENT_APPROVAL_OUTCOME_APP_TAG &&
    Boolean(resolveDocumentApprovalRequestId(task, entityLink))
  )
}

/**
 * Returns `true` for either the approver-side `document-approval` task or the
 * requester-side `document-approval-outcome` notification task. Both are
 * backed by the same approval request and should expose the same preview
 * dialog so the requester can open the reviewed revision from their inbox.
 */
export function isAnyDocumentApprovalTask(task: UnifiedTask, entityLink?: TaskLink): boolean {
  return isDocumentApprovalTask(task, entityLink) || isDocumentApprovalOutcomeTask(task, entityLink)
}

/**
 * Resolves the reviewer's decision (if present on the task) so the UI can
 * render appropriate copy for approved/rejected outcome tasks.
 */
export function resolveDocumentApprovalDecision(
  task: UnifiedTask,
  entityLink?: TaskLink
): 'approved' | 'rejected' | undefined {
  const raw =
    task.tags?.decision ||
    task.sourceMetadata?.tags?.decision ||
    task.workflowMeta?.tags?.decision ||
    entityLink?.metadata?.decision

  if (raw === 'approved' || raw === 'rejected') {
    return raw
  }

  return undefined
}

/**
 * Resolves the reviewer's display name if it was threaded through the
 * approval-outcome task tags or link metadata. Falls back to the raw reviewer
 * user id only if nothing nicer is available.
 */
export function resolveDocumentApprovalReviewerName(task: UnifiedTask, entityLink?: TaskLink): string | undefined {
  const sources: Array<unknown> = [
    task.tags?.reviewerDisplayName,
    task.sourceMetadata?.tags?.reviewerDisplayName,
    task.workflowMeta?.tags?.reviewerDisplayName,
    entityLink?.metadata?.reviewerDisplayName
  ]

  for (const source of sources) {
    if (typeof source === 'string' && source.trim().length > 0) {
      return source.trim()
    }
  }

  return undefined
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
