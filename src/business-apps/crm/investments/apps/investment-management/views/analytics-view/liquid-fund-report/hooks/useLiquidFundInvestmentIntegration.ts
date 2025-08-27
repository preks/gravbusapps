import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, LiquidFundInvestment } from '@/common/data/investment';

export interface EnhancedLiquidFundInvestmentSummary {
  id: string;
  investment: Investment;
  liquidFundInvestment?: LiquidFundInvestment;
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

export interface LiquidFundInvestmentKPIs {
  totalFundValue: number;
  averageInterestRate: number;
  maturingSoon: number;
  earlyTerminationAllowed: number;
}

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active': return 'green';
    case 'inactive': return 'red';
    case 'pending': return 'orange';
    default: return 'blue';
  }
};

const getPhaseColor = (phase: string): string => {
  switch (phase?.toLowerCase()) {
    case 'acquisition': return 'blue';
    case 'development': return 'orange';
    case 'mature': return 'green';
    case 'exit': return 'red';
    default: return 'default';
  }
};

const getRiskColor = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'green';
    case 'medium': return 'orange';
    case 'high': return 'red';
    default: return 'default';
  }
};

const getFrequencyColor = (frequency: string): string => {
  switch (frequency?.toLowerCase()) {
    case 'monthly': return 'green';
    case 'quarterly': return 'blue';
    case 'semi-annually': return 'orange';
    case 'annually': return 'purple';
    default: return 'default';
  }
};

const extractCurrencyCode = (currency: any): string => {
  if (!currency) return 'EUR';
  
  // Try to get currency from different possible fields
  let currencyValue = currency.description || currency.code || currency.id || currency.name || currency;
  
  // If it's a string, try to extract currency code
  if (typeof currencyValue === 'string') {
    // Handle format like "Currency:v1:EUR"
    if (currencyValue.includes(':')) {
      const parts = currencyValue.split(':');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length === 3) {
        return lastPart.toUpperCase();
      }
    }
    
    // Handle common currency names
    const currencyMap: { [key: string]: string } = {
      'european euro': 'EUR',
      'euro': 'EUR',
      'us dollar': 'USD',
      'dollar': 'USD',
      'british pound': 'GBP',
      'pound': 'GBP',
      'japanese yen': 'JPY',
      'yen': 'JPY',
      'swiss franc': 'CHF',
      'franc': 'CHF',
      'canadian dollar': 'CAD',
      'australian dollar': 'AUD'
    };
    
    const normalizedValue = currencyValue.toLowerCase().trim();
    if (currencyMap[normalizedValue]) {
      return currencyMap[normalizedValue];
    }
    
    // If it's already a 3-letter code, return it
    if (currencyValue.length === 3) {
      return currencyValue.toUpperCase();
    }
  }
  
  // Default fallback
  return 'EUR';
};

export const useLiquidFundInvestmentIntegration = (context: BusinessAppContextProps, searchTerm: string = '') => {
  const [liquidFundInvestments, setLiquidFundInvestments] = useState<EnhancedLiquidFundInvestmentSummary[]>([]);
  const [kpis, setKpis] = useState<LiquidFundInvestmentKPIs>({
    totalFundValue: 0,
    averageInterestRate: 0,
    maturingSoon: 0,
    earlyTerminationAllowed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(context);

  const transformLiquidFundData = useCallback((investments: Investment[]): EnhancedLiquidFundInvestmentSummary[] => {
    return investments
      .filter(investment => investment.liquidFundInvestment && Object.keys(investment.liquidFundInvestment).length > 0)
      .map(investment => {
        const liquidFundInvestment = investment.liquidFundInvestment!;
        const daysToMaturity = liquidFundInvestment.maturityDate ? 
          Math.ceil((new Date(liquidFundInvestment.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
          0;
        
        return {
          id: liquidFundInvestment.id,
          investment,
          liquidFundInvestment,
          displayName: investment.displayName || investment.name || liquidFundInvestment.accountNumber || 'Unknown Fund',
          currencyCode: extractCurrencyCode(investment.currency),
          statusColor: getStatusColor(investment.investmentStatus?.value || ''),
          phaseColor: getPhaseColor(investment.investmentPhase?.value || ''),
          riskColor: getRiskColor(investment.investmentRiskLevel?.value || ''),
          fundTypeName: liquidFundInvestment.interestPaymentFrequency?.description || 'Unknown',
          fundTypeColor: getFrequencyColor(liquidFundInvestment.interestPaymentFrequency?.description || ''),
          daysToMaturity,
          isNearMaturity: daysToMaturity <= 30 && daysToMaturity > 0
        };
      });
  }, []);

  const calculateKPIs = useCallback((liquidFundInvestments: EnhancedLiquidFundInvestmentSummary[]): LiquidFundInvestmentKPIs => {
    const totalFundValue = liquidFundInvestments.reduce((sum, fund) => 
      sum + (fund.investment.investmentMarketValue || fund.investment.bookValue || 0), 0
    );
    
    const totalInterestRate = liquidFundInvestments.reduce((sum, fund) => 
      sum + (fund.liquidFundInvestment?.interestRate || 0), 0
    );
    const averageInterestRate = liquidFundInvestments.length > 0 ? totalInterestRate / liquidFundInvestments.length : 0;
    
    const maturingSoon = liquidFundInvestments.filter(fund => 
      fund.isNearMaturity
    ).length;
    
    const earlyTerminationAllowed = liquidFundInvestments.filter(fund => 
      fund.liquidFundInvestment?.earlyTerminationAllowed || false
    ).length;

    return {
      totalFundValue,
      averageInterestRate,
      maturingSoon,
      earlyTerminationAllowed
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestments();
      const enhancedLiquidFundInvestments = transformLiquidFundData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedLiquidFundInvestments);
      
      setLiquidFundInvestments(enhancedLiquidFundInvestments);
      setKpis(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestments, transformLiquidFundData, calculateKPIs]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    liquidFundInvestments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 