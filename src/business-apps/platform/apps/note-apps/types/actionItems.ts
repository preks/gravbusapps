export type FlowRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'UNKNOWN'

export interface NoteActionItemFlow {
  /** Stable id for this action item inside the note */
  id: string
  /** Original action item text */
  text: string
  /** UserId of assignee (Blink recipient) */
  assigneeUserId: string
  /** Display name for UI */
  assigneeDisplayName?: string
  /** Avatar image url (data url preferred) */
  assigneeAvatarUrl?: string
  /** Workflow instance id returned by flow-engine */
  workflowId: string
  /** Current workflow status */
  status: FlowRunStatus
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when completed (if completed) */
  completedAt?: string
  /** ISO timestamp of last status sync */
  lastSyncedAt?: string
}
