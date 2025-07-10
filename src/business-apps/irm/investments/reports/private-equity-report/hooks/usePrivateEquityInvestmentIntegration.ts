import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetPrivateEquityInvestmentData } from '../queries/PrivateEquityInvestmentQueries';
import { PrivateEquityInvestmentSummary, PrivateEquityInvestmentKPIs, PrivateEquityInvestmentQueryVariables } from '../types';

export interface EnhancedPrivateEquityInvestmentSummary extends PrivateEquityInvestmentSummary {
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  stageColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  isDeal: boolean;
  sectorColor: string;
  stakeDisplay: string;
  valueDisplay: string;
  boardSeatsDisplay: string;
}

export const usePrivateEquityInvestmentIntegration = (context: BusinessAppContextProps) => {
  const [privateEquityInvestments, setPrivateEquityInvestments] = useState<EnhancedPrivateEquityInvestmentSummary[]>([]);
  const [kpis, setKPIs] = useState<PrivateEquityInvestmentKPIs>({
    totalPEValue: 0,
    investmentCount: 0,
    averageStake: 0,
    activeDeals: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchPrivateEquityInvestmentData } = useGetPrivateEquityInvestmentData(context);

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

  const getPhaseColor = (phase: string): string => {
    switch (phase?.toLowerCase()) {
      case 'screening': return 'orange';
      case 'due diligence': return 'blue';
      case 'active': return 'green';
      case 'exit': return 'red';
      default: return 'gray';
    }
  };

  const getStageColor = (stage: string): string => {
    switch (stage?.toLowerCase()) {
      case 'seed': return 'purple';
      case 'series a': return 'blue';
      case 'series b': return 'cyan';
      case 'series c': return 'geekblue';
      case 'growth': return 'green';
      case 'mature': return 'gold';
      case 'exit': return 'red';
      default: return 'gray';
    }
  };

  const getSectorColor = (sector: string): string => {
    switch (sector?.toLowerCase()) {
      case 'technology': return 'blue';
      case 'healthcare': return 'green';
      case 'finance': return 'gold';
      case 'consumer': return 'orange';
      case 'industrial': return 'gray';
      case 'energy': return 'red';
      case 'real estate': return 'purple';
      default: return 'default';
    }
  };

  const transformPrivateEquityInvestmentData = useCallback((data: any): EnhancedPrivateEquityInvestmentSummary[] => {
    return data.PrivateEquityInvestment.map((privateEquity: any) => {
      const investment = privateEquity.investment;
      
      return {
        ...privateEquity,
        // Enhanced fields
        displayName: investment.name || `Private Equity Investment ${privateEquity.id.slice(-8)}`,
        statusColor: getStatusColor(investment.investmentStatus?.value),
        riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
        currencyCode: extractCurrencyCode(investment.currency),
        roi: calculateROI(investment.marketValue || 0, investment.initialInvestmentAmount || 0),
        isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
        roleColor: getRoleColor(privateEquity.investmentRole?.value),
        phaseColor: getPhaseColor(investment.investmentPhase?.value),
      };
    });
  }, []);

  const calculateKPIs = useCallback((data: any, enhancedInvestments: EnhancedPrivateEquityInvestmentSummary[]): PrivateEquityInvestmentKPIs => {
    const aggregate = data.PrivateEquityInvestmentAggregate.aggregate;
    
    // Calculate total PE value from market values
    const totalPEValue = enhancedInvestments.reduce((sum, inv) => sum + (inv.investment.marketValue || 0), 0);
    
    // Investment count
    const investmentCount = aggregate.count || 0;
    
    // Calculate average stake
    const investmentsWithStake = enhancedInvestments.filter(inv => inv.investment.stakePercent !== null && inv.investment.stakePercent !== undefined);
    const averageStake = investmentsWithStake.length > 0 
      ? investmentsWithStake.reduce((sum, inv) => sum + (inv.investment.stakePercent || 0), 0) / investmentsWithStake.length
      : 0;
    
    // Active deals
    const activeDeals = enhancedInvestments.filter(inv => inv.isActive).length;

    return {
      totalPEValue,
      investmentCount,
      averageStake,
      activeDeals
    };
  }, []);

  const loadData = useCallback(async (variables: PrivateEquityInvestmentQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchPrivateEquityInvestmentData(variables);
      const enhancedPrivateEquityInvestments = transformPrivateEquityInvestmentData(data);
      const calculatedKPIs = calculateKPIs(data, enhancedPrivateEquityInvestments);
      
      setPrivateEquityInvestments(enhancedPrivateEquityInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchPrivateEquityInvestmentData, transformPrivateEquityInvestmentData, calculateKPIs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    privateEquityInvestments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 