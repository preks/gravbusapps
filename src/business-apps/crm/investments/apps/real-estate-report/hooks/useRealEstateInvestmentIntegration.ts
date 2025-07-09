import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetRealEstateInvestmentData } from '../queries/RealEstateInvestmentQueries';
import { RealEstateInvestmentSummary, RealEstateInvestmentKPIs, RealEstateInvestmentQueryVariables } from '../types';

export interface EnhancedRealEstateInvestmentSummary extends RealEstateInvestmentSummary {
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  fullAddress: string;
  propertyTypeColor: string;
  occupancyStatus: string;
  occupancyColor: string;
}

export const useRealEstateInvestmentIntegration = (context: BusinessAppContextProps) => {
  const [realEstateInvestments, setRealEstateInvestments] = useState<EnhancedRealEstateInvestmentSummary[]>([]);
  const [kpis, setKPIs] = useState<RealEstateInvestmentKPIs>({
    totalPropertyValue: 0,
    averageOccupancyRate: 0,
    totalUnits: 0,
    totalAnnualExpenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchRealEstateInvestmentData } = useGetRealEstateInvestmentData(context);

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

  const getPropertyTypeColor = (propertyType: string): string => {
    switch (propertyType?.toLowerCase()) {
      case 'residential': return 'blue';
      case 'commercial': return 'purple';
      case 'industrial': return 'orange';
      case 'retail': return 'cyan';
      case 'office': return 'geekblue';
      case 'mixed-use': return 'magenta';
      default: return 'gray';
    }
  };

  const getOccupancyStatus = (occupancyPercent: number): { status: string; color: string } => {
    if (occupancyPercent >= 90) return { status: 'Excellent', color: 'green' };
    if (occupancyPercent >= 75) return { status: 'Good', color: 'lime' };
    if (occupancyPercent >= 50) return { status: 'Average', color: 'orange' };
    if (occupancyPercent >= 25) return { status: 'Poor', color: 'red' };
    return { status: 'Critical', color: 'volcano' };
  };

  const buildFullAddress = (realEstate: any): string => {
    const parts = [
      realEstate.addressLine,
      realEstate.city,
      realEstate.postalCode,
      realEstate.country?.value
    ].filter(Boolean);
    return parts.join(', ');
  };

  const transformRealEstateInvestmentData = useCallback((data: any): EnhancedRealEstateInvestmentSummary[] => {
    return data.RealEstateInvestment.map((realEstate: any) => {
      const investment = realEstate.investment;
      const occupancyInfo = getOccupancyStatus(realEstate.occupancyPercent || 0);
      
      return {
        ...realEstate,
        // Enhanced fields
        displayName: investment.name || `Real Estate Investment ${realEstate.id.slice(-8)}`,
        statusColor: getStatusColor(investment.investmentStatus?.value),
        riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
        currencyCode: extractCurrencyCode(investment.currency),
        roi: calculateROI(investment.marketValue || 0, investment.initialInvestmentAmount || 0),
        isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
        fullAddress: buildFullAddress(realEstate),
        propertyTypeColor: getPropertyTypeColor(realEstate.realEstateType?.value),
        occupancyStatus: occupancyInfo.status,
        occupancyColor: occupancyInfo.color,
      };
    });
  }, []);

  const calculateKPIs = useCallback((data: any, enhancedInvestments: EnhancedRealEstateInvestmentSummary[]): RealEstateInvestmentKPIs => {
    const aggregate = data.RealEstateInvestmentAggregate.aggregate;
    
    // Calculate total property value from market values
    const totalPropertyValue = enhancedInvestments.reduce((sum, inv) => sum + (inv.investment.marketValue || 0), 0);
    
    // Calculate average occupancy rate
    const investmentsWithOccupancy = enhancedInvestments.filter(inv => inv.occupancyPercent !== null && inv.occupancyPercent !== undefined);
    const averageOccupancyRate = investmentsWithOccupancy.length > 0 
      ? investmentsWithOccupancy.reduce((sum, inv) => sum + (inv.occupancyPercent || 0), 0) / investmentsWithOccupancy.length
      : 0;
    
    const totalUnits = aggregate.sum?.numberOfUnits || 0;
    const totalAnnualExpenses = aggregate.sum?.annualExpenses || 0;

    return {
      totalPropertyValue,
      averageOccupancyRate,
      totalUnits,
      totalAnnualExpenses
    };
  }, []);

  const loadData = useCallback(async (variables: RealEstateInvestmentQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchRealEstateInvestmentData(variables);
      const enhancedRealEstateInvestments = transformRealEstateInvestmentData(data);
      const calculatedKPIs = calculateKPIs(data, enhancedRealEstateInvestments);
      
      setRealEstateInvestments(enhancedRealEstateInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchRealEstateInvestmentData, transformRealEstateInvestmentData, calculateKPIs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    realEstateInvestments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 