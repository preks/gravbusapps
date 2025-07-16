import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetTravelRegionRulesData, TravelRegionRuleData, TravelRegionRuleQueryVariables } from '../queries/TravelRegionRuleQueries';

export interface EnhancedTravelRegionRule {
  id: string;
  name: string;
  code: string;
  region: string;
  country: string;
  allowanceType: 'daily' | 'hourly' | 'meal' | 'accommodation';
  amount: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ruleOrder: number;
  details: {
    id: string;
    amount: number;
    country: string;
    currency: string;
    countryRef?: string;
    currencyRef?: string;
  }[];
}

export const useTravelRegionRulesIntegration = (context: BusinessAppContextProps) => {
  const [travelRegionRules, setTravelRegionRules] = useState<EnhancedTravelRegionRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchTravelRegionRules } = useGetTravelRegionRulesData(context);

  // Extract currency code from NEWWORK format (e.g., "Currency:v1:EUR" -> "EUR")
  const extractCurrencyCode = useCallback((currencyId: string): string => {
    if (!currencyId) return 'EUR';
    return currencyId.split(':').pop() || 'EUR';
  }, []);

  // Transform GraphQL data to enhanced UI format
  const transformTravelRegionRuleData = useCallback((data: TravelRegionRuleData[]): EnhancedTravelRegionRule[] => {
    return data.map(rule => {
      // Extract primary allowance from first detail (if available)
      const primaryDetail = rule.allowanceRegionRuleDetail?.[0];
      const amount = primaryDetail?.amount || 0;
      
      // Extract currency from detail
      const currencyCode = primaryDetail?.currency?.value || 
                          extractCurrencyCode(primaryDetail?.currencyRef || '') || 
                          'EUR';
      
      // Extract country from detail
      const country = primaryDetail?.country?.value || 'Unknown';
      
      // Determine region from country or rule name
      const region = determineRegion(country, rule.name);
      
      // Determine allowance type from rule name
      const allowanceType = determineAllowanceType(rule.name, rule.code);
      
      // Check if rule is currently active
      const now = new Date();
      const activeFrom = rule.activeFrom ? new Date(rule.activeFrom) : null;
      const activeTo = rule.activeTo ? new Date(rule.activeTo) : null;
      const isActive = !rule.isDeleted && 
        (!activeFrom || activeFrom <= now) && 
        (!activeTo || activeTo >= now);

      return {
        id: rule.id,
        name: rule.name,
        code: rule.code,
        region,
        country,
        allowanceType,
        amount,
        currency: currencyCode,
        effectiveFrom: rule.activeFrom || rule.createdAt,
        effectiveTo: rule.activeTo,
        isActive,
        description: `${rule.name} - Order: ${rule.ruleOrder}`,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        ruleOrder: rule.ruleOrder,
        details: rule.allowanceRegionRuleDetail.map(detail => ({
          id: detail.id,
          amount: detail.amount,
          country: detail.country?.value || 'Unknown',
          currency: detail.currency?.value || extractCurrencyCode(detail.currencyRef || '') || 'EUR',
          countryRef: detail.countryRef,
          currencyRef: detail.currencyRef
        }))
      };
    });
  }, [extractCurrencyCode]);

  // Determine region from country name
  const determineRegion = (country: string, ruleName: string): string => {
    const countryLower = country.toLowerCase();
    const ruleLower = ruleName.toLowerCase();
    
    // European countries
    if (['germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'austria', 'switzerland'].some(c => countryLower.includes(c))) {
      return 'Western Europe';
    }
    if (['poland', 'czech', 'hungary', 'slovakia', 'romania', 'bulgaria'].some(c => countryLower.includes(c))) {
      return 'Eastern Europe';
    }
    
    // North America
    if (['united states', 'canada', 'usa', 'america'].some(c => countryLower.includes(c))) {
      return 'North America';
    }
    
    // Asia
    if (['japan', 'china', 'korea', 'singapore', 'india', 'thailand'].some(c => countryLower.includes(c))) {
      return 'Asia';
    }
    
    // Check rule name for region hints
    if (ruleLower.includes('europe')) return 'Europe';
    if (ruleLower.includes('america') || ruleLower.includes('usa')) return 'North America';
    if (ruleLower.includes('asia')) return 'Asia';
    
    return 'International'; // Default
  };

  // Determine allowance type from rule name or code
  const determineAllowanceType = (name: string, code: string): 'daily' | 'hourly' | 'meal' | 'accommodation' => {
    const nameAndCode = `${name} ${code}`.toLowerCase();
    
    if (nameAndCode.includes('meal') || nameAndCode.includes('food') || nameAndCode.includes('lunch') || nameAndCode.includes('dinner')) {
      return 'meal';
    } else if (nameAndCode.includes('accommodation') || nameAndCode.includes('hotel') || nameAndCode.includes('lodging')) {
      return 'accommodation';
    } else if (nameAndCode.includes('hourly') || nameAndCode.includes('hour')) {
      return 'hourly';
    }
    
    return 'daily'; // Default to daily allowance
  };

  const loadTravelRegionRules = useCallback(async (variables: TravelRegionRuleQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchTravelRegionRules(variables);
      
      if (result?.AllowanceRegionRule) {
        const enhancedRules = transformTravelRegionRuleData(result.AllowanceRegionRule);
        setTravelRegionRules(enhancedRules);
        setTotalCount(result.AllowanceRegionRuleAggregate?.aggregate?.count || 0);
      } else {
        setTravelRegionRules([]);
        setTotalCount(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load travel region rules';
      setError(errorMessage);
      setTravelRegionRules([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchTravelRegionRules, transformTravelRegionRuleData]);

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      loadTravelRegionRules();
    }
  }, [context.accessToken, loadTravelRegionRules]);

  const searchTravelRegionRules = useCallback(async (searchTerm: string, variables: TravelRegionRuleQueryVariables = {}) => {
    await loadTravelRegionRules({
      ...variables,
      search: searchTerm
    });
  }, [loadTravelRegionRules]);

  const refetch = useCallback(() => {
    loadTravelRegionRules();
  }, [loadTravelRegionRules]);

  return {
    travelRegionRules,
    isLoading,
    error,
    totalCount,
    loadTravelRegionRules,
    searchTravelRegionRules,
    refetch
  };
}; 