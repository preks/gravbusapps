/**
 * Generic activity interface for calendar view
 * Can represent any activity from any module
 */
export interface GenericActivity {
  id: string
  version?: number
  title: string
  description?: string
  occurredAt?: string
  createdAt: string
  activityType?: { value: string; code?: string }
  // Owner/creator information
  ownerEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
  // Documents attached to activity
  documents?: Array<{
    id: string
    name: string
    mimeType?: string | null
    fileSize?: number | null
    fileInfo?: {
      path: string
      fileMetadata?: {
        mimeType?: string
      }
    }
  }>
  // Entity references (optional)
  accountId?: string | null
  account?: { id: string; name: string } | null
  contactId?: string | null
  contact?: { id: string; firstName: string; lastName: string } | null
  leadId?: string | null
  lead?: { id: string; name: string } | null
  opportunityId?: string | null
  opportunity?: { id: string; name: string } | null
  /** IRM-only; optional on type for workspace adapters that load investment activities */
  investmentId?: string | null
  investment?: { id?: string; name?: string; code?: string | null; pictureThumbnail?: string | null } | null
}

/**
 * Generic task interface
 */
export interface GenericTask {
  id: string
  version?: number
  name: string
  description?: string
  createdAt: string
  dueDate?: string
  startDate?: string
  status?: { value: string; code: string }
  priority?: { value: string }
  taskAssignees?: Array<{
    assignedEmployee?: {
      id: string
      displayName?: string
      fullName?: string
    }
  }>
  // Entity references
  lead?: { id: string; name: string } | null
  account?: { id: string; name: string } | null
  contact?: { id: string; firstName: string; lastName: string } | null
  opportunity?: { id: string; name: string } | null
}

/**
 * Calendar activity for two-week calendar view
 */
export interface CalendarActivity {
  id: string
  title: string
  date: string // ISO date string
  activityType: { value: string }
  entityType?: 'task' | 'activity'
  entityId?: string
  entityName?: string
}

/**
 * Generic KPI data structure
 */
export interface GenericKpiData {
  [key: string]: any
}
