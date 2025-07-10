import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface PrivateEquityInvestmentData {
  id: string;
  businessKey: string | null;
  investmentRole: {
    id: string;
    value: string;
    code: string;
  } | null;
  investment: {
    id: string;
    businessKey: string | null;
    name: string;
    bookValue: number | null;
    marketValue: number | null;
    initialInvestmentAmount: number | null;
    totalInvestmentAmount: number | null;
    stakePercent: number | null;
    debtFinancing: number | null;
    leverageRatio: number | null;
    acquisitionDate: string | null;
    exitDate: string | null;
    plannedExitDate: string | null;
    currency: {
      id: string;
      value: string;
      code: string;
    } | null;
    investmentGroup: {
      id: string;
      value: string;
      code: string;
    } | null;
    investmentPhase: {
      id: string;
      value: string;
      code: string;
    } | null;
    investmentStatus: {
      id: string;
      value: string;
      code: string;
    } | null;
    investmentRiskLevel: {
      id: string;
      value: string;
      code: string;
    } | null;
    account: {
      id: string;
      name: string;
    } | null;
  };
}

export const usePrivateEquityRecordData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [privateEquityData, setPrivateEquityData] = useState<PrivateEquityInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchPrivateEquityData = useCallback(async () => {
    if (!investmentId || !context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching private equity data for investmentId:', investmentId);

      // First, try to find PrivateEquityInvestment by investmentId (foreign key to Investment)
      const primaryQuery = `
        query GetPrivateEquityInvestmentByInvestmentId($investmentId: uuid!) {
          PrivateEquityInvestment(where: { investmentId: { _eq: $investmentId } }, limit: 1) {
            id
            businessKey
            investmentRole {
              id
              value
              code
            }
            investment {
              id
              businessKey
              name
              bookValue
              marketValue
              initialInvestmentAmount
              totalInvestmentAmount
              stakePercent
              debtFinancing
              leverageRatio
              acquisitionDate
              exitDate
              plannedExitDate
              currency {
                id
                value
                code
              }
              investmentGroup {
                id
                value
                code
              }
              investmentPhase {
                id
                value
                code
              }
              investmentStatus {
                id
                value
                code
              }
              investmentRiskLevel {
                id
                value
                code
              }
              account {
                id
                name
              }
            }
          }
        }
      `;

      let result = await graphqlClient.request<{ PrivateEquityInvestment: PrivateEquityInvestmentData[] }>(
        primaryQuery,
        { investmentId }
      );

      console.log('Primary query result:', result);

      // If no result, try fallback query using PrivateEquityInvestment id directly
      if (!result.PrivateEquityInvestment || result.PrivateEquityInvestment.length === 0) {
        console.log('Primary query found no results, trying fallback query with PrivateEquityInvestment id');
        
        const fallbackQuery = `
          query GetPrivateEquityInvestmentById($privateEquityInvestmentId: uuid!) {
            PrivateEquityInvestment(where: { id: { _eq: $privateEquityInvestmentId } }, limit: 1) {
              id
              businessKey
              investmentRole {
                id
                value
                code
              }
              investment {
                id
                businessKey
                name
                bookValue
                marketValue
                initialInvestmentAmount
                totalInvestmentAmount
                stakePercent
                debtFinancing
                leverageRatio
                acquisitionDate
                exitDate
                plannedExitDate
                currency {
                  id
                  value
                  code
                }
                investmentGroup {
                  id
                  value
                  code
                }
                investmentPhase {
                  id
                  value
                  code
                }
                investmentStatus {
                  id
                  value
                  code
                }
                investmentRiskLevel {
                  id
                  value
                  code
                }
                account {
                  id
                  name
                }
              }
            }
          }
        `;

        result = await graphqlClient.request<{ PrivateEquityInvestment: PrivateEquityInvestmentData[] }>(
          fallbackQuery,
          { privateEquityInvestmentId: investmentId }
        );

        console.log('Fallback query result:', result);
      }

      if (result.PrivateEquityInvestment && result.PrivateEquityInvestment.length > 0) {
        setPrivateEquityData(result.PrivateEquityInvestment[0]);
      } else {
        setError('Private equity investment not found');
      }
    } catch (err) {
      console.error('Error fetching private equity data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, graphqlClient]);

  useEffect(() => {
    fetchPrivateEquityData();
  }, [fetchPrivateEquityData]);

  return {
    privateEquityData,
    isLoading,
    error,
    refetch: fetchPrivateEquityData
  };
}; 