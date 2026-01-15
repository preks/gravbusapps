/**
 * IRM Personal Workspace Types
 */

export interface MyInvestmentActivity {
  id: string
  title: string
  description: string
  occurredAt: string
  createdAt: string
  activityType?: { value: string; code?: string }
  accountId?: string | null
  account?: { id: string; name: string } | null
  contactId?: string | null
  contact?: { id: string; firstName: string; lastName: string } | null
  leadId?: string | null
  lead?: { id: string; name: string } | null
  opportunityId?: string | null
  opportunity?: { id: string; name: string } | null
}

export interface MyInvestmentTask {
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

export interface InvestmentKpis {
  opportunities: {
    total: number
    trend: number
  }
  accounts: {
    total: number
    trend: number
  }
  contacts: {
    total: number
    trend: number
  }
  investments: {
    total: number
    trend: number
  }
}
