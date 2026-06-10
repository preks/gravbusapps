import type { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

/** True when a string looks like a raw process/task identifier rather than a human title. */
function looksLikeIdentifier(value: string): boolean {
  if (value.includes(' ')) return false
  return /[a-z][A-Z]/.test(value) || /[._-]/.test(value)
}

/**
 * Turn identifiers like "approveExpenseRequest" or "approve_expense_request"
 * into a human-friendly "Approve Expense Request".
 */
export function humanizeIdentifier(value: string): string {
  const spaced = value
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

  if (!spaced) return value

  return spaced
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/**
 * Resolve a friendly task title. Mirrors EveryBox's source-aware resolution but
 * additionally humanizes raw Kogito identifiers (which EveryBox shows verbatim).
 */
export function resolveTaskTitle(task: UnifiedTask, fallback: string): string {
  const base =
    task.source === 'kogito'
      ? task.referenceTaskName || task.sourceMetadata?.nodeName || task.name
      : task.title || task.name

  const raw = (base || '').trim()
  if (!raw) return fallback

  return looksLikeIdentifier(raw) ? humanizeIdentifier(raw) : raw
}

/** Resolve the id used to look up the task creator's employee/avatar record. */
export function getTaskCreatorId(task: UnifiedTask): string | undefined {
  return (
    task.sourceMetadata?.creatorUserId ||
    task.sourceMetadata?.creatorEmployeeId ||
    task.sourceMetadata?.createdBy ||
    task.sourceMetadata?.initiatedBy
  )
}
