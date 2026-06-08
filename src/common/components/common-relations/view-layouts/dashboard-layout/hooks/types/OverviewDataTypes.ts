/**
 * Shared types for Overview Data across CRM and IRM modules
 */

export type RecordType = 'opportunity' | 'lead' | 'contact' | 'account'
export type RelatedEntityType = 'opportunity' | 'lead' | 'contact' | 'account'

export interface OverviewData {
  aggregatedFunnel: Array<{
    stage: string
    count: number
    value: number
    percentage: number
    color?: string
  }>
  availableCurrencies: string[]
  selectedCurrency: string
  revenueBySource: Array<{
    source: string
    sourceRef: string
    sourceCode: string
    value: number
    percentage: number
    convertedCount: number
    conversionRate: number
    qualityLevel?: 'high' | 'medium' | 'low'
    qualityIndicator?: string
    qualityText?: string
    color?: string
  }>
  totalPipelineValue: number
  totalRevenue: number
  totalLeadCount: number
  recentRecords: Array<{
    id: string
    name: string
    type: RecordType
    createdAt: string
  }>
  keyOpportunities: Array<{
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
      type: RelatedEntityType
      id: string
      name: string
    }
  }>
  todaysActivitiesTotal: number
  activeTasks: Array<{
    id: string
    name: string
    description: string
    dueDate: string | null
    status: string
    priority: string
    assignedTo: string
    relatedTo: string
    relatedEntity: {
      type: RelatedEntityType
      id: string
      name: string
    } | null
    isOverdue: boolean
  }>
  activeTasksTotal: number
  // Optional: Opportunity status data (used instead of revenueBySource for IRM)
  opportunityStatuses?: Array<{
    status: string
    statusRef: string | null
    count: number
    totalAmount: number
  }>
  totalOpportunityCount?: number
  openOpportunitiesComparison?: {
    beforeCurrentQuarter: number
    currentQuarter: number
  }
  // Flag to indicate which middle card to render
  useOpportunityStatus?: boolean
}

export interface UseOverviewDataReturn {
  overviewData: OverviewData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  setSelectedCurrency: (currency: string) => void
  selectedOpportunityCurrency: string
  setSelectedOpportunityCurrency: (currency: string) => void
  handleTasksPageChange: (page: number, pageSize: number) => void
  handleActivitiesPageChange: (page: number, pageSize: number) => void
}
