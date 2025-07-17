export interface Account {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
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
  annualRevenue?: number;
  numberOfEmployees?: number;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
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
  loadPage: (page: number, pageSize?: number, additionalFilters?: any) => Promise<void>;
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