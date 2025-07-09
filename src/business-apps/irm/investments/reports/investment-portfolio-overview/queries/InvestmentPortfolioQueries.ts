import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InvestmentQueryVariables, InvestmentPortfolioResponse } from '../types';

const GET_INVESTMENT_PORTFOLIO_DATA = (variables: InvestmentQueryVariables): string => {
  const { limit = 50, offset = 0, search, orderBy } = variables;
  
  let whereClause = '';
  if (search) {
    whereClause = `where: {
      _or: [
        { name: { _ilike: "%${search}%" } },
        { notesSummary: { _ilike: "%${search}%" } }
      ]
    }`;
  }

  const orderByClause = orderBy || '[{ createdAt: DESC }]';

  return `
    query GetInvestmentPortfolioData {
      Investment(
        limit: ${limit}
        offset: ${offset}
        orderBy: ${orderByClause}
        ${whereClause}
      ) {
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
        createdAt
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
      InvestmentAggregate${whereClause ? `(${whereClause})` : ''} {
        aggregate {
          count
          sum {
            bookValue
            marketValue
            totalInvestmentAmount
            initialInvestmentAmount
          }
          avg {
            stakePercent
            leverageRatio
          }
        }
      }
    }
  `;
};

export const useGetInvestmentPortfolioData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentPortfolioData = useCallback(async (variables: InvestmentQueryVariables = {}) => {
    const query = GET_INVESTMENT_PORTFOLIO_DATA(variables);
    try {
      const result = await graphqlClient.request<InvestmentPortfolioResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching investment portfolio data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentPortfolioData };
}; 