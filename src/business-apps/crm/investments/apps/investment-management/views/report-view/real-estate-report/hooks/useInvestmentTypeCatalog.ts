import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface InvestmentTypeCatalogEntry {
  id: string;
  value: string;
  displayOrder: number | null;
  description: string | null;
  additionalValue1: string | null;
}

interface UseInvestmentTypeCatalogReturn {
  investmentTypes: InvestmentTypeCatalogEntry[];
  realEstateTypes: InvestmentTypeCatalogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useInvestmentTypeCatalog = (accessToken: string): UseInvestmentTypeCatalogReturn => {
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentTypeCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchInvestmentTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = `
        query GetInvestmentTypes {
          CatalogEntry(
            where: {
              isDeleted: { _eq: false }
              catalog: { name: { _eq: "Investment Type" } }
            }
            orderBy: [{ additionalValue1: ASC }, { value: ASC }]
          ) {
            id
            value
            displayOrder
            description
            additionalValue1
          }
        }
      `;

      const response = await graphqlClient.request<{ CatalogEntry: InvestmentTypeCatalogEntry[] }>(query);
      const allTypes = response.CatalogEntry || [];
      
      setInvestmentTypes(allTypes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment types';
      setError(errorMessage);
      console.error('Error fetching investment types:', err);
    } finally {
      setLoading(false);
    }
  }, [graphqlClient]);

  // Filter for real estate related investment types
  // Based on the data analysis, these seem to be real estate related:
  // - Existing Properties (additionalValue1: "1")
  // - Project Development (additionalValue1: "2") 
  // - Mezzanine Loans (additionalValue1: "3")
  // - Others (additionalValue1: "4")
  const realEstateTypes = investmentTypes.filter(type => {
    const order = type.additionalValue1;
    return order === "1" || order === "2" || order === "3" || order === "4";
  });

  useEffect(() => {
    if (accessToken) {
      fetchInvestmentTypes();
    }
  }, [accessToken, fetchInvestmentTypes]);

  return {
    investmentTypes,
    realEstateTypes,
    loading,
    error,
    refetch: fetchInvestmentTypes
  };
};
