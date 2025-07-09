export interface LiquidFundInvestment {
  id: string;
  investmentId: string;
  accountNumber: string;
  interestRate: number;
  maturityDate: string;
  earlyTerminationAllowed: boolean;
  createdAt: string;
  interestPaymentFrequency: {
    id: string;
    value: string;
  };
  investment: {
    id: string;
    name: string;
    accountId: string;
    opportunityId: string;
    ownerEmployeeId: string;
    acquisitionDate: string;
    exitDate: string;
    plannedExitDate: string;
    bookValue: number;
    marketValue: number;
    initialInvestmentAmount: number;
    totalInvestmentAmount: number;
    stakePercent: number;
    debtFinancing: number;
    leverageRatio: number;
    notesSummary: string;
    investmentGroup: {
      id: string;
      value: string;
    };
    investmentType: {
      id: string;
      value: string;
    };
    investmentPhase: {
      id: string;
      value: string;
    };
    investmentStatus: {
      id: string;
      value: string;
    };
    investmentRiskLevel: {
      id: string;
      value: string;
    };
    currency: {
      id: string;
      value: string;
    };
    account: {
      id: string;
      name: string;
    };
    opportunity: {
      id: string;
      name: string;
    };
  };
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