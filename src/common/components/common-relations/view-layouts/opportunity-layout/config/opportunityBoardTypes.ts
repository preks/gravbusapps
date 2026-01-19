/**
 * Generic types for Opportunity Board
 * Works with both Customer and Investment Opportunities
 */

export interface GenericOpportunityForBoard {
  id: string
  name: string | null
  estimatedAmount?: number | null
  forecastedProfitAmount?: number | null
  currency?: { code?: string } | null
  closeDate?: string | null
  createdAt?: string | null
  account?: {
    id: string
    name: string
    pictureThumbnail?: string | null
    pictureThumbnailUrl?: string | null
  } | null
  ownerEmployee?: {
    id: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    pictureThumbnail?: string | null
  } | null
  opportunityPipelineStage?: {
    id: string
    code?: string
    value?: string
  } | null
  // CRM-specific
  salesPipelineStageRef?: string | null
  // IRM-specific
  opportunityPipelineStageRef?: string | null
}

export interface OpportunityBoardConfig {
  // Pipeline catalog names
  pipelineCatalog: string // e.g., 'CustomerOpportunityPipeline' | 'InvestmentOpportunityPipeline'
  pipelineStageCatalog: string // e.g., 'CustomerOpportunityPipelineStage' | 'InvestmentOpportunityPipelineStage'

  // Opportunity type for employee selector
  opportunityType: 'CustomerOpportunity' | 'InvestmentOpportunity'

  // Process configuration for stage transitions
  processConfig?: {
    domain: string // e.g., 'customer-relations' | 'investment-relations'
    processName: string // e.g., 'transitionCustomerOpportunity' | 'transitionInvestmentOpportunity'
    buildPayload: (opportunityId: string, targetStageRef: string) => Record<string, any>
  }

  // Optional filters
  defaultFilter?: 'my' | 'all' | 'selected'

  // Custom rendering
  formatCurrency?: (amount: number) => string

  // Query builder
  buildQueryVariables: (filters: {
    pipelineId?: string
    ownerEmployeeIds?: string[]
    additionalFilters?: Record<string, any>
  }) => any
}

export interface OpportunityBoardFilters {
  selectedPipelineId: string
  opportunityFilter: 'my' | 'all' | 'selected'
  selectedEmployeeIds: string[]
  search?: string
}
