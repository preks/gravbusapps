import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetLiquidFundInvestmentData } from '../queries/LiquidFundInvestmentQueries';
import { LiquidFundInvestment, EnhancedLiquidFundInvestmentSummary, LiquidFundInvestmentKPIs } from '../types';

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
  let currencyValue = currency.value || currency.id || currency.name || currency;
  
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

  const { fetchLiquidFundInvestmentData } = useGetLiquidFundInvestmentData(context);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchLiquidFundInvestmentData({
        limit: 100,
        offset: 0,
        search: searchTerm
      });

      const liquidFundInvestments = data.LiquidFundInvestment || [];
      const aggregateData = data.LiquidFundInvestmentAggregate?.aggregate;

      // Transform data to enhanced format
      const enhancedLiquidFundInvestments: EnhancedLiquidFundInvestmentSummary[] = liquidFundInvestments.map(liquidFund => {
        const daysToMaturity = liquidFund.maturityDate ? 
          Math.ceil((new Date(liquidFund.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
          0;
        
        return {
          ...liquidFund,
          displayName: liquidFund.investment.name || liquidFund.accountNumber || 'Unknown Fund',
          currencyCode: extractCurrencyCode(liquidFund.investment.currency || ''),
          statusColor: getStatusColor(liquidFund.investment.investmentStatus?.value || ''),
          phaseColor: getPhaseColor(liquidFund.investment.investmentPhase?.value || ''),
          riskColor: getRiskColor(liquidFund.investment.investmentRiskLevel?.value || ''),
          fundTypeName: liquidFund.interestPaymentFrequency?.value || 'Unknown',
          fundTypeColor: getFrequencyColor(liquidFund.interestPaymentFrequency?.value || ''),
          daysToMaturity,
          isNearMaturity: daysToMaturity <= 30 && daysToMaturity > 0
        };
      });

      // Calculate KPIs
      const totalFundValue = enhancedLiquidFundInvestments.reduce((sum, fund) => 
        sum + (fund.investment.marketValue || fund.investment.bookValue || 0), 0
      );
      
      const averageInterestRate = aggregateData?.avg?.interestRate || 0;
      
      const maturingSoon = enhancedLiquidFundInvestments.filter(fund => 
        fund.isNearMaturity
      ).length;
      
      const earlyTerminationAllowed = enhancedLiquidFundInvestments.filter(fund => 
        fund.earlyTerminationAllowed
      ).length;

      setLiquidFundInvestments(enhancedLiquidFundInvestments);
      setKpis({
        totalFundValue,
        averageInterestRate,
        maturingSoon,
        earlyTerminationAllowed
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchLiquidFundInvestmentData, searchTerm]);

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