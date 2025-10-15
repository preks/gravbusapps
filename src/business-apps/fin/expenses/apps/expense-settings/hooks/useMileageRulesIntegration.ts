import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetMileageRulesData, MileageRuleData, MileageRuleQueryVariables } from '../queries/MileageRuleQueries';
import { getMileageRulePeriodLabel } from '../types/ExpenseEnums';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);

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
  validFrom: string; // Formatted date for display
  validTo: string; // Formatted date for display
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number; // New field for calculation rule usage count
  ruleOrder: number; // Order/sequence number
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

export interface MileageRulesFilters {
  statusFilter?: { active: boolean; inactive: boolean };
  validFromFilter?: string | null;
  validToFilter?: string | null;
  ruleCodeFilter?: string[];
  nameFilter?: string[];
  rulePeriodFilter?: string[];
  search?: string;
}

export const useMileageRulesIntegration = (context: BusinessAppContextProps) => {
  const [mileageRules, setMileageRules] = useState<EnhancedMileageRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [allRuleCodes, setAllRuleCodes] = useState<string[]>([]);
  const [allRuleNames, setAllRuleNames] = useState<string[]>([]);

  const { fetchMileageRules, fetchAllMileageRuleOptions } = useGetMileageRulesData(context);

  // Transform GraphQL data to enhanced UI format
  const transformMileageRuleData = useCallback((data: MileageRuleData[]): EnhancedMileageRule[] => {
    return data.map((rule, index) => {
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
        validFrom: validFromFormatted || 'N/A',
        validTo: validToFormatted,
        isActive,
        description: rule.name,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        usageCount: 0, // Not currently tracked
        ruleOrder: index + 1, // Use index as order since we don't have ruleOrder from API
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

  // Load all filter options (codes and names)
  const loadAllFilterOptions = useCallback(async () => {
    if (!context.accessToken) return;
    
    try {
      const result = await fetchAllMileageRuleOptions();
      if (result?.MileageRule) {
        // Extract unique codes
        const codes = result.MileageRule.map(rule => rule.code).filter(Boolean);
        const uniqueCodes = Array.from(new Set(codes)).sort();
        setAllRuleCodes(uniqueCodes);
        
        // Extract unique names
        const names = result.MileageRule.map(rule => rule.name).filter(Boolean);
        const uniqueNames = Array.from(new Set(names)).sort();
        setAllRuleNames(uniqueNames);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
      // Don't fail the whole component if filter options fail
    }
  }, [context.accessToken, fetchAllMileageRuleOptions]);

  // Initial load - only load filter options, let parent component trigger data load
  useEffect(() => {
    if (context.accessToken) {
      loadAllFilterOptions(); // Load filter options once on mount
    }
  }, [context.accessToken, loadAllFilterOptions]);

  const searchMileageRules = useCallback(async (searchTerm: string, variables: MileageRuleQueryVariables = {}) => {
    await loadMileageRules({
      ...variables,
      search: searchTerm
    });
  }, [loadMileageRules]);

  const refetch = useCallback((variables: MileageRuleQueryVariables = {}) => {
    loadMileageRules(variables);
  }, [loadMileageRules]);

  const refetchWithFilters = useCallback((filters: MileageRulesFilters) => {
    // Convert rule period filter to array of period values
    const rulePeriodFilter = filters.rulePeriodFilter || [];
    
    loadMileageRules({
      statusFilter: filters.statusFilter,
      validFromFilter: filters.validFromFilter,
      validToFilter: filters.validToFilter,
      ruleCodeFilter: filters.ruleCodeFilter,
      nameFilter: filters.nameFilter,
      rulePeriodFilter,
      search: filters.search // Pass search term (undefined if empty)
    });
  }, [loadMileageRules]);

  return {
    mileageRules,
    isLoading,
    error,
    totalCount,
    searchMileageRules,
    refetch,
    refetchWithFilters,
    allRuleCodes,  // All available codes for filter checkboxes
    allRuleNames   // All available names for filter checkboxes
  };
}; 