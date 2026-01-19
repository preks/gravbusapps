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
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
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
  type?: {
    id: string
    value: string
    code: string
  }
  typeRef?: string
  isDeleted?: boolean
  recordState?: string
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
  // Previous period data (30 days ago)
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
