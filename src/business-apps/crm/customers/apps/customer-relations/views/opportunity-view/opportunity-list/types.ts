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
    objectValue?: any;
  };
  salesPipelineStage?: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  salesOpportunityStatus?: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  salesLeadSource?: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  currency?: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
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

export interface UseOpportunityListDataReturn {
  opportunities: Opportunity[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: "ASC" | "DESC" | "",
    showLoading?: boolean
  ) => Promise<void>;
  retry: () => void;
}
