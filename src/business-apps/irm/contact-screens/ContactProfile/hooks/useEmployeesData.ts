import { useState, useEffect } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

interface Employee {
  id: string;
  fullName: string;
}

export const useEmployeesData = (accessToken: string) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const graphQLClient = useGraphqlClient(accessToken);
  
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        
        const query = `
          query GetEmployees {
            Employee(where: { isDeleted: { _eq: false } }) {
              fullName
              id
            }
          }
        `;
        
        const response = await graphQLClient.request(query);
        
        if (response && response.Employee) {
          setEmployees(response.Employee);
        } else {
          setEmployees([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred while fetching employees'));
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (accessToken) {
      fetchEmployees();
    }
  }, [accessToken, graphQLClient]);
  
  return { employees, loading, error };
};
