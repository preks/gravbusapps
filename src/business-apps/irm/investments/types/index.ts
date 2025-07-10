import { BusinessAppContextProps } from '../../../../common/BusinessAppContext';

// Base investment types
export type InvestmentType = 
  | 'STRATEGIC_INVESTMENTS'
  | 'REAL_ESTATE'
  | 'PRIVATE_EQUITY'
  | 'LIQUID_FUNDS';

export type InvestmentSubType = 
  // Strategic Investments
  | 'MAJORITY_STAKE'
  | 'MINORITY_STAKE'
  | 'VENTURE_CAPITAL'
  | 'CO_INVESTMENTS'
  // Real Estate
  | 'PROPERTIES'
  | 'PROJECT_DEVELOPMENT'
  | 'MEZZANINE_LOAN'
  | 'REAL_ESTATE_OTHER'
  // Private Equity (no subtypes defined)
  | 'PRIVATE_EQUITY_GENERAL'
  // Liquid Funds
  | 'BANK'
  | 'STRATEGIC_LIQUIDITY';

export type InvestmentPhase = 
  | 'SOURCING'
  | 'DUE_DILIGENCE'
  | 'NEGOTIATION'
  | 'EXECUTION'
  | 'MONITORING'
  | 'EXIT';

export type Currency = {
  id: string;
  code: string;
  value: string;
  translations?: Array<{
    localeCode: string;
    value: string;
  }>;
};

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  subType: InvestmentSubType;
  phase: InvestmentPhase;
  shareholdingPercentage?: number;
  turnover?: number;
  ebitda?: number;
  expectedRoi?: number;
  bookValue: number;
  currency: Currency;
  role?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  additionalMetrics?: Record<string, any>;
}

export interface InvestmentTypeGroup {
  type: InvestmentType;
  label: string;
  subTypes: Array<{
    subType: InvestmentSubType;
    label: string;
    investments: Investment[];
    totalAllocation: number;
    currency: Currency;
  }>;
  totalAllocation: number;
  currency: Currency;
}

export interface InvestmentFilters {
  type?: InvestmentType[];
  subType?: InvestmentSubType[];
  phase?: InvestmentPhase[];
  shareholdingPercentageMin?: number;
  shareholdingPercentageMax?: number;
  turnoverMin?: number;
  turnoverMax?: number;
  ebitdaMin?: number;
  ebitdaMax?: number;
  expectedRoiMin?: number;
  expectedRoiMax?: number;
  bookValueMin?: number;
  bookValueMax?: number;
  role?: string[];
  isActive?: boolean;
  searchTerm?: string;
}

export interface InvestmentSortConfig {
  field: keyof Investment;
  direction: 'asc' | 'desc';
}

export interface InvestmentMetrics {
  totalInvestments: number;
  totalBookValue: number;
  averageExpectedRoi: number;
  totalTurnover: number;
  totalEbitda: number;
  currency: Currency;
  byType: Record<InvestmentType, {
    count: number;
    totalBookValue: number;
    averageExpectedRoi: number;
  }>;
}

// Component props interfaces
export interface InvestmentsDashboardProps extends BusinessAppContextProps {}

export interface InvestmentTypeOverviewProps {
  investmentGroups: InvestmentTypeGroup[];
  loading?: boolean;
  error?: Error | null;
}

export interface InvestmentsListProps {
  investments: Investment[];
  loading?: boolean;
  error?: Error | null;
  onSort?: (config: InvestmentSortConfig) => void;
  sortConfig?: InvestmentSortConfig;
}

export interface InvestmentFiltersProps {
  filters: InvestmentFilters;
  onFiltersChange: (filters: InvestmentFilters) => void;
  loading?: boolean;
}

export interface InvestmentMetricsProps {
  metrics: InvestmentMetrics;
  loading?: boolean;
  error?: Error | null;
}

export interface InvestmentCardProps {
  investment: Investment;
  showMetrics?: boolean;
  compact?: boolean;
}

// API response types
export interface InvestmentApiResponse {
  investments: Investment[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InvestmentCatalogEntry {
  id: string;
  code: string;
  value: string;
  type: string;
  translations?: Array<{
    localeCode: string;
    value: string;
  }>;
}

// Hook return types
export interface UseInvestmentDataReturn {
  investments: Investment[];
  investmentGroups: InvestmentTypeGroup[];
  metrics: InvestmentMetrics;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export interface UseInvestmentFiltersReturn {
  filters: InvestmentFilters;
  setFilters: (filters: InvestmentFilters) => void;
  updateFilter: <K extends keyof InvestmentFilters>(key: K, value: InvestmentFilters[K]) => void;
  clearFilters: () => void;
  sortConfig: InvestmentSortConfig | null;
  setSortConfig: (config: InvestmentSortConfig | null) => void;
}

export interface UseInvestmentCatalogsReturn {
  investmentTypes: InvestmentCatalogEntry[];
  investmentSubTypes: InvestmentCatalogEntry[];
  investmentPhases: InvestmentCatalogEntry[];
  currencies: Currency[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}