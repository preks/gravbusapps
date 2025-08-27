// Local types for the Investment Relations Account View
export interface AccountViewFilters {
  industryClass?: string[];
  companySize?: string[];
  legalForm?: string[];
  geographicPresence?: string[];
  ownerEmployee?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface AccountViewSortConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface AccountViewPagination {
  page: number;
  pageSize: number;
  total: number;
}

