import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Main component props
export interface SalesMemberPerformanceProps extends BusinessAppContextProps {
  memberId: string
  onBack?: () => void
  initialTab?: 'performance' | 'activities' | 'calendar'
}

// Tab configuration
export interface TabItem {
  key: string
  label: string
}

// Performance Statistics
export interface PerformanceStatistics {
  leadsWorked: {
    total: number
    converted: number
    conversionRate: number
  }
  contactsWorked: {
    total: number
    salesRelated: number
    percentage: number
  }
  opportunitiesManaged: {
    total: number
    won: number
    winRate: number
  }
  accountsManaged: {
    total: number
    revenue: number
    currencyId: string
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

// Main performance data structure (no longer includes employee since it's fetched separately)
export interface MemberPerformanceData {
  statistics: PerformanceStatistics
  entitiesOwned: EntitiesOwned
}
