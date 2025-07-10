import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface LeadOwner {
  id: string;
  name: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

const GET_LEAD_OWNERS_QUERY = `
  query GetLeadOwners($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      distinctOn: [ownerEmployeeId],
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`;

export const useGetLeadOwners = (
  context: BusinessAppContextProps,
  search: string = '',
  offset: number = 0
) => {
  const [leadOwners, setLeadOwners] = useState<LeadOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLeadOwners = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available for lead owners');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with employee search
      const whereCondition = {
        isDeleted: { _eq: false },
        ownerEmployee: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim() ? [{
              _or: [
                { firstName: { _ilike: `%${search}%` } },
                { lastName: { _ilike: `%${search}%` } },
                { displayName: { _ilike: `%${search}%` } }
              ]
            }] : [])
          ]
        }
      };

      const variables = {
        where: whereCondition,
        limit: 5, // Limit to 5 items as per other filters
        offset
      };

      console.log('Fetching lead owners with variables:', variables);

      const result = await graphqlClient.request(GET_LEAD_OWNERS_QUERY, variables);
      
      console.log('Lead owners result:', result);

      if (result?.Lead) {
        const owners = result.Lead
          .filter((lead: any) => lead.ownerEmployee) // Ensure ownerEmployee exists
          .map((lead: any) => ({
            id: lead.ownerEmployee.id,
            name: lead.ownerEmployee.displayName || 
                  `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim(),
            displayName: lead.ownerEmployee.displayName,
            firstName: lead.ownerEmployee.firstName,
            lastName: lead.ownerEmployee.lastName
          }))
          .slice(0, 5); // Frontend enforcement of limit

        setLeadOwners(owners);
        console.log('Processed lead owners:', owners);
      } else {
        setLeadOwners([]);
      }
    } catch (err) {
      console.error('Error fetching lead owners:', err);
      setError(err);
      setLeadOwners([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset, graphqlClient]);

  useEffect(() => {
    fetchLeadOwners();
  }, [fetchLeadOwners]);

  return {
    leadOwners,
    isLoading,
    error,
    refetch: fetchLeadOwners
  };
}; 