import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetMileageRulesData, MileageRuleData, MileageRuleQueryVariables, useGetCalculationRuleUsage } from '../queries/MileageRuleQueries';
import { getMileageRulePeriodLabel } from '../types/ExpenseEnums';
import dayjs from 'dayjs';

export interface EnhancedMileageRule {
  id: string;
  name: string;
  code: string;
  rulePeriod?: string;
  rulePeriodLabel: string;
  ratePerKm: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  validityPeriod: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number; // New field for calculation rule usage count
  version?: number; // Add version field for optimistic locking
  details: {
    id: string;
    amount: number;
    limitFrom?: number;
    limitTo?: number;
    detailOrder: number;
    activeFrom?: string;
    activeTo?: string;
    version?: number; // Add version field for details too
  }[];
}

export const useMileageRulesIntegration = (context: BusinessAppContextProps) => {
  const [mileageRules, setMileageRules] = useState<EnhancedMileageRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchMileageRules } = useGetMileageRulesData(context);
  const { fetchMileageRuleUsageCounts } = useGetCalculationRuleUsage(context);

  // Transform GraphQL data to enhanced UI format
  const transformMileageRuleData = useCallback((data: MileageRuleData[], usageCounts: Record<string, number> = {}): EnhancedMileageRule[] => {
    return data.map(rule => {
      // Extract primary rate from first detail (if available)
      const primaryDetail = rule.mileageRuleDetail?.[0];
      const ratePerKm = primaryDetail?.amount || 0;
      
      // Extract currency from detail or default to EUR
      const currency = 'EUR'; // This would come from the currency field in the detail
      
      // Check if rule is currently active
      const now = new Date();
      const activeFrom = rule.activeFrom ? new Date(rule.activeFrom) : null;
      const activeTo = rule.activeTo ? new Date(rule.activeTo) : null;
      const isActive = !rule.isDeleted && 
        (!activeFrom || activeFrom <= now) && 
        (!activeTo || activeTo >= now);

      // Format validity period display
      const formatDate = (dateString?: string) => 
        dateString ? dayjs(dateString).format('DD.MM.YYYY') : '';
      
      const validFromFormatted = formatDate(rule.activeFrom);
      const validToFormatted = rule.activeTo ? formatDate(rule.activeTo) : 'No end date';
      const validityPeriod = `${validFromFormatted} - ${validToFormatted}`;

      // Get usage count for this rule
      const usageCount = usageCounts[rule.code] || 0;

      return {
        id: rule.id,
        name: rule.name,
        code: rule.code,
        rulePeriod: rule.rulePeriod,
        rulePeriodLabel: getMileageRulePeriodLabel(rule.rulePeriod || ''),
        ratePerKm,
        currency,
        effectiveFrom: rule.activeFrom || rule.createdAt,
        effectiveTo: rule.activeTo,
        validityPeriod,
        isActive,
        description: rule.name,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        usageCount,
        version: rule.version, // Add version field
        details: rule.mileageRuleDetail.map(detail => ({
          id: detail.id,
          amount: detail.amount,
          limitFrom: detail.limitFrom,
          limitTo: detail.limitTo,
          detailOrder: detail.detailOrder,
          activeFrom: detail.activeFrom,
          activeTo: detail.activeTo,
          version: detail.version // Add version field for details
        }))
      };
    });
  }, []);

  const loadMileageRules = useCallback(async (variables: MileageRuleQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch mileage rules first
      const result = await fetchMileageRules(variables);
      
      if (result?.MileageRule) {
        // Extract codes for usage count lookup
        const mileageRuleCodes = result.MileageRule.map(rule => rule.code);
        
        // Fetch usage counts in parallel if we have rules
        let usageCounts: Record<string, number> = {};
        if (mileageRuleCodes.length > 0) {
          try {
            usageCounts = await fetchMileageRuleUsageCounts(mileageRuleCodes);
          } catch (usageError) {
            console.warn('Failed to fetch usage counts:', usageError);
            // Continue without usage counts rather than failing entirely
          }
        }
        
        const enhancedRules = transformMileageRuleData(result.MileageRule, usageCounts);
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
  }, [context.accessToken, fetchMileageRules, fetchMileageRuleUsageCounts, transformMileageRuleData]);

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
    searchMileageRules,
    refetch
  };
}; 