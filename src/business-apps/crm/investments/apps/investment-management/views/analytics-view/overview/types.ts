export interface InvestmentSummary {}

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

export interface InvestmentPortfolioResponse {}


