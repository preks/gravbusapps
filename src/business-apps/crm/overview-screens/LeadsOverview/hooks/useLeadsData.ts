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
    if (!accessToken) {
      console.warn('No access token available, skipping leads fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch leads that are active and don't have linked opportunities or investments
      const response = await graphQLClient.request(
        getActiveLeadsQuery,
        {
          offset: 0,
        }
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

      // Sort by created date descending (newest first)
      const sortedLeads = transformedLeads.sort((a: Lead, b: Lead) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order
      });
      
      setLeads(sortedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken]);
  
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
