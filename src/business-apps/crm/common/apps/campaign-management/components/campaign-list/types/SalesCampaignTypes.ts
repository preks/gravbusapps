export interface SalesCampaignQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  orderBy?: Array<{ [key: string]: 'ASC' | 'DESC' }>;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  campaignTypes?: string[];
  startDateAfter?: string;
  startDateBefore?: string;
  endDateAfter?: string;
  endDateBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface SalesCampaign {
  id: string;
  name?: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
  startDate?: string;
  endDate?: string;
  type?: {
    id: string;
    value: string;
    code: string;
  };
  typeRef?: string;
  isDeleted?: boolean;
  recordState?: string;
}

export interface SalesCampaignResponse {
  SalesCampaign: SalesCampaign[];
}

export interface SalesCampaignWithCountResponse {
  SalesCampaign: SalesCampaign[];
  SalesCampaignAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface SalesCampaignStatistics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  averageDuration: number;
}

export interface SalesCampaignStatisticsResponse {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  campaignsWithDuration: Array<{
    startDate: string;
    endDate: string;
  }>;
} 