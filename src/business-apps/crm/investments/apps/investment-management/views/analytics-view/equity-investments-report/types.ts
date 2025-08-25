import type { Investment, EquityInvestment } from '@/common/data/investment';

// Re-export the centralized types for convenience
export type { Investment, EquityInvestment } from '@/common/data/investment';

export interface EquityInvestmentSummary {
  id: string;
  investment: Investment;
  equityInvestment?: EquityInvestment;
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