import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';

export interface OrganizationalUnitOption {
  id: string;
  value: string;
  label: string;
  name: string;
  code?: string;
  description?: string;
  type?: string;
  companyName?: string;
}

export interface UseOrganizationalUnitSelectionParams {
  pageSize?: number;
}

export interface UseOrganizationalUnitSelectionState {
  organizationalUnits: OrganizationalUnitOption[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  currentSearch: string;
}

const GET_ORGANIZATIONAL_UNITS_QUERY = `
  query GetOrganizationalUnits($where: OrganizationalUnitBoolExp, $limit: Int, $offset: Int) {
    OrganizationalUnit(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: [{ name: ASC }]
    ) {
      id
      name
      code
      description
      type
      company {
        id
        name
      }
    }
  }
`;

export const useOrganizationalUnitSelection = (
  context: BusinessAppContextProps,
  { pageSize = 20 }: UseOrganizationalUnitSelectionParams = {}
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const [state, setState] = useState<UseOrganizationalUnitSelectionState>({
    organizationalUnits: [],
    isLoading: false,
    error: null,
    hasMore: true,
    offset: 0,
    currentSearch: ''
  });

  const fetchOrganizationalUnits = useCallback(async (
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
      ...(append ? {} : { organizationalUnits: [] })
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
          { description: { _ilike: `%${search.trim()}%` } },
          { type: { _ilike: `%${search.trim()}%` } },
          { company: { name: { _ilike: `%${search.trim()}%` } } }
        ];
      }

      const variables = {
        where: whereCondition,
        limit: pageSize,
        offset
      };

      const response = await graphqlClient.request(GET_ORGANIZATIONAL_UNITS_QUERY, variables);

      const mappedOrgUnits: OrganizationalUnitOption[] = response.OrganizationalUnit.map((orgUnit: any) => {
        const displayName = orgUnit.name || 'Unnamed Organizational Unit';
        const companyName = orgUnit.company?.name;
        const label = companyName ? `${displayName} (${companyName})` : displayName;

        return {
          id: orgUnit.id,
          value: orgUnit.id,
          label,
          name: displayName,
          code: orgUnit.code,
          description: orgUnit.description,
          type: orgUnit.type,
          companyName
        };
      });

      const hasMoreRecords = mappedOrgUnits.length === pageSize;

      setState(prev => ({
        ...prev,
        organizationalUnits: append ? [...prev.organizationalUnits, ...mappedOrgUnits] : mappedOrgUnits,
        isLoading: false,
        hasMore: hasMoreRecords,
        currentSearch: search,
        offset: append ? prev.offset + mappedOrgUnits.length : mappedOrgUnits.length
      }));

    } catch (error) {
      console.error('Error fetching organizational units:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organizational units',
        organizationalUnits: append ? prev.organizationalUnits : []
      }));
    }
  }, [context.accessToken, graphqlClient, pageSize]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      fetchOrganizationalUnits(state.currentSearch, state.offset, true);
    }
  }, [fetchOrganizationalUnits, state.hasMore, state.isLoading, state.currentSearch, state.offset]);

  const search = useCallback((searchTerm: string) => {
    fetchOrganizationalUnits(searchTerm, 0, false);
  }, [fetchOrganizationalUnits]);

  const reset = useCallback(() => {
    setState({
      organizationalUnits: [],
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
      fetchOrganizationalUnits();
    }
  }, [context.accessToken, fetchOrganizationalUnits]);

  return {
    organizationalUnits: state.organizationalUnits,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    search,
    reset
  };
};
