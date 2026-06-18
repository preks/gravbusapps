import { TaskEventType } from '@/common/data/flow/types/flowTemplate'

export const EVENT_TYPE_OPTIONS: Array<{ value: TaskEventType | string; label: string }> = [
  { value: TaskEventType.TASK_CREATED, label: 'Task created' },
  { value: 'task.action.*', label: 'Any action' },
  { value: TaskEventType.TASK_ACTION_CLAIMED, label: 'Claim' },
  { value: TaskEventType.TASK_ACTION_UNCLAIMED, label: 'Unclaim' },
  { value: TaskEventType.TASK_ACTION_REASSIGNED, label: 'Reassign' },
  { value: TaskEventType.TASK_ACTION_COMPLETED, label: 'Complete' },
  { value: TaskEventType.TASK_ACTION_REJECTED, label: 'Reject' },
  { value: TaskEventType.TASK_COMMENT_CREATED, label: 'Comment created' },
  { value: TaskEventType.TASK_DUE_SOON, label: 'Due soon' },
  { value: TaskEventType.TASK_OVERDUE, label: 'Overdue' }
]

export const NOTIFY_CHANNEL_OPTIONS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
  { value: 'WEB', label: 'Web' }
] as const
