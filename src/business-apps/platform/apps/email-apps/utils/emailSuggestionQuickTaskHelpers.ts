import type { QuickTaskFormData } from '@/common/components/flow/flow-quick-task/types'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import type { EmailSummarizeSuggestion, EmailMessage } from '../types'

export function toAvatarSrc(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

export function buildQuickTaskMessage(
  suggestion: EmailSummarizeSuggestion,
  message: EmailMessage,
  noSubjectLabel: string
): string {
  const parts = [
    suggestion.details,
    suggestion.evidence,
    suggestion.assignee ? `Assignee: ${suggestion.assignee}` : undefined
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (parts.length > 0) return parts.join('\n\n')
  return message.textBody || message.snippet || message.subject || noSubjectLabel
}

export function dueDateForQuickTask(dueAt?: string): string {
  const trimmedDueAt = dueAt?.trim()
  if (!trimmedDueAt) return ''
  const d = new Date(trimmedDueAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function entityFieldsFromSuggestionMetadata(
  metadata?: Record<string, string>
): Pick<QuickTaskFormData, 'entityType' | 'entityId' | 'entityName' | 'entityDisplayUrl'> {
  if (!metadata) return {}
  const entityType = metadata.entityType?.trim()
  const entityId = metadata.entityId?.trim()
  const entityName = metadata.entityName?.trim()
  const entityDisplayUrl = metadata.entityDisplayUrl?.trim()
  if (entityType && entityId && entityName && entityDisplayUrl) {
    return { entityType, entityId, entityName, entityDisplayUrl }
  }
  return {}
}

export function assigneeIdFromEmployee(e: EmployeeLiteOption): string {
  return (e.userId || e.id).trim()
}
