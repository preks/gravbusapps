import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RealEstateInvestmentQueryVariables, RealEstateInvestmentResponse } from '../types';

const GET_REAL_ESTATE_INVESTMENT_DATA = (variables: RealEstateInvestmentQueryVariables): string => {
  const { limit = 50, offset = 0, search, orderBy } = variables;
  
  let whereClause = '';
  if (search) {
    whereClause = `where: {
      _or: [
        { investment: { name: { _ilike: "%${search}%" } } },
        { investment: { notesSummary: { _ilike: "%${search}%" } } },
        { investment: { account: { name: { _ilike: "%${search}%" } } } },
        { addressLine: { _ilike: "%${search}%" } },
        { city: { _ilike: "%${search}%" } },
        { postalCode: { _ilike: "%${search}%" } }
      ]
    }`;
  }

  const orderByClause = orderBy || '[{ investment: { createdAt: DESC } }]';

  return `
    query GetRealEstateInvestmentData {
      RealEstateInvestment(
        limit: ${limit}
        offset: ${offset}
        orderBy: ${orderByClause}
        ${whereClause}
      ) {
        id
        investmentId
        realEstateTypeRef
        countryRef
        regionRef
        addressLine
        postalCode
        city
        investmentOwnershipStructureRef
        numberOfUnits
        buildingYear
        occupancyPercent
        annualExpenses
        size
        activeFrom
        activeTo
        createdAt
        realEstateType {
          id
          value
        }
        country {
          id
          value
        }
        region {
          id
          value
        }
        investmentOwnershipStructure {
          id
          value
        }
        investment {
          id
          name
          accountId
          opportunityId
          ownerEmployeeId
          acquisitionDate
          exitDate
          plannedExitDate
          bookValue
          marketValue
          initialInvestmentAmount
          totalInvestmentAmount
          stakePercent
          debtFinancing
          leverageRatio
          notesSummary
          investmentGroup {
            id
            value
          }
          investmentType {
            id
            value
          }
          investmentPhase {
            id
            value
          }
          investmentStatus {
            id
            value
          }
          investmentRiskLevel {
            id
            value
          }
          currency {
            id
            value
          }
          account {
            id
            name
          }
          opportunity {
            id
            name
          }
        }
      }
      RealEstateInvestmentAggregate${whereClause ? `(${whereClause})` : ''} {
        aggregate {
          count
          sum {
            numberOfUnits
            occupancyPercent
            annualExpenses
          }
          avg {
            numberOfUnits
            occupancyPercent
            annualExpenses
          }
        }
      }
    }
  `;
};

export const useGetRealEstateInvestmentData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchRealEstateInvestmentData = useCallback(async (variables: RealEstateInvestmentQueryVariables = {}) => {
    const query = GET_REAL_ESTATE_INVESTMENT_DATA(variables);
    try {
      const result = await graphqlClient.request<RealEstateInvestmentResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching real estate investment data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchRealEstateInvestmentData };
}; 