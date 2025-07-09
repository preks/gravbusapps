import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetEquityInvestmentData } from '../queries/EquityInvestmentQueries';
import { EquityInvestmentSummary, EquityInvestmentKPIs, EquityInvestmentQueryVariables } from '../types';

export interface EnhancedEquityInvestmentSummary extends EquityInvestmentSummary {
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  ebitdaMargin: number;
  roleColor: string;
}

export const useEquityInvestmentIntegration = (context: BusinessAppContextProps) => {
  const [equityInvestments, setEquityInvestments] = useState<EnhancedEquityInvestmentSummary[]>([]);
  const [kpis, setKPIs] = useState<EquityInvestmentKPIs>({
    totalEquityValue: 0,
    averageCompanyValuation: 0,
    totalEbitda: 0,
    numberOfEquityInvestments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchEquityInvestmentData } = useGetEquityInvestmentData(context);

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

  const calculateROI = (marketValue: number, initialInvestment: number): number => {
    if (!initialInvestment || initialInvestment === 0) return 0;
    return ((marketValue - initialInvestment) / initialInvestment) * 100;
  };

  const calculateEbitdaMargin = (ebitda: number, turnover: number): number => {
    if (!turnover || turnover === 0) return 0;
    return (ebitda / turnover) * 100;
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'green';
      case 'pending': return 'orange';
      case 'exited': return 'red';
      case 'liquidated': return 'blue';
      default: return 'gray';
    }
  };

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      case 'very high': return 'volcano';
      default: return 'gray';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role?.toLowerCase()) {
      case 'lead investor': return 'gold';
      case 'co-investor': return 'blue';
      case 'strategic investor': return 'purple';
      case 'minority investor': return 'cyan';
      default: return 'gray';
    }
  };

  const transformEquityInvestmentData = useCallback((data: any): EnhancedEquityInvestmentSummary[] => {
    return data.EquityInvestment.map((equity: any) => {
      const investment = equity.investment;
      return {
        ...equity,
        // Enhanced fields
        displayName: investment.name || `Equity Investment ${equity.id.slice(-8)}`,
        statusColor: getStatusColor(investment.investmentStatus?.value),
        riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
        currencyCode: extractCurrencyCode(investment.currency || ''),
        roi: calculateROI(investment.marketValue || 0, investment.initialInvestmentAmount || 0),
        isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
        ebitdaMargin: calculateEbitdaMargin(equity.lastReportedEbitda || 0, equity.lastReportedTurnover || 0),
        roleColor: getRoleColor(equity.investmentRole?.value),
      };
    });
  }, []);

  const calculateKPIs = useCallback((data: any): EquityInvestmentKPIs => {
    const aggregate = data.EquityInvestmentAggregate.aggregate;
    const totalEquityValue = aggregate.sum?.currentCompanyValuation || 0;
    const averageCompanyValuation = aggregate.avg?.currentCompanyValuation || 0;
    const totalEbitda = aggregate.sum?.lastReportedEbitda || 0;
    const numberOfEquityInvestments = aggregate.count || 0;

    return {
      totalEquityValue,
      averageCompanyValuation,
      totalEbitda,
      numberOfEquityInvestments
    };
  }, []);

  const loadData = useCallback(async (variables: EquityInvestmentQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchEquityInvestmentData(variables);
      const enhancedEquityInvestments = transformEquityInvestmentData(data);
      const calculatedKPIs = calculateKPIs(data);
      
      setEquityInvestments(enhancedEquityInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchEquityInvestmentData, transformEquityInvestmentData, calculateKPIs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    equityInvestments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 