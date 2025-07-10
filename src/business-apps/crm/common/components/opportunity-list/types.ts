export interface Opportunity {
  id: string;
  name: string;
  description?: string;
  estimatedAmount?: number;
  winningChance?: number;
  closeDate?: string;
  stage?: string;
  salesPipeline?: {
    id: string;
    value: string;
    code: string;
  };
  salesPipelineStage?: {
    id: string;
    value: string;
    code: string;
  };
  salesOpportunityStatus?: {
    id: string;
    value: string;
    code: string;
  };
  salesLeadSource?: {
    id: string;
    value: string;
    code: string;
  };
  currency?: {
    id: string;
    value: string;
    code: string;
  };
  account?: {
    id: string;
    name: string;
  };
  accountId?: string;
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    pictureThumbnail?: string;
  };
  sourceApp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpportunityStatisticsData {
  recentOpportunities: number;
  totalOpportunityValue: number;
  averageWinRate: number;
  totalOpportunitiesThisYear: number;
  mostCommonStage: string;
  mostCommonPipeline: string;
}

export interface UseOpportunityListDataReturn {
  opportunities: Opportunity[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number, additionalFilters?: any) => Promise<void>;
  retry: () => void;
}

export interface UseOpportunityStatisticsReturn {
  statistics: OpportunityStatisticsData;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} 