import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, EquityInvestment } from '@/common/data/investment';

export interface EnhancedEquityInvestmentSummary {
  id: string;
  investment: Investment;
  equityInvestment?: EquityInvestment;
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  ebitdaMargin: number;
  roleColor: string;
}

export interface EquityInvestmentKPIs {
  totalEquityValue: number;
  averageCompanyValuation: number;
  totalEbitda: number;
  numberOfEquityInvestments: number;
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

  const { fetchInvestments } = useGetInvestments(context);

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

  const transformEquityInvestmentData = useCallback((investments: Investment[]): EnhancedEquityInvestmentSummary[] => {
    return investments
      .filter(investment => investment.equityInvestment && Object.keys(investment.equityInvestment).length > 0)
      .map(investment => {
        const equityInvestment = investment.equityInvestment!;
        return {
          id: equityInvestment.id,
          investment,
          equityInvestment,
          // Enhanced fields
          displayName: investment.displayName || investment.name || `Equity Investment ${equityInvestment.id.slice(-8)}`,
          statusColor: getStatusColor(investment.investmentStatus?.value),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
          currencyCode: extractCurrencyCode(investment.currency),
          roi: calculateROI(investment.investmentMarketValue || 0, investment.initialInvestmentAmount || 0),
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          ebitdaMargin: calculateEbitdaMargin(equityInvestment.ebitdaAmount || 0, equityInvestment.turnoverAmount || 0),
          roleColor: getRoleColor('lead investor'), // Default role since it's not in the centralized structure
        };
      });
  }, []);

  const calculateKPIs = useCallback((equityInvestments: EnhancedEquityInvestmentSummary[]): EquityInvestmentKPIs => {
    const totalEquityValue = equityInvestments.reduce((sum, item) => sum + (item.investment.investmentMarketValue || 0), 0);
    const averageCompanyValuation = equityInvestments.length > 0 ? totalEquityValue / equityInvestments.length : 0;
    const totalEbitda = equityInvestments.reduce((sum, item) => sum + (item.equityInvestment?.ebitdaAmount || 0), 0);
    const numberOfEquityInvestments = equityInvestments.length;

    return {
      totalEquityValue,
      averageCompanyValuation,
      totalEbitda,
      numberOfEquityInvestments
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
      const enhancedEquityInvestments = transformEquityInvestmentData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedEquityInvestments);
      
      setEquityInvestments(enhancedEquityInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestments, transformEquityInvestmentData, calculateKPIs]);

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