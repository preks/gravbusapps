import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';

export interface SiteLocationOption {
  id: string;
  value: string;
  label: string;
  name: string;
  code?: string;
  locality?: string;
  postalCode?: string;
  countryName?: string;
  regionName?: string;
}

export interface UseSiteLocationSelectionParams {
  pageSize?: number;
}

export interface UseSiteLocationSelectionState {
  siteLocations: SiteLocationOption[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  currentSearch: string;
}

const GET_SITE_LOCATIONS_QUERY = `
  query GetSiteLocations($where: SiteLocationBoolExp, $limit: Int, $offset: Int) {
    SiteLocation(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: [{ name: ASC }]
    ) {
      id
      name
      code
      locality
      postalCode
      country {
        id
        value
      }
      region {
        id
        value
      }
    }
  }
`;

export const useSiteLocationSelection = (
  context: BusinessAppContextProps,
  { pageSize = 20 }: UseSiteLocationSelectionParams = {}
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const [state, setState] = useState<UseSiteLocationSelectionState>({
    siteLocations: [],
    isLoading: false,
    error: null,
    hasMore: true,
    offset: 0,
    currentSearch: ''
  });

  const fetchSiteLocations = useCallback(async (
    search: string = '',
    offset: number = 0,
    append: boolean = false
  ) => {
    if (!context.accessToken) {
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      ...(append ? {} : { siteLocations: [] })
    }));

    try {
      const whereCondition: any = {
        isDeleted: { _eq: false },
        structureId: { _eq: getCurrentActiveStructureId() }
      };

      // Add search conditions
      if (search.trim()) {
        whereCondition._or = [
          { name: { _ilike: `%${search.trim()}%` } },
          { code: { _ilike: `%${search.trim()}%` } },
          { locality: { _ilike: `%${search.trim()}%` } },
          { postalCode: { _ilike: `%${search.trim()}%` } },
          { country: { value: { _ilike: `%${search.trim()}%` } } },
          { region: { value: { _ilike: `%${search.trim()}%` } } }
        ];
      }

      const variables = {
        where: whereCondition,
        limit: pageSize,
        offset
      };

      const response = await graphqlClient.request(GET_SITE_LOCATIONS_QUERY, variables);

      const mappedSiteLocations: SiteLocationOption[] = response.SiteLocation.map((location: any) => {
        const baseName = location.name || 'Unnamed Location';
        const locality = location.locality;
        const country = location.country?.value;
        const postalCode = location.postalCode;
        
        // Build display label with additional info
        const labelParts = [baseName];
        if (locality) labelParts.push(locality);
        if (country) labelParts.push(country);
        if (postalCode) labelParts.push(postalCode);
        
        const label = labelParts.join(', ');

        return {
          id: location.id,
          value: location.id,
          label,
          name: baseName,
          code: location.code,
          locality: location.locality,
          postalCode: location.postalCode,
          countryName: location.country?.value,
          regionName: location.region?.value
        };
      });

      const hasMoreRecords = mappedSiteLocations.length === pageSize;

      setState(prev => ({
        ...prev,
        siteLocations: append ? [...prev.siteLocations, ...mappedSiteLocations] : mappedSiteLocations,
        isLoading: false,
        hasMore: hasMoreRecords,
        currentSearch: search,
        offset: append ? prev.offset + mappedSiteLocations.length : mappedSiteLocations.length
      }));

    } catch (error) {
      console.error('Error fetching site locations:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch site locations',
        siteLocations: append ? prev.siteLocations : []
      }));
    }
  }, [context.accessToken, graphqlClient, pageSize]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      fetchSiteLocations(state.currentSearch, state.offset, true);
    }
  }, [fetchSiteLocations, state.hasMore, state.isLoading, state.currentSearch, state.offset]);

  const search = useCallback((searchTerm: string) => {
    fetchSiteLocations(searchTerm, 0, false);
  }, [fetchSiteLocations]);

  const reset = useCallback(() => {
    setState({
      siteLocations: [],
      isLoading: false,
      error: null,
      hasMore: true,
      offset: 0,
      currentSearch: ''
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      fetchSiteLocations();
    }
  }, [context.accessToken, fetchSiteLocations]);

  return {
    siteLocations: state.siteLocations,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    search,
    reset
  };
};
