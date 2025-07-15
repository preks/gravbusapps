import { useGraphQLClient } from '../../../../../../../../../common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { getCurrentActiveStructureId } from '../../../../../../../../../common/utils/windowUtils';
import { useCallback } from 'react';
import type { WorkforceEmployee } from '../types/workforceTypes';

export interface WorkforceQueryVariables {
  structureId: string;
  limit?: number;
  offset?: number;
}

export interface WorkforceDataResponse {
  EmployeePosition: Array<{
    id: string;
    employeeId: string;
    organizationalUnitId: string;
    employee: WorkforceEmployee;
    organizationalUnit: {
      id: string;
      name: string;
      type: string;
      company: {
        id: string;
        name: string;
        code: string;
      } | null;
    };
    jobPosition: {
      id: string;
      name: string;
      businessKey?: string;
      employmentType?: {
        code: string;
        value: string;
      };
      jobLevel?: {
        id: string;
        name: string;
        level?: string;
      };
      jobFunction?: {
        id: string;
        name: string;
        department?: string;
      };
    } | null;
    siteLocationId?: string;
    siteLocation?: {
      id: string;
      name: string;
      country?: {
        id: string;
        code: string;
        value: string;
      };
      region?: {
        id: string;
        code: string;
        value: string;
      };
    };
    costCenterId?: string;
    costCenter?: {
      id: string;
      name: string;
      code?: string;
    };
  }>;
}

export const GET_WORKFORCE_DATA = (variables: WorkforceQueryVariables): string => {
  return `
    query GetWorkforceData($structureId: uuid!, $limit: Int, $offset: Int) {
      EmployeePosition(
        where: { 
          structureId: { _eq: $structureId }
          employeeId: { _isNull: false }
        }
        limit: $limit
        offset: $offset
      ) {
        id
        employeeId
        organizationalUnitId
        employee {
          id
          firstName
          lastName
          birthDate
          gender {
            code
            value
          }
          workingCondition {
            id
            activeFrom
            activeTo
            employmentType {
              code
              value
            }
                    contractType {
          code
          value
        }
      }
        }
        jobPosition {
          id
          name
          businessKey
                  employmentType {
          code
          value
        }
          jobLevel {
            id
            name
          }
          jobFunction {
            id
            name
          }
        }
            organizationalUnit {
      id
      name
      type
      company {
        id
        name
        code
      }
    }
    siteLocationId
    siteLocation {
      id
      name
      country {
        id
        code
        value
      }
      region {
        id
        code
        value
      }
    }
    costCenterId
    costCenter {
      id
      name
      code
    }
      }
    }
  `;
};

export const useGetWorkforceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchWorkforceData = useCallback(async (
    variables: WorkforceQueryVariables = { 
      structureId: getCurrentActiveStructureId() || '',
      limit: 1000,
      offset: 0 
    }
  ): Promise<WorkforceDataResponse> => {
    const query = GET_WORKFORCE_DATA(variables);
    try {
      const result = await graphqlClient.request<WorkforceDataResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching workforce data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchWorkforceData };
}; 