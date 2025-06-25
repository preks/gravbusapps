import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { Capability } from '../components/tabs/CapabilitiesTab';

const ORGCHART_BASE_URL = 'https://newwork-dev.newwork.com/orgchart/api/v1';

// Interface for raw API data
export interface CapabilityData {
  id: string;
  structureId: string;
  name: string;
  description?: string;
  rankInLayer?: number;
  layer?: string;
  rankInGroup?: number;
  groupId?: string;
}

export interface PaginatedCapabilityData {
  data: CapabilityData[]
  paging: {
    offset: number
    totalRecords: number
    hasMore: boolean
  }
}

// Default pagination values
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

export const useCapabilities = (context: BusinessAppContextProps) => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Transform API capability data to UI-friendly Capability interface
  const transformCapability = (capabilityData: CapabilityData): Capability => {
    // Generate a unique code based on name or ID
    const code = `CAP-${capabilityData.id.substring(0, 4)}`;
    
    // Determine status (can be refined based on business logic)
    const status: 'Active' | 'Inactive' = 'Active';

    return {
      id: capabilityData.id,
      name: capabilityData.name,
      code: code,
      category: capabilityData.layer || 'General',
      level: 'Advanced', // Default value, can be adjusted based on business logic
      description: capabilityData.description || '',
      status: status,
      competencyArea: 'Technical', // Default value, can be adjusted based on business logic
      requiredLevel: 'Intermediate', // Default value, can be adjusted based on business logic
      certificationRequired: false // Default value, can be adjusted based on business logic
    };
  };

  // Fetch capabilities from orgchart API
  const fetchCapabilities = useCallback(
    async (limit?: number, offset?: number): Promise<{capabilities: Capability[], totalCount: number}> => {
    try {
      // Get structureId from additionalData or use default
      const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf';
      
      if (!structureId) {
        throw new Error('Structure ID is required to fetch capabilities');
      }
      
      const params: Record<string, string | number> = {
        structureId: structureId,
      };
      
      // Add pagination params if provided
      if (limit !== undefined) {
        params.limit = limit;
      }
      if (offset !== undefined) {
        params.offset = offset;
      }

      const response = await restClient.get<PaginatedCapabilityData>(
        '/capabilities',
        {
          params,
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      );
      
      // Extract capabilities and total count from the paginated response
      const capabilityResponse = response;
      
      // Handle the response format with data and paging properties
      if (capabilityResponse && capabilityResponse.data && capabilityResponse.paging) {
        const transformedCapabilities = capabilityResponse.data.map(transformCapability);
        const totalCount = capabilityResponse.paging.totalRecords;
        
        return { 
          capabilities: transformedCapabilities,
          totalCount 
        };
      }
      
      // Fallback for backward compatibility or unexpected response format
      const capabilities = Array.isArray(capabilityResponse) 
        ? capabilityResponse.map(transformCapability) 
        : [];
      
      return { 
        capabilities,
        totalCount: capabilities.length
      };
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      throw new Error('Failed to fetch capabilities from orgchart API');
    }
  }, [context.accessToken, context.additionalData?.structureId, restClient]);

  // Load data with pagination
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate offset based on current page and page size
      const offset = (currentPage - 1) * pageSize;
      const limit = pageSize;
      
      const { capabilities: capabilitiesData, totalCount: totalCountData } = await fetchCapabilities(limit, offset);
      setCapabilities(capabilitiesData);
      setTotalCount(totalCountData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading capabilities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCapabilities, currentPage, pageSize]);

  // Filter capabilities by name, code, category or competency area
  const filterCapabilities = useCallback((
    searchTerm: string = '',
    status?: 'Active' | 'Inactive' | 'ALL',
    category?: string | 'ALL'
  ): Capability[] => {
    return capabilities.filter(capability => {
      // Search filter
      const matchesSearch = !searchTerm || 
        capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capability.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capability.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capability.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capability.competencyArea.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = !status || status === 'ALL' || capability.status === status;

      // Category filter
      const matchesCategory = !category || category === 'ALL' || capability.category === category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [capabilities]);

  // Get active capabilities
  const getActiveCapabilities = useCallback((): Capability[] => {
    return capabilities.filter(capability => capability.status === 'Active');
  }, [capabilities]);

  // Get inactive capabilities
  const getInactiveCapabilities = useCallback((): Capability[] => {
    return capabilities.filter(capability => capability.status === 'Inactive');
  }, [capabilities]);

  // Search capabilities by name, code, or description
  const searchCapabilities = useCallback((query: string): Capability[] => {
    const searchTerm = query.toLowerCase();
    return capabilities.filter(capability =>
      capability.name.toLowerCase().includes(searchTerm) ||
      capability.code.toLowerCase().includes(searchTerm) ||
      capability.description?.toLowerCase().includes(searchTerm) ||
      capability.category.toLowerCase().includes(searchTerm) ||
      capability.competencyArea.toLowerCase().includes(searchTerm)
    );
  }, [capabilities]);

  // Get capability by ID
  const getCapabilityById = useCallback((id: string): Capability | undefined => {
    return capabilities.find(capability => capability.id === id);
  }, [capabilities]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    // Data
    capabilities,
    
    // State
    isLoading,
    error,
    
    // Pagination
    totalCount,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    
    // Actions
    refetch,
    
    // Filter functions
    filterCapabilities,
    searchCapabilities,
    getCapabilityById,
    getActiveCapabilities,
    getInactiveCapabilities,
    
    // Statistics
    totalCapabilities: totalCount,
    activeCapabilities: getActiveCapabilities().length,
    inactiveCapabilities: getInactiveCapabilities().length
  };
};
