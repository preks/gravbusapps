export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface PipelineInfo {
  id: string
  name: string
  ref: string
  description?: string
  color?: string
}

export interface OpportunityStage {
  id: string
  name: string
  ref: string
  order: number
  color?: string
}

export interface OpportunityData {
  id: string
  name: string
  estimatedAmount: number
  currency: string
  status: string
  stage: OpportunityStage
  closeDate?: Date
  createdAt: Date
  ownerEmployee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  }
  winningChance?: number
}

export interface LeadData {
  id: string
  name: string
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  status: string
  source?: string
  createdAt: Date
  ownerEmployee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  }
}

export interface ActivityData {
  id: string
  title: string
  type: string
  description?: string
  createdAt: Date
  completedAt?: Date
  ownerEmployeeId: string
  leadId?: string
  opportunityId?: string
  accountId?: string
}

export interface SalesRepPerformance {
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  dealsWon: number
  dealsLost: number
  totalValue: number
  winRate: number
  activitiesCount: number
}

export interface WinRateMetrics {
  monthToDate: {
    won: number
    lost: number
    winRate: number
  }
  quarterToDate: {
    won: number
    lost: number
    winRate: number
  }
}

export interface ActivityVolumeMetrics {
  last7Days: {
    total: number
    calls: number
    emails: number
    meetings: number
  }
  last30Days: {
    total: number
    calls: number
    emails: number
    meetings: number
  }
}

export interface OpportunityFunnelData {
  stage: OpportunityStage
  count: number
  value: number
  percentage: number
}

export interface PipelineMetrics {
  totalOpportunities: number
  totalValue: number
  avgDealSize: number
  dealsWon: number
  winRate: number
}

export interface PipelineData {
  pipeline: PipelineInfo
  metrics: PipelineMetrics
  opportunities: OpportunityData[]
  activities: ActivityData[]
  winRateMetrics: WinRateMetrics
  activityVolume: ActivityVolumeMetrics
  funnelData: OpportunityFunnelData[]
  leaderboard: SalesRepPerformance[]
}

export interface DashboardData {
  pipelines: PipelineData[]
  lastUpdated: Date
  isLoading: boolean
  error?: string
}

export interface DashboardFilters {
  dateRange: DateRange
  selectedPipelines: string[]
  selectedOwners: string[]
}

export interface KpiTileProps {
  title: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  icon?: React.ReactNode
  loading?: boolean
  onClick?: () => void
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  percentage?: number
}

// Entity configuration for module-specific differences
export type DashboardSource = 'customer-relations' | 'investments'

export interface DashboardEntityConfig {
  source: DashboardSource
  urlPrefix: string
  entities: {
    activity: 'SalesActivity' | 'InvestmentActivity'
    task: 'SalesTask' | 'InvestmentTask'
    opportunity: 'Opportunity' | 'InvestmentOpportunity'
    lead: 'Lead' | 'InvestmentLead'
  }
  // Field name mappings for different schemas
  fieldMappings: {
    pipelineStageField: 'salesPipelineStage' | 'opportunityPipelineStage'
    pipelineStageRefField: 'salesPipelineStageRef' | 'opportunityPipelineStageRef'
    statusField: 'status' | 'opportunityStatus'
  }
}

// Pre-defined configurations for CRM and IRM
export const CRM_DASHBOARD_CONFIG: DashboardEntityConfig = {
  source: 'customer-relations',
  urlPrefix: '/platform/crm',
  entities: {
    activity: 'SalesActivity',
    task: 'SalesTask',
    opportunity: 'Opportunity',
    lead: 'Lead'
  },
  fieldMappings: {
    pipelineStageField: 'salesPipelineStage',
    pipelineStageRefField: 'salesPipelineStageRef',
    statusField: 'status'
  }
}

export const IRM_DASHBOARD_CONFIG: DashboardEntityConfig = {
  source: 'investments',
  urlPrefix: '/platform/irm',
  entities: {
    activity: 'InvestmentActivity',
    task: 'InvestmentTask',
    opportunity: 'InvestmentOpportunity',
    lead: 'InvestmentLead'
  },
  fieldMappings: {
    pipelineStageField: 'opportunityPipelineStage',
    pipelineStageRefField: 'opportunityPipelineStageRef',
    statusField: 'opportunityStatus'
  }
}

// Overview data interface used by hooks
export interface OverviewData {
  aggregatedFunnel: Array<{
    stage: string
    count: number
    value: number
    percentage: number
    color: string
  }>
  availableCurrencies: string[]
  selectedCurrency: string
  revenueBySource: Array<{
    source: string
    value: number
    percentage: number
    color: string
  }>
  totalPipelineValue: number
  totalRevenue: number
  totalLeadCount?: number
  recentRecords: Array<{
    id: string
    name: string
    type: 'opportunity' | 'lead' | 'contact'
    createdAt: string
  }>
  keyDeals: Array<{
    id: string
    name: string
    value: string
    stage: string
    owner: string
    closeDate: string
  }>
  todaysActivities: Array<{
    id: string
    title: string
    description: string
    type: string
    createdAt: string
    completedAt: string | null
    owner: string
    relatedTo: string
    relatedEntity?: {
      type: 'opportunity' | 'lead' | 'contact' | 'account'
      id: string
      name: string
    }
  }>
  activeTasks: Array<{
    id: string
    name: string
    description: string
    dueDate: string | null
    status: string
    priority: string
    assignedTo: string
    relatedTo: string
    relatedEntity?: {
      type: 'opportunity' | 'lead' | 'account' | 'contact'
      id: string
      name: string
    }
    isOverdue: boolean
  }>
}
