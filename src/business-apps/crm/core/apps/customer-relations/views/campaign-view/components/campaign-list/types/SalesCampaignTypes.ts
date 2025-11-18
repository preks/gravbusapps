export interface SalesCampaignQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  orderBy?: Array<{ [key: string]: 'ASC' | 'DESC' }>
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
  totalCampaigns: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  activeCampaigns: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  completedCampaigns: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  averageDuration: {
    current: number
    changePercent: number
    isPositive: boolean
  }
}

export interface SalesCampaignStatisticsResponse {
  // Current counts
  totalCampaigns: { aggregate: { count: number } }
  activeCampaigns: { aggregate: { count: number } }
  completedCampaigns: { aggregate: { count: number } }

  // Previous year counts for trend calculation
  totalCampaignsPrevious: { aggregate: { count: number } }
  activeCampaignsPrevious: { aggregate: { count: number } }
  completedCampaignsPrevious: { aggregate: { count: number } }

  // Campaigns with duration (current year)
  campaignsWithDuration: Array<{
    startDate: string
    endDate: string
  }>

  // Campaigns with duration (previous year)
  campaignsWithDurationPrevious: Array<{
    startDate: string
    endDate: string
  }>
}
