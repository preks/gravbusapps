import { useEffect, useState } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';

/**
 * GraphQL query to fetch employee positions with capabilities for the current user
 * 
 * This query fetches:
 * - Employee position information
 * - Direct capability from position
 * - Organizational unit details
 * - Job position information
 * - Additional employee capabilities
 */
const GET_USER_CAPABILITIES_QUERY = `
  query GetUserCapabilities($employeeId: uuid!, $structureId: uuid!) {
    EmployeePosition(
      where: {
        employeeId: { _eq: $employeeId }
        structureId: { _eq: $structureId }
      }
    ) {
      id
      employeeId
      capability {
        id
        name
        description
      }
      employeeCapabilities {
        capability {
          id
          name
          description
        }
      }
      organizationalUnit {
        id
        name
        code
        type
        tag
      }
      jobPosition {
        id
        name
      }
    }
  }
`;

/**
 * Type definitions for GraphQL response
 */
interface CapabilityData {
  id: string;
  name: string;
  description?: string;
}

interface OrganizationalUnitData {
  id: string;
  name: string;
  code?: string;
  type?: string;
  tag?: string;
}

interface JobPositionData {
  id: string;
  name: string;
}

interface EmployeeCapabilityData {
  capability: CapabilityData;
}

interface EmployeePositionData {
  id: string;
  employeeId: string;
  capability?: CapabilityData;
  organizationalUnit?: OrganizationalUnitData;
  jobPosition?: JobPositionData;
  employeeCapabilities: EmployeeCapabilityData[];
}

interface UserCapabilitiesResponse {
  EmployeePosition: EmployeePositionData[];
}

/**
 * Hook return type
 */
export interface UserCapabilitiesGraphQL {
  capabilities: CapabilityData[];
  organizationalUnits: OrganizationalUnitData[];
  positions: EmployeePositionData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch user capabilities from MAP Orgchart via GraphQL
 */
export const useUserCapabilitiesGraphQL = ({
  accessToken,
  userInfo,
}: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>): UserCapabilitiesGraphQL => {
  const [capabilities, setCapabilities] = useState<CapabilityData[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnitData[]>([]);
  const [positions, setPositions] = useState<EmployeePositionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphqlClient(accessToken);

  const fetchUserCapabilities = async () => {
    if (!accessToken) {
      console.log('useUserCapabilitiesGraphQL: Missing accessToken');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const employeeId = userInfo?.employeeDetails?.employeeId;
      if (!employeeId) {
        console.log('useUserCapabilitiesGraphQL: Missing employeeId, using fallback approach');
        // Don't treat this as an error, just return empty data for fallback
        setCapabilities([]);
        setOrganizationalUnits([]);
        setPositions([]);
        return;
      }

      const structureId = getCurrentActiveStructureId();
      
      console.log('useUserCapabilitiesGraphQL: Fetching capabilities for', { employeeId, structureId });

      const response = await graphqlClient.request<UserCapabilitiesResponse>(
        GET_USER_CAPABILITIES_QUERY,
        {
          employeeId,
          structureId,
        }
      );

      console.log('useUserCapabilitiesGraphQL: GraphQL response', response);

      if (response?.EmployeePosition) {
        const positionsData = response.EmployeePosition;
        setPositions(positionsData);

        // Extract unique capabilities from positions and employee capabilities
        const capabilitiesMap = new Map<string, CapabilityData>();
        const orgUnitsMap = new Map<string, OrganizationalUnitData>();

        positionsData.forEach((position) => {
          // Add capability from position
          if (position.capability) {
            capabilitiesMap.set(position.capability.id, position.capability);
          }

          // Add employee capabilities
          if (position.employeeCapabilities && Array.isArray(position.employeeCapabilities)) {
            position.employeeCapabilities.forEach((empCap) => {
              if (empCap?.capability) {
                capabilitiesMap.set(empCap.capability.id, empCap.capability);
              }
            });
          }

          // Add organizational unit
          if (position.organizationalUnit) {
            orgUnitsMap.set(position.organizationalUnit.id, position.organizationalUnit);
          }
        });

        const capabilitiesArray = Array.from(capabilitiesMap.values());
        const orgUnitsArray = Array.from(orgUnitsMap.values());
        setCapabilities(capabilitiesArray);
        setOrganizationalUnits(orgUnitsArray);

        console.log('useUserCapabilitiesGraphQL: Processed data', {
          capabilities: capabilitiesArray,
          organizationalUnits: orgUnitsArray,
          totalPositions: positionsData.length,
          samplePosition: positionsData[0],
        });
      } else {
        console.log('useUserCapabilitiesGraphQL: No EmployeePosition data found');
        setCapabilities([]);
        setOrganizationalUnits([]);
        setPositions([]);
      }
    } catch (err) {
      console.error('useUserCapabilitiesGraphQL: Error fetching capabilities', err);
      console.error('useUserCapabilitiesGraphQL: Full error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      // For GraphQL errors, try to provide more specific error information
      let errorMessage = 'Failed to fetch user capabilities';
      if (err instanceof Error) {
        if (err.message.includes('GraphQL error')) {
          errorMessage = `GraphQL query failed: ${err.message}`;
        } else if (err.message.includes('Network')) {
          errorMessage = 'Network error: Could not connect to GraphQL endpoint';
        } else if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Authentication error: Invalid or expired access token';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      // Set empty arrays for fallback
      setCapabilities([]);
      setOrganizationalUnits([]);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCapabilities();
  }, [accessToken, userInfo?.employeeDetails?.employeeId]);

  return {
    capabilities,
    organizationalUnits,
    positions,
    isLoading,
    error,
    refetch: fetchUserCapabilities,
  };
};
