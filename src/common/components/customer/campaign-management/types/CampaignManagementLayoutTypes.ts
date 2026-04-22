import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FlowContextName } from '@/common/types/FlowRegistryTypes'

/**
 * Campaign data structure (generic - adaptable to any module's campaign entity)
 */
export interface Campaign {
  id: string
  name?: string // Optional to support different module schemas
  type?: {
    id: string
    value: string
  }
  startDate?: string
  endDate?: string
  createdAt?: string // Optional to support different schemas
  description?: string
  budget?: number
  actualCost?: number
  [key: string]: any // Allow additional properties from different modules
}

/**
 * Campaign statistics data
 */
export interface CampaignStatistics {
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  averageDuration: number
  previousPeriod?: {
    totalCampaigns: number
    activeCampaigns: number
    completedCampaigns: number
    averageDuration: number
  }
}

/**
 * Analytics data structure (flexible to support different module schemas)
 */
export interface CampaignAnalyticsData {
  metrics?: any
  campaignComparisons?: any
  timelineAnalysis?: any
  revenueComparisons?: any
  efficiencyComparisons?: any
  topCampaigns?: any
  topEmployees?: any
  campaigns?: any[]
  topPerformers?: {
    topCampaignsByRevenue?: any[]
    topCampaignsByLeads?: any[]
    topEmployeesByRevenue?: any[]
    topEmployeesByLeads?: any[]
  }
  timeline?: {
    dates?: string[]
    cumulativeLeads?: number[]
    cumulativeOpportunities?: number[]
    cumulativeRevenue?: number[]
  }
  revenueAnalysis?: {
    campaigns?: any[]
  }
  [key: string]: any // Allow additional properties
}

/**
 * Filter configuration for campaign types
 */
export interface CampaignTypeOption {
  id: string
  label: string
}

/**
 * Props for the shared CampaignManagementLayout component
 */
export interface CampaignManagementLayoutProps extends BusinessAppContextProps {
  // Data props
  campaigns: Campaign[]
  statistics: CampaignStatistics | null
  analyticsData: CampaignAnalyticsData | null
  campaignTypeOptions: CampaignTypeOption[]

  // Loading states
  isLoading: boolean
  isStatisticsLoading: boolean
  isAnalyticsLoading: boolean
  isTimelineLoading: boolean

  // Error states
  error: string | null
  statisticsError: string | null
  analyticsError: string | null
  timelineError: string | null

  // Search and filters
  search: string
  onSearchChange: (search: string) => void
  selectedFilters: string[]
  onFilterChange: (filters: Record<string, any>) => void

  // Persistence — initial values loaded from localStorage
  initialFilters?: Record<string, any>
  initialSorting?: Array<{ id: string; desc: boolean }>
  initialVisibleColumns?: string[]
  onSaveVisibleColumns?: (columns: string[]) => void

  // Date range filters
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string

  // Sorting and pagination
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  onSortChange?: (field: string, order: 'ASC' | 'DESC') => void

  // Actions
  onRefetch: () => void
  onRefetchStatistics: () => void
  onRefetchAnalytics: () => void
  onRefetchTimeline: () => void
  onFetchAnalytics: () => void
  onCampaignRowClick?: (campaign: Campaign) => void
  onAddCampaign?: () => void

  // Analytics timeline period (flexible string to support different module schemas)
  timelinePeriod: string
  onTimelinePeriodChange: (period: string) => void

  // Flow context for actions
  campaignEntityContext: FlowContextName
  campaignCreateContext: FlowContextName

  // UI customization
  translations?: {
    title?: string
    addButton?: string
    searchPlaceholder?: string
    emptyMessage?: string
  }

  // Rendering functions (allows parent to control how components are rendered)
  columns?: any[] // Column definitions for the table
  renderCampaignActions?: (row: { original: Campaign }) => React.ReactNode
  renderStatistics?: () => React.ReactNode
  renderAnalytics?: () => React.ReactNode

  // Configuration objects
  filterConfiguration?: any
  sortableColumns?: Array<{ id: string; label: string }>

  // Export
  enableExport?: boolean
  exportFilenamePrefix?: string
  fetchCampaignsForExport?: (variables: Record<string, any>) => Promise<{ SalesCampaign?: any[] }>

  // Optional callbacks
  onBack?: () => void
}
