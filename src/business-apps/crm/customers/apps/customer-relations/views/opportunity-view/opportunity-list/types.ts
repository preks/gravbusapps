import type { CustomerOpportunity } from '@/common/data/customer/types';

export type Opportunity = CustomerOpportunity;

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
