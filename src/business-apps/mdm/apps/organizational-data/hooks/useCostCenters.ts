import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import { CostCenterData, CostCenter } from '../types';

const ORGCHART_BASE_URL = env('NEXT_PUBLIC_REST_ENDPOINT_ORGCHART')!;

export const useCostCenters = (context: BusinessAppContextProps) => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Transform API cost center data to UI-friendly CostCenter interface
  const transformCostCenter = (costCenterData: CostCenterData): CostCenter => {
    // Determine status based on having employees or organizational units
    const status: 'Active' | 'Inactive' = 
      costCenterData.employees.length > 0 || costCenterData.organizationalUnits.length > 0 ? 'Active' : 'Inactive';

    const hasLocation = Boolean(costCenterData.siteLocationId && costCenterData.siteLocationName);

    return {
      id: costCenterData.id,
      structureId: costCenterData.structureId,
      code: costCenterData.code,
      name: costCenterData.name,
      description: costCenterData.description,
      siteLocationId: costCenterData.siteLocationId,
      siteLocationName: costCenterData.siteLocationName,
      employeeCount: costCenterData.employees.length,
      organizationalUnitCount: costCenterData.organizationalUnits.length,
      employees: costCenterData.employees,
      organizationalUnits: costCenterData.organizationalUnits,
      additionalProperties: costCenterData.additionalProperties,
      status,
      hasLocation
    };
  };

  // Fetch cost centers from orgchart API
  const fetchCostCenters = useCallback(async (): Promise<CostCenter[]> => {
    try {
      // Get structureId from additionalData or use default
      const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf';
      
      if (!structureId) {
        throw new Error('Structure ID is required to fetch cost centers');
      }

      const response = await restClient.get<CostCenterData[]>(
        '/cost-centers',
        {
          params: { structureId },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      );

      return response.map(transformCostCenter);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      throw new Error('Failed to fetch cost centers from orgchart API');
    }
  }, [context.accessToken, context.additionalData?.structureId, restClient]);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const costCentersData = await fetchCostCenters();
      setCostCenters(costCentersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading cost centers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCostCenters]);

  // Filter cost centers by various criteria
  const filterCostCenters = useCallback((
    searchTerm: string = '',
    status?: 'Active' | 'Inactive' | 'ALL',
    hasLocation?: 'With Location' | 'Without Location' | 'ALL'
  ): CostCenter[] => {
    return costCenters.filter(costCenter => {
      // Search filter
      const matchesSearch = !searchTerm || 
        costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        costCenter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (costCenter.siteLocationName && costCenter.siteLocationName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = !status || status === 'ALL' || costCenter.status === status;

      // Location filter
      const matchesLocation = !hasLocation || hasLocation === 'ALL' || 
        (hasLocation === 'With Location' && costCenter.hasLocation) ||
        (hasLocation === 'Without Location' && !costCenter.hasLocation);

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [costCenters]);

  // Get active cost centers
  const getActiveCostCenters = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.status === 'Active');
  }, [costCenters]);

  // Get inactive cost centers
  const getInactiveCostCenters = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.status === 'Inactive');
  }, [costCenters]);

  // Get cost centers with locations
  const getCostCentersWithLocation = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.hasLocation);
  }, [costCenters]);

  // Get cost centers without locations
  const getCostCentersWithoutLocation = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => !costCenter.hasLocation);
  }, [costCenters]);

  // Search cost centers by name, code, or description
  const searchCostCenters = useCallback((query: string): CostCenter[] => {
    const searchTerm = query.toLowerCase();
    return costCenters.filter(costCenter =>
      costCenter.name.toLowerCase().includes(searchTerm) ||
      costCenter.code.toLowerCase().includes(searchTerm) ||
      costCenter.description.toLowerCase().includes(searchTerm) ||
      (costCenter.siteLocationName && costCenter.siteLocationName.toLowerCase().includes(searchTerm))
    );
  }, [costCenters]);

  // Get cost center by ID
  const getCostCenterById = useCallback((id: string): CostCenter | undefined => {
    return costCenters.find(costCenter => costCenter.id === id);
  }, [costCenters]);

  // Get cost centers by site location
  const getCostCentersBySiteLocation = useCallback((siteLocationId: string): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.siteLocationId === siteLocationId);
  }, [costCenters]);

  // Get cost centers with employees
  const getCostCentersWithEmployees = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.employeeCount > 0);
  }, [costCenters]);

  // Get cost centers with organizational units
  const getCostCentersWithOrgUnits = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.organizationalUnitCount > 0);
  }, [costCenters]);

  // Get total employee count across all cost centers
  const getTotalEmployeeCount = useCallback((): number => {
    return costCenters.reduce((total, costCenter) => total + costCenter.employeeCount, 0);
  }, [costCenters]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    // Data
    costCenters,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch,
    
    // Filter functions
    filterCostCenters,
    searchCostCenters,
    getCostCenterById,
    getActiveCostCenters,
    getInactiveCostCenters,
    getCostCentersWithLocation,
    getCostCentersWithoutLocation,
    getCostCentersBySiteLocation,
    getCostCentersWithEmployees,
    getCostCentersWithOrgUnits,
    
    // Statistics
    totalCostCenters: costCenters.length,
    activeCostCenters: getActiveCostCenters().length,
    inactiveCostCenters: getInactiveCostCenters().length,
    costCentersWithLocation: getCostCentersWithLocation().length,
    costCentersWithoutLocation: getCostCentersWithoutLocation().length,
    totalEmployeeCount: getTotalEmployeeCount(),
    costCentersWithEmployees: getCostCentersWithEmployees().length,
    costCentersWithOrgUnits: getCostCentersWithOrgUnits().length,
  };
}; 