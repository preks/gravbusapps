import type { Investment, LiquidFundInvestment } from '@/common/data/investment';

// Re-export the centralized types for convenience
export type { Investment, LiquidFundInvestment } from '@/common/data/investment';

export interface LiquidFundInvestmentSummary {
  id: string;
  investment: Investment;
  liquidFundInvestment?: LiquidFundInvestment;
}

export interface LiquidFundInvestmentKPIs {
  totalFundValue: number;
  averageInterestRate: number;
  maturingSoon: number;
  earlyTerminationAllowed: number;
}

export interface LiquidFundInvestmentQueryVariables {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any;
}

export interface LiquidFundInvestmentResponse {
  LiquidFundInvestment: LiquidFundInvestment[];
  LiquidFundInvestmentAggregate: {
    aggregate: {
      count: number;
      sum: {
        interestRate: number | null;
      };
      avg: {
        interestRate: number | null;
      };
    };
  };
}

export interface EnhancedLiquidFundInvestmentSummary extends LiquidFundInvestment {
  displayName: string;
  currencyCode: string;
  statusColor: string;
  phaseColor: string;
  riskColor: string;
  fundTypeName: string;
  fundTypeColor: string;
  daysToMaturity: number;
  isNearMaturity: boolean;
} 