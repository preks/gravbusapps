import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { LiquidFundInvestmentRecord } from '../types';

interface LiquidFundInvestmentResponse {
  id: string;
  investmentId: string;
  accountNumber: string;
  earlyTerminationAllowed: boolean;
  interestRate: number;
  maturityDate: string;
  interestPaymentFrequency?: {
    id: string;
    code: string;
    value: string;
  };
  investment?: {
    id: string;
    name: string;
    accountId: string;
    opportunityId: string;
    ownerEmployeeId: string;
    acquisitionDate: string;
    exitDate?: string;
    plannedExitDate?: string;
    notesSummary?: string;
    bookValue: number;
    marketValue: number;
    initialInvestmentAmount: number;
    totalInvestmentAmount: number;
    stakePercent: number;
    debtFinancing: number;
    leverageRatio: number;
    investmentGroup?: {
      id: string;
      code: string;
      value: string;
    };
    investmentType?: {
      id: string;
      code: string;
      value: string;
    };
    investmentPhase?: {
      id: string;
      code: string;
      value: string;
    };
    investmentStatus?: {
      id: string;
      code: string;
      value: string;
    };
    investmentRiskLevel?: {
      id: string;
      code: string;
      value: string;
    };
    currency?: {
      id: string;
      code: string;
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
    ownerEmployee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

const GET_LIQUID_FUND_INVESTMENT_BY_ID = `
  query GetLiquidFundInvestmentById($liquidFundId: uuid!) {
    LiquidFundInvestment(where: { id: { _eq: $liquidFundId } }, limit: 1) {
      id
      investmentId
      accountNumber
      earlyTerminationAllowed
      interestRate
      maturityDate
      interestPaymentFrequency {
        id
        code
        value
      }
      investment {
        id
        name
        accountId
        opportunityId
        ownerEmployeeId
        acquisitionDate
        exitDate
        plannedExitDate
        notesSummary
        bookValue
        marketValue
        initialInvestmentAmount
        totalInvestmentAmount
        stakePercent
        debtFinancing
        leverageRatio
        investmentGroup {
          id
          code
          value
        }
        investmentType {
          id
          code
          value
        }
        investmentPhase {
          id
          code
          value
        }
        investmentStatus {
          id
          code
          value
        }
        investmentRiskLevel {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        account {
          id
          name
        }
        opportunity {
          id
          name
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

const transformToLiquidFundRecord = (data: LiquidFundInvestmentResponse): LiquidFundInvestmentRecord => {
  const investment = data.investment!;
  
  // Calculate metrics from real data
  const initialAmount = investment.initialInvestmentAmount || 0;
  const currentValue = investment.marketValue || investment.bookValue || 0;
  const yearsHeld = investment.acquisitionDate ? 
    (new Date().getTime() - new Date(investment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
  
  const roi = initialAmount > 0 ? ((currentValue - initialAmount) / initialAmount) * 100 : 0;
  const multiple = initialAmount > 0 ? currentValue / initialAmount : 1;
  const annualReturn = yearsHeld > 0 ? (Math.pow(multiple, 1/yearsHeld) - 1) * 100 : 0;
  
  return {
    liquid_fund_investment: {
      id: data.id,
      investment_id: data.investmentId,
      account_number: data.accountNumber,
      early_termination_allowed: data.earlyTerminationAllowed,
      interest_rate: data.interestRate,
      interest_payment_frequency_ref: data.interestPaymentFrequency?.value || 'QUARTERLY',
      maturity_date: data.maturityDate,
    },
    investment: {
      id: investment.id,
      account_id: investment.accountId,
      account_name: investment.account?.name || 'Unknown Account',
      name: investment.name,
      investment_group_ref: investment.investmentGroup?.value || 'LIQUID_FUNDS',
      investment_type_ref: investment.investmentType?.value || 'MONEY_MARKET',
      investment_phase_ref: investment.investmentPhase?.value || 'MONITORING',
      investment_status_ref: investment.investmentStatus?.value || 'ACTIVE',
      investment_risk_level_ref: investment.investmentRiskLevel?.value || 'LOW',
      currency_ref: investment.currency?.id || 'Currency:v1:EUR',
      opportunity_id: investment.opportunityId,
      owner_employee_id: investment.ownerEmployeeId,
      acquisition_date: investment.acquisitionDate,
      exit_date: investment.exitDate,
      planned_exit_date: investment.plannedExitDate,
      notes_summary: investment.notesSummary,
      book_value: investment.bookValue,
      market_value: investment.marketValue,
      initial_investment_amount: investment.initialInvestmentAmount,
      total_investment_amount: investment.totalInvestmentAmount,
      stake_percent: investment.stakePercent,
      debt_financing: investment.debtFinancing,
      leverage_ratio: investment.leverageRatio,
    },
    // Mock company details (with asterisk prefix)
    company_details: {
      name: "*Global Asset Management Ltd.",
      address: {
        street: "*456 Financial District",
        city: "*Frankfurt",
        state: "*Hessen",
        country: "*Germany",
        postal_code: "*60311"
      },
      revenue: 1200000000,
      employees: 850,
      industry: "*Asset Management & Financial Services",
      website: "*https://www.global-asset-management.de",
      phone: "*+49 69 1234 5678",
      email: "*investors@global-asset-management.de",
      founded_year: 1995,
      ceo: "*Michael Weber",
      description: "*Leading European asset management company specializing in liquid funds and money market instruments with focus on capital preservation and liquidity."
    },
    // Calculated metrics (live data, no asterisk)
    metrics: {
      roi_percentage: roi,
      multiple_of_invested_capital: multiple,
      valuation_change_percentage: roi,
      annual_return_percentage: annualReturn,
      years_held: yearsHeld,
      debt_to_equity_ratio: investment.leverageRatio,
      ebitda_multiple: 12.5, // Mock data with asterisk in display
      revenue_multiple: 2.1, // Mock data with asterisk in display
      ownership_value: currentValue,
    }
  };
};

export const useLiquidFundData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [liquidFundData, setLiquidFundData] = useState<LiquidFundInvestmentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLiquidFundData = useCallback(async (liquidFundId: string) => {
    if (!context.accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching liquid fund data for liquidFundId:', liquidFundId);

      const result = await graphqlClient.request<{ LiquidFundInvestment: LiquidFundInvestmentResponse[] }>(
        GET_LIQUID_FUND_INVESTMENT_BY_ID,
        { liquidFundId: liquidFundId }
      );

      console.log('Liquid fund query result:', result);

      if (result.LiquidFundInvestment && result.LiquidFundInvestment.length > 0) {
        const liquidFund = result.LiquidFundInvestment[0];
        console.log('Currency info from GraphQL:', {
          id: liquidFund.investment?.currency?.id,
          code: liquidFund.investment?.currency?.code,
          value: liquidFund.investment?.currency?.value
        });
        
        const transformedData = transformToLiquidFundRecord(liquidFund);
        setLiquidFundData(transformedData);
        console.log('Transformed liquid fund data:', transformedData);
      } else {
        console.log('No liquid fund investment found for liquidFundId:', liquidFundId);
        setError('Liquid fund investment not found');
      }
    } catch (err) {
      console.error('Error fetching liquid fund data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, graphqlClient]);

  useEffect(() => {
    if (investmentId) {
      fetchLiquidFundData(investmentId);
    } else {
      // If no investmentId provided, make sure loading is false
      setIsLoading(false);
      setError(null);
      setLiquidFundData(null);
    }
  }, [investmentId, fetchLiquidFundData]);

  return {
    liquidFundData,
    isLoading,
    error,
    refetch: () => investmentId ? fetchLiquidFundData(investmentId) : Promise.resolve(),
  };
}; 