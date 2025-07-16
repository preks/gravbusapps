import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetMileageRulesData, MileageRuleData, MileageRuleQueryVariables } from '../queries/MileageRuleQueries';

export interface EnhancedMileageRule {
  id: string;
  name: string;
  code: string;
  vehicleType: string;
  ratePerKm: number;
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
    limitFrom?: number;
    limitTo?: number;
    detailOrder: number;
  }[];
}

export const useMileageRulesIntegration = (context: BusinessAppContextProps) => {
  const [mileageRules, setMileageRules] = useState<EnhancedMileageRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchMileageRules } = useGetMileageRulesData(context);

  // Transform GraphQL data to enhanced UI format
  const transformMileageRuleData = useCallback((data: MileageRuleData[]): EnhancedMileageRule[] => {
    return data.map(rule => {
      // Extract primary rate from first detail (if available)
      const primaryDetail = rule.mileageRuleDetail?.[0];
      const ratePerKm = primaryDetail?.amount || 0;
      
      // Extract currency from detail or default to EUR
      const currency = 'EUR'; // This would come from the currency field in the detail
      
      // Determine vehicle type from rule name or code
      const vehicleType = determineVehicleType(rule.name, rule.code);
      
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
        vehicleType,
        ratePerKm,
        currency,
        effectiveFrom: rule.activeFrom || rule.createdAt,
        effectiveTo: rule.activeTo,
        isActive,
        description: `${rule.name} - Order: ${rule.ruleOrder}`,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        ruleOrder: rule.ruleOrder,
        details: rule.mileageRuleDetail.map(detail => ({
          id: detail.id,
          amount: detail.amount,
          limitFrom: detail.limitFrom,
          limitTo: detail.limitTo,
          detailOrder: detail.detailOrder
        }))
      };
    });
  }, []);

  // Determine vehicle type from rule name or code
  const determineVehicleType = (name: string, code: string): string => {
    const nameAndCode = `${name} ${code}`.toLowerCase();
    
    if (nameAndCode.includes('motorcycle') || nameAndCode.includes('bike')) {
      return 'Motorcycle';
    } else if (nameAndCode.includes('electric') || nameAndCode.includes('ev')) {
      return 'Electric Car';
    } else if (nameAndCode.includes('car') || nameAndCode.includes('vehicle')) {
      return 'Car';
    } else if (nameAndCode.includes('truck') || nameAndCode.includes('van')) {
      return 'Truck';
    }
    
    return 'Car'; // Default to Car
  };

  const loadMileageRules = useCallback(async (variables: MileageRuleQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchMileageRules(variables);
      
      if (result?.MileageRule) {
        const enhancedRules = transformMileageRuleData(result.MileageRule);
        setMileageRules(enhancedRules);
        setTotalCount(result.MileageRuleAggregate?.aggregate?.count || 0);
      } else {
        setMileageRules([]);
        setTotalCount(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mileage rules';
      setError(errorMessage);
      setMileageRules([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchMileageRules, transformMileageRuleData]);

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      loadMileageRules();
    }
  }, [context.accessToken, loadMileageRules]);

  const searchMileageRules = useCallback(async (searchTerm: string, variables: MileageRuleQueryVariables = {}) => {
    await loadMileageRules({
      ...variables,
      search: searchTerm
    });
  }, [loadMileageRules]);

  const refetch = useCallback(() => {
    loadMileageRules();
  }, [loadMileageRules]);

  return {
    mileageRules,
    isLoading,
    error,
    totalCount,
    loadMileageRules,
    searchMileageRules,
    refetch
  };
}; 