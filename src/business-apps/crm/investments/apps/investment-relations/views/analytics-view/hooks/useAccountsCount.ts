import { useEffect, useState } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export const useAccountsCount = (accessToken: string) => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        setIsLoading(true);
        const query = `
          query GetInvestmentAccountsCount {
            InvestmentAccountAggregate(where: { isDeleted: { _eq: false } }) { aggregate { count } }
          }
        `;
        const res = await graphqlClient.request<any>(query);
        setCount(res?.InvestmentAccountAggregate?.aggregate?.count || 0);
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) fetchCount();
  }, [accessToken, graphqlClient]);

  return { count, isLoading };
};


