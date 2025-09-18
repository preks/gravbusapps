import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface UserCapability {
  id: string;
  name: string;
  description: string;
  groupId: string;
}

export interface UseUserCapabilitiesProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeId?: string;
}

export interface UseUserCapabilitiesReturn {
  capabilities: UserCapability[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const GET_USER_CAPABILITIES = `
  query GetUserCapabilities($employeeId: uuid!) {
    EmployeeCapability(where: {employeeId: {_eq: $employeeId}}) {
      id
      employeeId
      capabilityId
      capability {
        id
        name
        description
        groupId
      }
    }
  }
`;

export const useUserCapabilities = ({
  accessToken,
  userInfo,
  employeeId
}: UseUserCapabilitiesProps): UseUserCapabilitiesReturn => {
  const [capabilities, setCapabilities] = useState<UserCapability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphqlClient(accessToken);

  const fetchCapabilities = async () => {
    if (!employeeId) {
      console.log('[useUserCapabilities] No employeeId provided, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useUserCapabilities] Fetching capabilities for employeeId: ${employeeId}`);
      
      const response = await graphqlClient.request(
        GET_USER_CAPABILITIES,
        { employeeId }
      );

      console.log('[useUserCapabilities] Raw GraphQL response:', response);

      if (response?.EmployeeCapability) {
        console.log('[useUserCapabilities] EmployeeCapability data:', response.EmployeeCapability);
        const userCapabilities = response.EmployeeCapability
          .filter((ec: any) => ec.capability && ec.capability.id) // Filter out null capabilities
          .map((ec: any) => ({
            id: ec.capability.id,
            name: ec.capability.name,
            description: ec.capability.description,
            groupId: ec.capability.groupId,
          }));

        console.log(`[useUserCapabilities] Found ${userCapabilities.length} capabilities:`, userCapabilities);
        setCapabilities(userCapabilities);
      } else {
        console.log('[useUserCapabilities] No capabilities found');
        setCapabilities([]);
      }
    } catch (err) {
      console.error('[useUserCapabilities] Error fetching capabilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch capabilities');
      setCapabilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, [employeeId, accessToken]);

  const refetch = () => {
    fetchCapabilities();
  };

  return {
    capabilities,
    isLoading,
    error,
    refetch
  };
};