// Performance Statistics — server-side sales KPIs for individual employees
export interface PerformanceStatistics {
  totalRevenue: number
  wonOpportunities: number
  totalOpportunities: number
  winRate: number
  pipelineValue: number
  currencyId: string
  trends: {
    revenueChange: number
    wonOpportunitiesChange: number
    winRateChange: number
    pipelineChange: number
  }
}

// Entity type for tab selection
export type EntityType = 'leads' | 'contacts' | 'opportunities' | 'accounts'

// Contact entity
export interface Contact {
  id: string
  name: string
  company: string
  email?: string
  phone?: string
  lastContact: string
  status: string
}

// Opportunity entity
export interface Opportunity {
  id: string
  name: string
  account: string
  amount: number
  currencyId: string
  stage: string
  closeDate: string
  probability: number
}

// Account entity
export interface Account {
  id: string
  name: string
  industry: string
  revenue: number
  currencyId: string
  employees: number
  status: string
}

// Lead entity
export interface Lead {
  id: string
  contactName: string
  company: string
  email?: string
  phone?: string
  creationDate: string
  status: string
  rating: string // "warm", "hot", or "cold"
}

// Entities owned by the member
export interface EntitiesOwned {
  leads: Lead[]
  contacts: Contact[]
  opportunities: Opportunity[]
  accounts: Account[]
}
