import { useState, useEffect, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';
import { getActiveLeadsQuery } from '../queries/getActiveLeadsQuery';

// Define the lead interface
export interface Lead {
  id: string;
  name: string;
  companyName: string;
  contactName: string;
  contactId?: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerName: string;
  ownerId: string;
  ownerAvatar?: string;
  createdAt: string;
  lastActivity?: string;
  tags: string[];
  status: 'active' | 'lost' | 'converted';
  version: number;
  updatedBy?: string;
  updatedAt?: string;
  accountId?: string;
  accountName?: string;
  leadSource?: {
    id: string;
    value: string;
  };
  leadStatus?: {
    id: string;
    value: string;
  };
  leadRating?: {
    id: string;
    value: string;
  };
}

interface UseLeadsDataResult {
  leads: Lead[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  handlePageChange: (page: number, size: number) => void;
  searchTerm: string;
  handleSearch: (value: string) => void;
  orderBy: string;
  handleOrderByChange: (value: string) => void;
}

export function useLeadsData(accessToken: string): UseLeadsDataResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // Default limit of 20 per project guidelines
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderBy, setOrderBy] = useState<string>('{"createdAt":"DESC_NULLS_LAST"}');

  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);

  // Handle page change
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle orderBy change
  const handleOrderByChange = (value: string) => {
    setOrderBy(value);
    setCurrentPage(1); // Reset to first page when ordering changes
  };

  // Function to fetch leads with optional orderByValue parameter
  const fetchLeads = useCallback(async (orderByValue?: string) => {
    if (!accessToken) {
      console.warn('No access token available, skipping leads fetch');
      setLoading(false);
      return;
    }

    // Update the orderBy state if a value is provided
    if (orderByValue !== undefined) {
      setOrderBy(orderByValue);
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate offset based on current page and page size
      const offset = (currentPage - 1) * pageSize;

      // Prepare variables for the GraphQL query with default where condition
      const variables: any = {
        offset,
        limit: pageSize,
        orderBy: [{ createdAt: "DESC_NULLS_LAST" }],
        where: { isDeleted: { _eq: false } }
      };

      // Handle orderBy if provided
      if (orderByValue || orderBy) {
        try {
          const orderByString = orderByValue || orderBy;
          const orderByObject = JSON.parse(orderByString || '{}');

          variables.orderBy = [orderByObject];
        } catch (error) {
          console.error('Error parsing orderBy JSON:', error);
        }
      }

      // Add search conditions if search term exists
      if (searchTerm) {
        // Check if searchTerm is a number
        const isNumber = !isNaN(Number(searchTerm));

        const searchConditions = [
          { companyName: { _iregex: searchTerm } },
          { "contact": { "firstName": { _iregex: searchTerm } } },
          { "contact": { "lastName": { _iregex: searchTerm } } },
          { "ownerEmployee": { "fullName": { _iregex: searchTerm } } },
          { "account": { "name": { _iregex: searchTerm } } }
        ];

        // Add number-specific conditions if applicable
        if (isNumber) {
          // Add any numeric fields if needed
        }

        // Combine with isDeleted condition using _and
        variables.where = {
          isDeleted: { _eq: false },
          _or: searchConditions
        };
      }

      const response = await graphQLClient.request(
        getActiveLeadsQuery,
        variables
      );
      // Check if response has the expected structure
      if (!response || !response.Lead) {
        console.warn('Invalid response structure:', response);
        setLeads([]);
        return;
      }

      // Transform the GraphQL response to the Lead interface
      const transformedLeads = response.Lead.map((lead: any) => {
        // Format contact name
        const firstName = lead.contact?.firstName || '';
        const lastName = lead.contact?.lastName || '';
        const contactName = firstName || lastName ? `${firstName} ${lastName}`.trim() : '-';

        return {
          id: lead.id,
          name: lead.name || '-',
          companyName: lead.companyName || '-',
          contactName,
          contactId: lead.contact?.id,
          contactEmail: lead.contact?.email,
          contactPhone: lead.contact?.phone,
          accountId: lead.account?.id,
          accountName: lead.account?.name,
          ownerName: lead.ownerEmployee?.fullName || '-',
          ownerId: lead.ownerEmployee?.id || '-',
          createdAt: lead.createdAt,
          lastActivity: lead.updatedAt, // Using updatedAt as lastActivity
          tags: [], // Tags not available in new query
          version: lead.version || 0,
          updatedBy: lead.updatedBy,
          updatedAt: lead.updatedAt,
          leadSource: lead.leadSource ? {
            id: lead.leadSource.id,
            value: lead.leadSource.value || '-'
          } : undefined,
          leadStatus: lead.leadStatus ? {
            id: lead.leadStatus.id,
            value: lead.leadStatus.value || '-'
          } : undefined,
          leadRating: lead.leadRating ? {
            id: lead.leadRating.id,
            value: lead.leadRating.value || '-'
          } : undefined
        };
      });

      // Set the leads data
      setLeads(transformedLeads);
      console.log(transformedLeads)
      // Set total count if available in the response
      if (response.LeadAggregate?.aggregate?.count !== undefined) {
        setTotalCount(response.LeadAggregate.aggregate.count);
      } else {
        // Fallback: Assume there might be more if we received a full page
        setTotalCount(transformedLeads.length === pageSize ?
          transformedLeads.length + offset + 1 : // +1 to indicate there might be more
          transformedLeads.length + offset);
      }

    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken, currentPage, pageSize, searchTerm, orderBy]);

  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1);
  }, []);

  // Fetch leads on mount and when refetch is called
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, accessToken, refetchCount]);

  return {
    leads,
    loading,
    error,
    refetch,
    currentPage,
    pageSize,
    totalCount,
    handlePageChange,
    searchTerm,
    handleSearch,
    orderBy,
    handleOrderByChange,
  };
}
