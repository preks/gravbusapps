import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { SelectOption } from '../types';

export const useInvestmentGroupTypes = (investmentGroupId: string | undefined, accessToken: string) => {
  const [investmentTypes, setInvestmentTypes] = useState<SelectOption[]>([]);
  const [loadingInvestmentTypes, setLoadingInvestmentTypes] = useState(false);
  const [errorInvestmentTypes, setErrorInvestmentTypes] = useState<string | null>(null);

  const graphQLClient = useGraphQLClient(accessToken);

  const fetchInvestmentTypes = async (groupId: string) => {
    try {
      setLoadingInvestmentTypes(true);
      setErrorInvestmentTypes(null);

      const GET_INVESTMENT_TYPES = `
        query GetInvestmentTypes($groupId: String!) {
          types: CatalogEntry(
            where: {
              catalog: { identifier: { _eq: "InvestmentType" } }
              parentEntryId: { _eq: $groupId }
            }
            orderBy: { value: ASC }
          ) {
            id
            code
            value
            alternativeCode
            parentEntryId
          }
        }
      `;
      
      const result = await graphQLClient.request<{
        types: any[];
      }>(GET_INVESTMENT_TYPES, { groupId });
      
      if (result && result.types) {
        const typeData = result.types.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || "Unknown",
          label: entry.value || entry.code || "Unknown",
          value: entry.id,
          code: entry.code,
          alternativeCode: entry.alternativeCode,
        }));
        
        setInvestmentTypes(typeData);
      } else {
        setInvestmentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching investment types:', err);
      setErrorInvestmentTypes(err instanceof Error ? err.message : 'Failed to fetch investment types');
      setInvestmentTypes([]);
    } finally {
      setLoadingInvestmentTypes(false);
    }
  };

  useEffect(() => {
    if (investmentGroupId && accessToken) {
      fetchInvestmentTypes(investmentGroupId);
    } else {
      setInvestmentTypes([]);
      setLoadingInvestmentTypes(false);
      setErrorInvestmentTypes(null);
    }
  }, [investmentGroupId, accessToken]);

  return {
    investmentTypes,
    loadingInvestmentTypes,
    errorInvestmentTypes,
  };
};
