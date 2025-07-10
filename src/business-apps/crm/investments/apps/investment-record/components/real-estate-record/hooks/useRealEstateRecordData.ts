import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface RealEstateInvestmentData {
  id: string;
  investmentId: string;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  buildingYear: string | null;
  size: number | null;
  numberOfUnits: number | null;
  occupancyPercent: number | null;
  annualExpenses: number | null;
  realEstateType: {
    id: string;
    value: string;
    code: string;
  } | null;
  country: {
    id: string;
    value: string;
    code: string;
  } | null;
  region: {
    id: string;
    value: string;
    code: string;
  } | null;
  investmentOwnershipStructure: {
    id: string;
    value: string;
    code: string;
  } | null;
  investment: {
    id: string;
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

export const useRealEstateRecordData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [realEstateData, setRealEstateData] = useState<RealEstateInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchRealEstateData = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available, skipping GraphQL request');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching real estate data with params:', { investmentId, hasAccessToken: !!context.accessToken });

      // Create the main query for fetching real estate investment data
      const baseQuery = `
        id
        investmentId
        addressLine
        postalCode
        city
        buildingYear
        size
        numberOfUnits
        occupancyPercent
        annualExpenses
        realEstateTypeRef
        countryRef
        regionRef
        investmentOwnershipStructureRef
        realEstateType {
          id
          value
          code
        }
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
        investmentOwnershipStructure {
          id
          value
          code
        }
        investment {
          id
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
      `;

      let result = null;

      // Step 1: Try to find by RealEstateInvestment.id (what the dashboard actually passes)
      if (investmentId) {
        console.log('Trying to find RealEstateInvestment by id (RealEstateInvestment.id):', investmentId);
        const query = `
          query GetRealEstateInvestmentById($id: uuid!) {
            RealEstateInvestment(where: { id: { _eq: $id } }, limit: 1) {
              ${baseQuery}
            }
          }
        `;

        result = await graphqlClient.request<{ RealEstateInvestment: RealEstateInvestmentData[] }>(
          query,
          { id: investmentId }
        );

        console.log('Query result by RealEstateInvestment.id:', result);

        // Step 2: If not found by RealEstateInvestment.id, try as Investment.id (investmentId)
        if (!result.RealEstateInvestment || result.RealEstateInvestment.length === 0) {
          console.log('Not found by RealEstateInvestment.id, trying as Investment.id (investmentId)');
          
          const fallbackQuery = `
            query GetRealEstateInvestmentByInvestmentId($investmentId: uuid!) {
              RealEstateInvestment(where: { investmentId: { _eq: $investmentId } }, limit: 1) {
                ${baseQuery}
              }
            }
          `;

          result = await graphqlClient.request<{ RealEstateInvestment: RealEstateInvestmentData[] }>(
            fallbackQuery,
            { investmentId }
          );

          console.log('Fallback query result by Investment.id:', result);
        }
      }

      // Step 3: If still no result or no investmentId provided, get first available for demo
      if (!result || !result.RealEstateInvestment || result.RealEstateInvestment.length === 0) {
        if (!investmentId) {
          // Only get demo data if no specific investmentId was requested
          console.log('No investmentId provided, getting first available real estate investment for demo purposes');
          
          const demoQuery = `
            query GetFirstRealEstateInvestment {
              RealEstateInvestment(limit: 1, orderBy: { createdAt: ASC }) {
                ${baseQuery}
              }
            }
          `;

          result = await graphqlClient.request<{ RealEstateInvestment: RealEstateInvestmentData[] }>(
            demoQuery
          );

          console.log('Demo query result (first available):', result);
        } else {
          // Specific investmentId was provided but not found
          const errorMsg = `Real estate investment with ID "${investmentId}" not found in the database.`;
          console.warn(errorMsg);
          setError(errorMsg);
          return;
        }
      }

      if (result?.RealEstateInvestment && result.RealEstateInvestment.length > 0) {
        const realEstateInvestment = result.RealEstateInvestment[0];
        console.log('Successfully fetched real estate data:', realEstateInvestment);
        setRealEstateData(realEstateInvestment);
        setError(null);
      } else {
        const errorMsg = `No real estate investments found in the database. Please check if data exists.`;
        console.warn(errorMsg);
        setError(errorMsg);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching real estate data:', errorMessage, err);
      setError(`GraphQL Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, graphqlClient]);

  useEffect(() => {
    fetchRealEstateData();
  }, [fetchRealEstateData]);

  return {
    realEstateData,
    isLoading,
    error,
    refetch: fetchRealEstateData,
  };
}; 