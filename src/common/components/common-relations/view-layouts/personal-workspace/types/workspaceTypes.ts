/**
 * Generic activity interface for calendar view
 * Can represent any activity from any module
 */
export interface GenericActivity {
  id: string
  title: string
  description?: string
  occurredAt?: string
  createdAt: string
  activityType?: { value: string; code?: string }
  // Entity references (optional)
  accountId?: string | null
  account?: { id: string; name: string } | null
  contactId?: string | null
  contact?: { id: string; firstName: string; lastName: string } | null
  leadId?: string | null
  lead?: { id: string; name: string } | null
  opportunityId?: string | null
  opportunity?: { id: string; name: string } | null
}

/**
 * Generic task interface
 */
export interface GenericTask {
  id: string
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
