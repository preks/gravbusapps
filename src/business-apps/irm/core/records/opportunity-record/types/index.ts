export interface Note {
  id: string
  content: string
  author: string
  createdAt: string
  important: boolean
  opportunityId: string
}

export interface OpportunityStage {
  id: string
  name: string
  stage: 'Discovery' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  probability: number
  color: string
  order: number
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

export interface Account {
  id: string
  version: string
  name: string
  industryRef: string
  industry: {
    code: string
    id: string
    type: string
    value: string
  }
  numberOfEmployees: {
    type: string
    value: string
    id: string
    code: string
  }
  numberOfEmployeesRef: string
  addressLine: string
  foundationDate: string
  annualRevenueRef: string
  annualRevenue: {
    type: string
    value: string
    id: string
    code: string
  }
  website: string
  ownerEmployeeId?: string
  ownerEmployee?: {
    firstName: string
    lastName: string
  }
}

export interface Opportunity {
  id: string
  name: string
  description?: string
  version: string
  status: string
  statusRef?: string
  stage: string
  stageRef?: string
  value: number
  currency: {
    id: string
    type: string
    value: string
    code: string
  }
  currencyRef: string
  probability: number
  expectedCloseDate: string
  actualCloseDate?: string
  source: {
    id: string
    type: string
    value: string
    code: string
  }
  sourceRef: string
  priority: {
    id: string
    type: string
    value: string
    code: string
  }
  priorityRef: string
  ownerEmployeeId: string
  ownerEmployee: {
    firstName: string
    lastName: string
  }
  ownerOrganization: {
    name: string
  }
  accountId: string
  account: Account | null
  contact: Contact
  leadId?: string
  lead?: {
    id: string
    name: string
    status: string
  }
  activities: OpportunityActivity[]
  tasks: OpportunityTask[]
  competitors: Competitor[]
  products: OpportunityProduct[]
  aiSummary: {
    text: string
    insights: string[]
    recommendations: string[]
  }
}

export interface OpportunityActivity {
  id: string
  version: string
  title: string
  opportunityId: string
  leadId?: string
  ownerEmployeeId: string
  ownerEmployee: {
    firstName: string
    lastName: string
  }
  createdAt: string
  description: string
  activityType: {
    code: string
    id: string
    type: string
    value: string
  }
  activityStatus: {
    code: string
    id: string
    type: string
    value: string
  }
  outcome?: string
  nextSteps?: string
}

export interface OpportunityTask {
  id: string
  version: string
  title: string
  description: string
  opportunityId: string
  assignedToEmployeeId: string
  assignedToEmployee: {
    firstName: string
    lastName: string
  }
  dueDate: string
  status: string
  priority: string
  createdAt: string
  completedAt?: string
}

export interface Competitor {
  id: string
  name: string
  strengths: string[]
  weaknesses: string[]
  products: string[]
  pricing: string
  marketShare: number
  competitivePosition: 'Leading' | 'Challenging' | 'Following' | 'Niche'
}

export interface OpportunityProduct {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discount: number
  description?: string
  currency: {
    id: string
    type: string
    value: string
    code: string
  }
}

export interface ReferenceData {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
}
