// Shapes for the Custom Flow Engine detail view, mirroring the
// `GET /flows/:id` overview response (FlowOverviewHttpResponse) and the
// `GET /flows/:id/history` events. Fields are optional/defensive because the
// engine omits some of them depending on the assembly path (read model vs
// task fallback), and a few requested fields (SLA, step display names) are not
// returned at all and are rendered as placeholders by the UI.

export interface FlowDetailProgress {
  currentStep?: number
  totalSteps?: number
  completedSteps?: number
  percentage?: number
}

export interface FlowDetailStep {
  stepIndex: number
  title: string
  type?: string
  status: string
  taskId?: string
  taskBusinessId?: string
  actionId?: string
  lifecycleId?: string
  assignmentStatus?: string
  assignmentMode?: string
  // Actor ids / sentinels (MULTIPLE / UNASSIGNED / AVAILABLE / PENDING).
  // The overview never returns display names; those are backfilled from history.
  assignedTo?: string
  assignedUserId?: string
  completedBy?: string
  totalTasks?: number
  completedTasks?: number
  totalForks?: number
  completedForks?: number
  inProgressForks?: number
  startedAt?: string
  completedAt?: string
  claimedAt?: string
  availableAt?: string
  scheduledAt?: string
  // dueDate is only present on the task-fallback path; treat as optional.
  dueDate?: string | null
  completionTimeMinutes?: number
}

export interface FlowDetailOverview {
  id: string
  templateId?: string
  name?: string
  status: string
  createdAt?: string
  completedAt?: string
  initiatedBy?: string
  initiatedById?: string
  progress?: FlowDetailProgress
  steps: FlowDetailStep[]
  tags?: Record<string, unknown>
}

export interface FlowHistoryEvent {
  type?: string
  timestamp?: string
  stepIndex?: number
  stepTitle?: string
  eventTitle?: string
  description?: string
  action?: string
  userId?: string
  // Resolved display name (history is the only flow endpoint that returns it).
  userName?: string
}
