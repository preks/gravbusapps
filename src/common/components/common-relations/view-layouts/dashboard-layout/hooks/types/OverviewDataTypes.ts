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
}

export interface UseOverviewDataReturn {
  overviewData: OverviewData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  setSelectedCurrency: (currency: string) => void
  selectedDealCurrency: string
  setSelectedDealCurrency: (currency: string) => void
  handleTasksPageChange: (page: number, pageSize: number) => void
  handleActivitiesPageChange: (page: number, pageSize: number) => void
}
