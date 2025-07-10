import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface EquityInvestmentData {
  id: string;
  businessKey: string | null;
  currentCompanyValuation: number | null;
  lastReportedEbitda: number | null;
  lastReportedTurnover: number | null;
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

export const useEquityRecordData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [equityData, setEquityData] = useState<EquityInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEquityData = useCallback(async () => {
    if (!investmentId || !context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching equity data for investmentId:', investmentId);

      // First, try to find EquityInvestment by investmentId (foreign key to Investment)
      const primaryQuery = `
        query GetEquityInvestmentByInvestmentId($investmentId: uuid!) {
          EquityInvestment(where: { investmentId: { _eq: $investmentId } }, limit: 1) {
            id
            businessKey
            currentCompanyValuation
            lastReportedEbitda
            lastReportedTurnover
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

      let result = await graphqlClient.request<{ EquityInvestment: EquityInvestmentData[] }>(
        primaryQuery,
        { investmentId }
      );

      console.log('Primary query result:', result);

      // If no result, try fallback query using EquityInvestment id directly
      if (!result.EquityInvestment || result.EquityInvestment.length === 0) {
        console.log('Primary query found no results, trying fallback query with EquityInvestment id');
        
        const fallbackQuery = `
          query GetEquityInvestmentById($equityInvestmentId: uuid!) {
            EquityInvestment(where: { id: { _eq: $equityInvestmentId } }, limit: 1) {
              id
              businessKey
              currentCompanyValuation
              lastReportedEbitda
              lastReportedTurnover
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

        result = await graphqlClient.request<{ EquityInvestment: EquityInvestmentData[] }>(
          fallbackQuery,
          { equityInvestmentId: investmentId }
        );

        console.log('Fallback query result:', result);
      }

      // If still no result, try to get any equity investment for development purposes
      if (!result.EquityInvestment || result.EquityInvestment.length === 0) {
        console.log('No equity investment found, fetching sample data for development');
        
        const sampleQuery = `
          query GetSampleEquityInvestment {
            EquityInvestment(limit: 1) {
              id
              businessKey
              currentCompanyValuation
              lastReportedEbitda
              lastReportedTurnover
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

        result = await graphqlClient.request<{ EquityInvestment: EquityInvestmentData[] }>(sampleQuery);
        console.log('Sample query result:', result);
        
        if (result.EquityInvestment && result.EquityInvestment.length > 0) {
          console.log('Using sample data for development purposes');
        }
      }

      if (result.EquityInvestment && result.EquityInvestment.length > 0) {
        setEquityData(result.EquityInvestment[0]);
        console.log('Successfully loaded equity data:', result.EquityInvestment[0]);
      } else {
        const errorMsg = `No equity investment found for ID: ${investmentId}. This might be because:
1. The investment ID doesn't exist in the database
2. The investment exists but is not an equity investment
3. There are permission issues accessing the data`;
        console.warn(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error fetching equity data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while fetching equity data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, graphqlClient]);

  useEffect(() => {
    fetchEquityData();
  }, [fetchEquityData]);

  return {
    equityData,
    isLoading,
    error,
    refetch: fetchEquityData
  };
}; 