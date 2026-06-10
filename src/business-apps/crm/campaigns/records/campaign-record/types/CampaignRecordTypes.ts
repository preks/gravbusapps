import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface CatalogEntry {
  id: string
  code: string
  value: string
}

// Campaign record interfaces
export interface CampaignRecord {
  id: string
  name: string
  type: CatalogEntry
  startDate: string
  endDate: string
  description?: string
  createdAt: string
  updatedAt: string
  isDeleted: boolean

  // Strategic Fields
  customerCampaignSegment?: CatalogEntry
  customerCampaignSegmentRef?: string
  customerPersona?: CatalogEntry
  customerValuePackFocus?: CatalogEntry
  customerIndustryFocus?: CatalogEntry
  country?: CatalogEntry

  // Financial Fields
  budgetAllocated?: number
  pipelineTarget?: number
  expectedWinRate?: number
  expectedRevenueContribution?: number

  // Execution Fields
  ownerEmployee?: { id: string; displayName: string }
  customerCampaignStatus?: CatalogEntry
  customerCampaignStatusRef?: string
}

// KPI interfaces with trend data
export interface CampaignKPIs {
  totalLeads: number
  convertedLeads: number
  convertedLeadsPercentage: number
  mqlCount: number
  sqlCount: number
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
  status?: { value: string; code?: string }

  // Essential fields for table display only
  firstName?: string // For leads and contacts
  lastName?: string // For leads and contacts
}

export type CampaignEntityType = 'lead' | 'account' | 'contact' | 'opportunity'

// Query variables
export interface CampaignRecordQueryVariables {
  campaignId: string
  timeFilter?: ChartTimeFilter
  startDate?: string
  endDate?: string
  offset?: number
  limit?: number
  search?: string
  types?: CampaignEntityType[]
  accountReferenceIds?: string[]
  statuses?: string[]
  createdAtFrom?: string
  createdAtTo?: string
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
    mqlCount: CampaignKPIWithTrend
    sqlCount: CampaignKPIWithTrend
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
  activeEntityType: CampaignEntityType
  setSearch: (search: string) => void
  setFilters: (filters: Record<string, any>) => void
  setActiveEntityType: (entityType: CampaignEntityType) => void
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
    mqlCount: CampaignKPIWithTrend
    sqlCount: CampaignKPIWithTrend
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

export interface CampaignEntitiesSectionProps extends BusinessAppContextProps {
  campaignId: string
}

export interface CampaignEntitiesTableProps extends BusinessAppContextProps {
  campaignId: string
}
