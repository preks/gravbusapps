import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Campaign record interfaces
export interface CampaignRecord {
  id: string
  name: string
  type: {
    id: string
    code: string
    value: string
  }
  startDate: string
  endDate: string
  description?: string
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

// KPI interfaces with trend data
export interface CampaignKPIs {
  totalLeads: number
  convertedLeads: number
  convertedLeadsPercentage: number
  totalAccounts: number
  totalContacts: number
  totalOpportunities: number
  wonOpportunities: number
  wonOpportunitiesPercentage: number
}

export interface CampaignKPITrend {
  value: string
  positive: boolean
  description: string
}

export interface CampaignKPIWithTrend {
  current: number
  percentage?: number
  trend: CampaignKPITrend
}

// Chart data interfaces
export interface CampaignChartDataPoint {
  date: string
  totalLeads: number
  totalAccounts: number
  totalContacts: number
  totalOpportunities: number
  convertedLeads: number
  wonOpportunities: number
}

export type ChartTimeFilter = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CampaignChartData {
  data: CampaignChartDataPoint[]
  timeFilter: ChartTimeFilter
}

// Entity list interfaces
export interface CampaignEntityOwner {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureUrl?: string
}

export interface CampaignEntity {
  id: string
  name: string
  type: 'lead' | 'account' | 'contact' | 'opportunity'
  creationDate: string
  owner: CampaignEntityOwner
  status?: { value: string }

  // Essential fields for table display only
  firstName?: string // For leads and contacts
  lastName?: string // For leads and contacts
}

// Query variables
export interface CampaignRecordQueryVariables {
  campaignId: string
  timeFilter?: ChartTimeFilter
  startDate?: string
  endDate?: string
  offset?: number
  limit?: number
  search?: string
  orderBy?: Array<{ [key: string]: 'ASC' | 'DESC' }>
}

// Hook return types
export interface UseCampaignRecordReturn {
  campaign: CampaignRecord | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export interface UseCampaignKPIsReturn {
  kpis: CampaignKPIs | null
  kpisWithTrends: {
    totalLeads: CampaignKPIWithTrend
    totalAccounts: CampaignKPIWithTrend
    totalContacts: CampaignKPIWithTrend
    totalOpportunities: CampaignKPIWithTrend
  } | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export interface UseCampaignChartReturn {
  chartData: CampaignChartData | null
  isLoading: boolean
  error: string | null
  timeFilter: ChartTimeFilter
  setTimeFilter: (filter: ChartTimeFilter) => void
  refetch: () => void
}

export interface UseCampaignEntitiesReturn {
  entities: CampaignEntity[]
  totalCount: number
  isLoading: boolean
  error: string | null
  currentPage: number
  pageSize: number
  search: string
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setSorting: (field?: string, order?: 'ASC' | 'DESC') => void
  refetch: () => void
}

// Component props interfaces
export interface CampaignRecordProps extends BusinessAppContextProps {
  campaignId: string
  onBack?: () => void
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export interface CampaignHeaderProps {
  campaign: CampaignRecord | null
  isLoading: boolean
  accessToken?: string
  campaignId?: string | null
}

export interface CampaignKPIsProps {
  kpis: CampaignKPIs | null
  kpisWithTrends: {
    totalLeads: CampaignKPIWithTrend
    totalAccounts: CampaignKPIWithTrend
    totalContacts: CampaignKPIWithTrend
    totalOpportunities: CampaignKPIWithTrend
  } | null
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

export interface CampaignChartProps extends BusinessAppContextProps {
  campaignId: string
  campaign: CampaignRecord | null
}

export interface CampaignEntitiesTableProps extends BusinessAppContextProps {
  campaignId: string
}
