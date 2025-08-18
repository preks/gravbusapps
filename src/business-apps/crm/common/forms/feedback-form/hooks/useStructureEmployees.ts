import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { EmployeeOption } from '../types';

export const useStructureEmployees = (accessToken: string, shouldFetch: boolean = true) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchStructureEmployees = useCallback(async (search?: string) => {
    if (!accessToken || !shouldFetch) {
      return;
    }

    const structureId = getCurrentActiveStructureId();
    if (!structureId) {
      setError('No structure ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const query = `
        query GetStructureEmployees($structureId: uuid!, $search: String, $limit: Int) {
          EmployeePosition(
            where: {
              structureId: { _eq: $structureId },
              employee: { isDeleted: { _eq: false } },
              _or: [
                { firstName: { _ilike: $search } },
                { lastName: { _ilike: $search } },
                { employee: { displayName: { _ilike: $search } } }
              ]
            },
            limit: $limit,
            orderBy: { firstName: ASC, lastName: ASC }
          ) {
            id
            employeeId
            firstName
            lastName
            employee {
              id
              displayName
              pictureThumbnail
            }
            jobPosition {
              name
            }
            organizationalUnit {
              name
            }
          }
        }
      `;

      const variables = {
        structureId,
        search: search ? `%${search}%` : '%',
        limit: 100
      };

      const result = await graphqlClient.request(query, variables);
      
      const employeeOptions: EmployeeOption[] = result.EmployeePosition.map((emp: any) => ({
        id: emp.id,
        name: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
        email: undefined, // Not available in this query
        jobTitle: emp.jobPosition?.name,
        department: emp.organizationalUnit?.name,
        pictureThumbnail: emp.employee?.pictureThumbnail
      }));

      setEmployees(employeeOptions);
    } catch (err) {
      console.error('Error fetching structure employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, graphqlClient, shouldFetch]);

  const getEmployeeById = useCallback((employeeId: string): EmployeeOption | undefined => {
    return employees.find(emp => emp.id === employeeId);
  }, [employees]);

  useEffect(() => {
    if (shouldFetch) {
      fetchStructureEmployees();
    }
  }, [fetchStructureEmployees, shouldFetch]);

  return {
    employees,
    isLoading,
    error,
    fetchStructureEmployees,
    getEmployeeById
  };
};
