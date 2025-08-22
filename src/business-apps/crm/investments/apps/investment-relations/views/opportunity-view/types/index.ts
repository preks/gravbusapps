// Local types for the Investment Relations Opportunity View
export interface OpportunityViewFilters {
  stage?: string[];
  type?: string[];
  source?: string[];
  leadSource?: string[];
  ownerEmployee?: string[];
  account?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface OpportunityViewSortConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface OpportunityViewPagination {
  page: number;
  pageSize: number;
  total: number;
}

