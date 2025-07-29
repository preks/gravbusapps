import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentPortfolioData } from '../queries/InvestmentPortfolioQueries';
import { InvestmentSummary, InvestmentPortfolioKPIs, InvestmentQueryVariables } from '../types';

export interface EnhancedInvestmentSummary extends InvestmentSummary {
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  profitLoss: number;
  investmentAge: number;
}

export const useInvestmentPortfolioIntegration = (context: BusinessAppContextProps) => {
  const [investments, setInvestments] = useState<EnhancedInvestmentSummary[]>([]);
  const [kpis, setKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    averageROI: 0,
    activeInvestments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentPortfolioData } = useGetInvestmentPortfolioData(context);

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

  const calculateInvestmentAge = (acquisitionDate: string): number => {
    if (!acquisitionDate) return 0;
    const today = new Date();
    const acquired = new Date(acquisitionDate);
    const diffTime = Math.abs(today.getTime() - acquired.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  const transformInvestmentData = useCallback((data: any): EnhancedInvestmentSummary[] => {
    return data.Investment.map((investment: any) => ({
      ...investment,
      displayName: investment.name || `Investment ${investment.id.slice(-8)}`,
      statusColor: getStatusColor(investment.investmentStatus?.value),
      riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
      currencyCode: extractCurrencyCode(investment.currency),
      roi: calculateROI(investment.marketValue || 0, investment.initialInvestmentAmount || 0),
      isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
      profitLoss: (investment.marketValue || 0) - (investment.initialInvestmentAmount || 0),
      investmentAge: calculateInvestmentAge(investment.acquisitionDate),
      
      // Catalog data using 'value' field
      accountName: investment.account?.name,
      opportunityName: investment.opportunity?.name,
      investmentGroup: investment.investmentGroup?.value,
      investmentType: investment.investmentType?.value,
      investmentPhase: investment.investmentPhase?.value,
      investmentStatus: investment.investmentStatus?.value,
      investmentRiskLevel: investment.investmentRiskLevel?.value,
      currency: investment.currency?.value,
    }));
  }, []);

  const calculateKPIs = useCallback((data: any, enhancedInvestments: EnhancedInvestmentSummary[]): InvestmentPortfolioKPIs => {
    const aggregate = data.InvestmentAggregate.aggregate;
    
    const totalPortfolioValue = aggregate.sum?.marketValue || 0;
    const totalInvestments = aggregate.count || 0;
    const activeInvestments = enhancedInvestments.filter(inv => inv.isActive).length;
    
    // Calculate average ROI from enhanced investments
    const totalROI = enhancedInvestments.reduce((sum, inv) => sum + inv.roi, 0);
    const averageROI = totalInvestments > 0 ? totalROI / totalInvestments : 0;

    return {
      totalPortfolioValue,
      totalInvestments,
      averageROI,
      activeInvestments
    };
  }, []);

  const loadData = useCallback(async (variables: InvestmentQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchInvestmentPortfolioData(variables);
      const enhancedInvestments = transformInvestmentData(data);
      const calculatedKPIs = calculateKPIs(data, enhancedInvestments);
      
      setInvestments(enhancedInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestmentPortfolioData, transformInvestmentData, calculateKPIs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    investments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 