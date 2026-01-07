import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

export type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

export interface Note {
  id: string
  content: string
  author: string
  createdAt: string
  important: boolean
  leadId: string
}

export interface Opportunity {
  id: string
  name: string
  value: number
  stage: 'Discovery' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  probability: number
  expectedCloseDate: string
  owner: string
  stageColor: string
}

export interface Contact {
  id: string
  version: string
  email: string
  name: string
  phone: string
  pictureUrl: string
  jobTitle: string
}

// Re-export InvestmentLead as Lead for compatibility
export type Lead = InvestmentLead

export interface ReferenceData {
  id: string
  value: string
  code: string
  type?: string
}

export interface SalesActivityData {
  id: string
  title: string
  description: string
  createdAt: string
  createdBy: string
  activityType?: any
}

export interface SalesTaskData {
  id: string
  name: string
  description?: string
  statusRef?: string
  priority?: any
  dueDate?: string
  taskAssignees?: Array<{
    assignedEmployee?: any
  }>
  creatorEmployee?: any
  createdAt: string
  createdBy: string
  taskTiming?: string
  typeRef?: string
}
