import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback, useState, useEffect } from 'react';
import { INVESTMENT } from '@/common/data/investment/queries/fragments/investmentFragments';

// GraphQL query to fetch investment additionalProperties by ID
export const GET_INVESTMENT_ADDITIONAL_PROPERTIES = (investmentId: string): string => {
  return `
    query GetInvestmentAdditionalProperties {
      Investment(where: { id: { _eq: "${investmentId}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT}
        additionalProperties
      }
    }
  `;
};


// Interface for investment with additionalProperties
export interface InvestmentWithAdditionalProperties {
  id: string;
  name: string;
  version: number;
  additionalProperties?: any;
  // Investment group information
  investmentGroup?: {
    id: string;
    code: string;
    value: string;
  };
  groupRef?: string;
  // Investment sub-types (arrays as returned by GraphQL)
  equityInvestment?: any[];
  realEstateInvestment?: any[];
  liquidFundInvestment?: any[];
}

// Response interface for the GraphQL query
export interface InvestmentAdditionalPropertiesResponse {
  Investment: InvestmentWithAdditionalProperties[];
}

// Hook to fetch investment additionalProperties
export const useGetInvestmentAdditionalProperties = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentAdditionalProperties = useCallback(async (investmentId: string) => {
    if (!investmentId) {
      throw new Error('Investment ID is required');
    }

    const query = GET_INVESTMENT_ADDITIONAL_PROPERTIES(investmentId);
    try {
      const result = await graphqlClient.request<InvestmentAdditionalPropertiesResponse>(query);
      const investment = result?.Investment?.[0];
      
      if (!investment) {
        throw new Error('Investment not found');
      }

      return investment;
    } catch (error) {
      // Keep minimal logging to avoid noisy console in popups
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentAdditionalProperties };
};


// Simplified React hook for data loading only
export const useInvestmentTileData = (context: BusinessAppContextProps, investmentId: string, tileKey: string) => {
  const [investment, setInvestment] = useState<InvestmentWithAdditionalProperties | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tileValue, setTileValue] = useState<string>('');

  const { fetchInvestmentAdditionalProperties } = useGetInvestmentAdditionalProperties(context);

  // Load investment data
  const loadData = useCallback(async () => {
    if (!investmentId) return;

    setLoading(true);
    setError(null);
    
    try {
      const investmentData = await fetchInvestmentAdditionalProperties(investmentId);
      setInvestment(investmentData);

      // Parse additionalProperties and extract tile value
      const additionalProps = investmentData.additionalProperties || {};
      const tiles = additionalProps.tiles || {};
      const existingTileValue = tiles[tileKey] || '';
      
      setTileValue(existingTileValue);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investment data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [investmentId, tileKey, fetchInvestmentAdditionalProperties]);

  // Auto-load data when parameters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    investment,
    tileValue,
    loading,
    error,
    refetch: loadData
  };
};
