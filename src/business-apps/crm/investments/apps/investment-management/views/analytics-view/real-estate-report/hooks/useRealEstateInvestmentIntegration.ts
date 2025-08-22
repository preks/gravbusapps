import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, RealEstateInvestment } from '@/common/data/investment';

export interface EnhancedRealEstateInvestmentSummary {
  id: string;
  investment: Investment;
  realEstateInvestment?: RealEstateInvestment;
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

export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number;
  averageOccupancyRate: number;
  totalUnits: number;
  totalAnnualExpenses: number;
}

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active': return 'green';
    case 'inactive': return 'red';
    case 'pending': return 'orange';
    case 'sold': return 'blue';
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
    case 'commercial': return 'green';
    case 'industrial': return 'orange';
    case 'mixed-use': return 'purple';
    case 'land': return 'brown';
    default: return 'gray';
  }
};

const getOccupancyColor = (occupancy: string): string => {
  switch (occupancy?.toLowerCase()) {
    case 'occupied': return 'green';
    case 'vacant': return 'red';
    case 'partially occupied': return 'orange';
    case 'under renovation': return 'blue';
    default: return 'gray';
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

const calculateROI = (marketValue: number, initialInvestment: number): number => {
  if (!initialInvestment || initialInvestment === 0) return 0;
  return ((marketValue - initialInvestment) / initialInvestment) * 100;
};

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

  const { fetchInvestments } = useGetInvestments(context);

  const transformRealEstateData = useCallback((investments: Investment[]): EnhancedRealEstateInvestmentSummary[] => {
    return investments
      .filter(investment => investment.realEstateInvestment && Object.keys(investment.realEstateInvestment).length > 0)
      .map(investment => {
        const realEstateInvestment = investment.realEstateInvestment!;
        
        // Build full address
        const addressParts = [
          realEstateInvestment.streetAddress,
          realEstateInvestment.city,
          realEstateInvestment.state,
          realEstateInvestment.postalCode,
          realEstateInvestment.country?.description
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');
        
        return {
          id: realEstateInvestment.id,
          investment,
          realEstateInvestment,
          displayName: investment.displayName || investment.name || fullAddress || `Real Estate Investment ${realEstateInvestment.id.slice(-8)}`,
          statusColor: getStatusColor(investment.investmentStatus?.value),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value),
          currencyCode: extractCurrencyCode(investment.currency),
          roi: calculateROI(investment.investmentMarketValue || 0, investment.initialInvestmentAmount || 0),
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          fullAddress,
          propertyTypeColor: getPropertyTypeColor(realEstateInvestment.propertyType?.description),
          occupancyStatus: realEstateInvestment.occupancyStatus?.description || 'Unknown',
          occupancyColor: getOccupancyColor(realEstateInvestment.occupancyStatus?.description)
        };
      });
  }, []);

  const calculateKPIs = useCallback((realEstateInvestments: EnhancedRealEstateInvestmentSummary[]): RealEstateInvestmentKPIs => {
    const totalPropertyValue = realEstateInvestments.reduce((sum, item) => 
      sum + (item.investment.investmentMarketValue || 0), 0
    );
    
    const totalUnits = realEstateInvestments.reduce((sum, item) => 
      sum + (item.realEstateInvestment?.numberOfUnits || 0), 0
    );
    
    const totalAnnualExpenses = realEstateInvestments.reduce((sum, item) => 
      sum + (item.realEstateInvestment?.annualExpenses || 0), 0
    );
    
    // Calculate average occupancy rate
    const occupancyRates = realEstateInvestments
      .map(item => item.realEstateInvestment?.occupancyRate || 0)
      .filter(rate => rate > 0);
    const averageOccupancyRate = occupancyRates.length > 0 
      ? occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length 
      : 0;

    return {
      totalPropertyValue,
      averageOccupancyRate,
      totalUnits,
      totalAnnualExpenses
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
      const enhancedRealEstateInvestments = transformRealEstateData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedRealEstateInvestments);
      
      setRealEstateInvestments(enhancedRealEstateInvestments);
      setKPIs(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestments, transformRealEstateData, calculateKPIs]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    realEstateInvestments,
    kpis,
    isLoading,
    error,
    refetch: loadData
  };
}; 