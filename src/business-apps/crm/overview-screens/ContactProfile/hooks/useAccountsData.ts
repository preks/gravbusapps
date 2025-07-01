import { useState, useEffect } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

export interface Account {
  id: string;
  name: string;
}

export const useAccountsData = (accessToken: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const graphQLClient = useGraphqlClient(accessToken);
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        
        const query = `
          query GetAccounts {
            Account(where: { isDeleted: { _eq: false } }, limit: 20) {
              name
              id
            }
          }
        `;
        
        const response = await graphQLClient.request(query);
        
        if (response && response.Account) {
          setAccounts(response.Account);
        } else {
          setAccounts([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred while fetching accounts'));
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (accessToken) {
      fetchAccounts();
    }
  }, [accessToken, graphQLClient]);
  
  return { accounts, loading, error };
};
