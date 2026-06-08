type OrderByValue = 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
type OrderByField = OrderByValue | { [key: string]: OrderByValue }

export interface SalesCampaignQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  orderBy?: Array<{ [key: string]: OrderByField }>
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  campaignTypes?: string[]
  campaignStatuses?: string[]
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
}

interface CatalogEntry {
  id: string
  value: string
  code: string
}

export interface SalesCampaign {
  id: string
  name?: string
  description?: string
  createdAt: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  version?: number
  startDate?: string
  endDate?: string
  type?: CatalogEntry
  typeRef?: string
  isDeleted?: boolean
  recordState?: string
  customerCampaignSegment?: CatalogEntry
  customerCampaignSegmentRef?: string
  customerPersona?: CatalogEntry
  customerPersonaRef?: string
  customerValuePackFocus?: CatalogEntry
  customerValuePackFocusRef?: string
  customerIndustryFocus?: CatalogEntry
  customerIndustryFocusRef?: string
  country?: CatalogEntry
  countryRef?: string
  budgetAllocated?: number
  pipelineTarget?: number
  expectedWinRate?: number
  expectedRevenueContribution?: number
  ownerEmployee?: {
    id: string
    displayName: string
  }
  customerCampaignStatus?: CatalogEntry
  customerCampaignStatusRef?: string
}

export interface SalesCampaignResponse {
  SalesCampaign: SalesCampaign[]
}

export interface SalesCampaignWithCountResponse {
  SalesCampaign: SalesCampaign[]
  SalesCampaignAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface SalesCampaignStatistics {
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

export interface SalesCampaignStatisticsResponse {
  totalCampaigns: {
    aggregate: {
      count: number
    }
  }
  activeCampaigns: {
    aggregate: {
      count: number
    }
  }
  completedCampaigns: {
    aggregate: {
      count: number
    }
  }
  campaignsWithDuration: Array<{
    startDate: string
    endDate: string
  }>
  previousTotalCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousActiveCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousCompletedCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousCampaignsWithDuration: Array<{
    startDate: string
    endDate: string
  }>
}
