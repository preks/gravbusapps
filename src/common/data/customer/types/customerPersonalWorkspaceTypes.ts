/**
 * Customer Personal Workspace Types
 * Types used in CRM personal workspace views for activities, tasks, and KPIs
 */

export interface MySalesActivity {
  id: string
  title: string
  description: string
  occurredAt: string
  createdAt: string
  activityType?: { value: string }
  accountId?: string | null
  account?: { id: string; name: string } | null
  contactId?: string | null
  contact?: { id: string; firstName: string; lastName: string } | null
  leadId?: string | null
  lead?: { id: string; name: string } | null
  opportunityId?: string | null
  opportunity?: { id: string; name: string } | null
}

export interface MyTask {
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
  reference?: {
    entityId: string
    entityName: string
  }
  // Entity references from GraphQL query
  lead?: { id: string; name: string } | null
  account?: { id: string; name: string } | null
  contact?: { id: string; firstName: string; lastName: string } | null
  opportunity?: { id: string; name: string } | null
}

export interface PersonalKpis {
  leads: {
    total: number
    converted: number
    trend: number
  }
  opportunities: {
    total: number
    won: number
    trend: number
  }
  accounts: {
    total: number
    trend: number
  }
  activities: {
    thisMonth: number
    trend: number
  }
  contacts: {
    total: number
    trend: number
  }
}
