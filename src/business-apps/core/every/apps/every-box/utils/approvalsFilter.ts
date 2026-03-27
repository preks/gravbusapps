import type { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

/**
 * InFlows "Approvals" filter + dropdown count — must stay in sync (same predicate in EveryBox + InboxView).
 *
 * Includes: classic approvals (name Approve, "approve document", etc.) and HR-style acknowledgments
 * (sick leave, absence, …). Excludes generic "Acknowledge relationship changed"–type tasks so they stay under All.
 */
export function isApprovalsFilterTask(task: UnifiedTask): boolean {
  const taskName = (task.referenceTaskName || task.name || task.title || '').toLowerCase()
  const taskType = (task.type || '').toLowerCase()
  const taskCategory = (task.taskCategory || '').toLowerCase()

  if (
    taskName.includes('approval') ||
    taskName.includes('approve') ||
    taskType.includes('approval') ||
    taskCategory.includes('approval') ||
    task.tags?.category === 'approval'
  ) {
    return true
  }

  return false
}
