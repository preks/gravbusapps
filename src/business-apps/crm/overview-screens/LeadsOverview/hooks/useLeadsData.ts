import { useState, useEffect, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';
import { getActiveLeadsQuery } from '../queries/getActiveLeadsQuery';

// Define the lead interface
export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactId?: string;
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
}

interface UseLeadsDataResult {
  leads: Lead[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLeadsData(accessToken: string): UseLeadsDataResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch leads that are active and don't have linked opportunities or investments
      const response = await graphQLClient.request(
        getActiveLeadsQuery,
        {
          offset: 0,
          limit: 20
        }
      );
      
      // Transform the GraphQL response to the Lead interface
      const transformedLeads = response.Lead.map((lead: any) => ({
        id: lead.id,
        companyName: lead.companyName || 'Unknown Company',
        contactName: 'No Contact', // Contact info not available in new query
        contactId: undefined,
        ownerName: lead.ownerEmployee?.fullName || 'Unassigned',
        ownerId: lead.ownerEmployee?.id || '',
        ownerAvatar: undefined, // Avatar not available in new query
        createdAt: lead.createdAt,
        lastActivity: lead.updatedAt, // Using updatedAt as lastActivity
        tags: [], // Tags not available in new query
        status: lead.status?.id === 'ACTIVE' ? 'active' : 'lost',
        version: lead.version || 1,
        updatedBy: lead.updatedBy,
        updatedAt: lead.updatedAt
      }));
      
      setLeads(transformedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1);
  }, []);
  
  // Fetch leads on mount and when refetch is called
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, accessToken, refetchCount]);
  
  return { leads, loading, error, refetch };
}
