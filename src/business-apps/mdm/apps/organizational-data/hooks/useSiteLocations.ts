import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { SiteLocationData, SiteLocation, PaginatedSiteLocations } from '../types';

const ORGCHART_BASE_URL = 'https://newwork-dev.newwork.com/orgchart/api/v1';

export const useSiteLocations = (context: BusinessAppContextProps, initialPageSize: number = 10) => {
  const [siteLocations, setSiteLocations] = useState<SiteLocation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Transform API site location data to UI-friendly SiteLocation interface
  const transformSiteLocation = (locationData: SiteLocationData): SiteLocation => {
    // Build full address string
    const addressParts = [];
    if (locationData.addressLine?.streetAddress) {
      addressParts.push(locationData.addressLine.streetAddress);
    }
    if (locationData.postalCode) {
      addressParts.push(locationData.postalCode);
    }
    if (locationData.locality) {
      addressParts.push(locationData.locality);
    }

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';

    // Extract region and country from refs
    const region = locationData.region_ref ? locationData.region_ref.split(':').pop() : undefined;
    const country = locationData.country_ref ? locationData.country_ref.split(':').pop() : undefined;

    // Determine status based on having employees or cost centers
    const status: 'Active' | 'Inactive' = 
      locationData.employees.length > 0 || locationData.costCenters.length > 0 ? 'Active' : 'Inactive';

    return {
      id: locationData.id,
      structureId: locationData.structureId,
      name: locationData.name,
      code: locationData.code,
      address: locationData.addressLine?.streetAddress,
      postalCode: locationData.postalCode,
      locality: locationData.locality,
      region,
      country,
      employeeCount: locationData.employees.length,
      costCenterCount: locationData.costCenters.length,
      employees: locationData.employees,
      costCenters: locationData.costCenters,
      fullAddress,
      status
    };
  };

  // Fetch site locations from orgchart API
  const fetchSiteLocations = useCallback(async (page: number = 1, limit: number = 10): Promise<SiteLocation[]> => {
    const offset = (page - 1) * limit;
    try {
      // Get structureId from additionalData or use default
      const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf';
      
      if (!structureId) {
        throw new Error('Structure ID is required to fetch site locations');
      }

      const response = await restClient.get<PaginatedSiteLocations>(
        '/site-locations',
        {
          params: { 
            structureId,
            limit,
            offset
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      );

      // Handle both the new paginated format and the old format for backward compatibility
      if (response.data && response.paging) {
        // New paginated response format
        setTotalCount(response.paging.totalRecords);
        return response.data.map(transformSiteLocation);
      } else {
        // Old format (backward compatibility)
        setTotalCount((response as any).length || 0);
        return (response as any).map(transformSiteLocation);
      }
    } catch (error) {
      console.error('Error fetching site locations:', error);
      throw new Error('Failed to fetch site locations from orgchart API');
    }
  }, [context.accessToken, context.additionalData?.structureId, restClient]);

  // Change page or page size
  const changePage = useCallback(async (page: number, size?: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newPageSize = size !== undefined ? size : pageSize;
      if (size !== undefined) setPageSize(size);
      setCurrentPage(page);
      const locationsData = await fetchSiteLocations(page, newPageSize);
      setSiteLocations(locationsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error changing page:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSiteLocations, pageSize]);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const locationsData = await fetchSiteLocations(currentPage, pageSize);
      setSiteLocations(locationsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading site locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSiteLocations, currentPage, pageSize]);

  // Filter site locations by various criteria
  const filterSiteLocations = useCallback((
    searchTerm: string = '',
    status?: 'Active' | 'Inactive' | 'ALL'
  ): SiteLocation[] => {
    return siteLocations.filter(location => {
      // Search filter
      const matchesSearch = !searchTerm || 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.code && location.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (location.locality && location.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (location.country && location.country.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = !status || status === 'ALL' || location.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [siteLocations]);

  // Get active site locations
  const getActiveSiteLocations = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.status === 'Active');
  }, [siteLocations]);

  // Get inactive site locations
  const getInactiveSiteLocations = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.status === 'Inactive');
  }, [siteLocations]);

  // Search site locations by name, code, or address
  const searchSiteLocations = useCallback((query: string): SiteLocation[] => {
    const searchTerm = query.toLowerCase();
    return siteLocations.filter(location =>
      location.name.toLowerCase().includes(searchTerm) ||
      (location.code && location.code.toLowerCase().includes(searchTerm)) ||
      (location.address && location.address.toLowerCase().includes(searchTerm)) ||
      (location.locality && location.locality.toLowerCase().includes(searchTerm))
    );
  }, [siteLocations]);

  // Get site location by ID
  const getSiteLocationById = useCallback((id: string): SiteLocation | undefined => {
    return siteLocations.find(location => location.id === id);
  }, [siteLocations]);

  // Get locations with employees
  const getLocationsWithEmployees = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.employeeCount > 0);
  }, [siteLocations]);

  // Get locations with cost centers
  const getLocationsWithCostCenters = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.costCenterCount > 0);
  }, [siteLocations]);

  // Get total employee count across all locations
  const getTotalEmployeeCount = useCallback((): number => {
    return siteLocations.reduce((total, location) => total + location.employeeCount, 0);
  }, [siteLocations]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken]);

  return {
    // Pagination props
    totalCount,
    currentPage,
    pageSize,
    changePage,
    // Data
    siteLocations,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch,
    
    // Filter functions
    filterSiteLocations,
    searchSiteLocations,
    getSiteLocationById,
    getActiveSiteLocations,
    getInactiveSiteLocations,
    getLocationsWithEmployees,
    getLocationsWithCostCenters,
    
    // Statistics
    totalLocations: siteLocations.length,
    activeLocations: getActiveSiteLocations().length,
    inactiveLocations: getInactiveSiteLocations().length,
    totalEmployeeCount: getTotalEmployeeCount(),
    locationsWithEmployees: getLocationsWithEmployees().length,
    locationsWithCostCenters: getLocationsWithCostCenters().length,
  };
}; 