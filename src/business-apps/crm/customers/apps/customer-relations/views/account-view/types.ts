export interface Account {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  fax?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactId?: string;
  industry?: {
    id: string;
    value: string;
    objectValue?: any;
  };
  type?: {
    id: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    pictureThumbnail?: string;
  };
  annualRevenue?: string;
  numberOfEmployees?: string;
  foundationDate?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  // Address fields (from addresses array)
  city?: string;
  region?: string;
  country?: string;
  // Computed display field for table (city/region/country)
  location?: string;
  sourceApp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseAccountListDataReturn {
  accounts: Account[];
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
    overrideSortOrder?: "ASC" | "DESC" | ""
  ) => Promise<void>;
  retry: () => void;
}

export interface AccountQueryVariables {
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface AccountListResponse {
  Account: Account[];
  AccountAggregate: {
    aggregate: {
      count: number;
    };
  };
}
