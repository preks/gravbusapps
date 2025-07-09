export interface EquityInvestmentSummary {
  id: string;
  investmentId: string;
  investmentRoleRef?: string;
  investmentRole?: {
    id: string;
    value: string;
  };
  currentCompanyValuation?: number;
  lastReportedTurnover?: number;
  lastReportedEbitda?: number;
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

export interface EquityInvestmentKPIs {
  totalEquityValue: number;
  averageCompanyValuation: number;
  totalEbitda: number;
  numberOfEquityInvestments: number;
}

export interface EquityInvestmentQueryVariables {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any;
}

export interface EquityInvestmentResponse {
  EquityInvestment: EquityInvestmentSummary[];
  EquityInvestmentAggregate: {
    aggregate: {
      count: number;
      sum: {
        currentCompanyValuation: number | null;
        lastReportedEbitda: number | null;
        lastReportedTurnover: number | null;
      };
      avg: {
        currentCompanyValuation: number | null;
        lastReportedEbitda: number | null;
        lastReportedTurnover: number | null;
      };
    };
  };
} 