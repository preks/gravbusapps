// GraphQL Response Types
export interface PrivateEquityInvestmentResponse {
  PrivateEquityInvestment: PrivateEquityInvestmentSummary[];
  PrivateEquityInvestmentAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface PrivateEquityInvestmentSummary {
  id: string;
  investmentId: string;
  investmentRoleRef?: string;
  investmentRole?: {
    id: string;
    value: string;
  };
  activeFrom?: string;
  activeTo?: string;
  createdAt?: string;
  
  // From Investment table
  investment: {
    id: string;
    name: string;
    accountId: string;
    opportunityId?: string;
    ownerEmployeeId: string;
    acquisitionDate?: string;
    exitDate?: string;
    plannedExitDate?: string;
    bookValue?: number;
    marketValue?: number;
    initialInvestmentAmount?: number;
    totalInvestmentAmount?: number;
    stakePercent?: number;
    debtFinancing?: number;
    leverageRatio?: number;
    notesSummary?: string;
    investmentGroup?: {
      id: string;
      value: string;
    };
    investmentType?: {
      id: string;
      value: string;
    };
    investmentPhase?: {
      id: string;
      value: string;
    };
    investmentStatus?: {
      id: string;
      value: string;
    };
    investmentRiskLevel?: {
      id: string;
      value: string;
    };
    currency?: {
      id: string;
      value: string;
    };
    account?: {
      id: string;
      name: string;
    };
    opportunity?: {
      id: string;
      name: string;
    };
  };
}

export interface PrivateEquityInvestmentKPIs {
  totalPEValue: number;
  investmentCount: number;
  averageStake: number;
  activeDeals: number;
}

export interface PrivateEquityInvestmentQueryVariables {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any;
} 