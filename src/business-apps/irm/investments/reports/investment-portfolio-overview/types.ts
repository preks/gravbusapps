export interface InvestmentSummary {
  id: string;
  name: string;
  accountId: string;
  opportunityId?: string;
  ownerEmployeeId: string;
  investmentGroup?: string;
  investmentType?: string;
  investmentPhase?: string;
  investmentStatus?: string;
  investmentRiskLevel?: string;
  currency?: string;
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
}

export interface InvestmentPortfolioKPIs {
  totalPortfolioValue: number;
  totalInvestments: number;
  averageROI: number;
  activeInvestments: number;
}

export interface InvestmentQueryVariables {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any;
}

export interface InvestmentPortfolioResponse {
  Investment: InvestmentSummary[];
  Investment_aggregate: {
    aggregate: {
      count: number;
    };
  };
} 