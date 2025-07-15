import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PrivateEquityInvestmentQueryVariables, PrivateEquityInvestmentResponse } from '../types';
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits';

const GET_PRIVATE_EQUITY_INVESTMENT_DATA = (variables: PrivateEquityInvestmentQueryVariables): string => {
  const { limit = 50, offset = 0, search, orderBy } = variables;
  const safeLimit = enforceQueryLimit(limit);
  
  let whereClause = '';
  if (search) {
    whereClause = `where: {
      _or: [
        { investment: { name: { _ilike: "%${search}%" } } },
        { investment: { notesSummary: { _ilike: "%${search}%" } } },
        { investment: { account: { name: { _ilike: "%${search}%" } } } },
        { investmentRole: { value: { _ilike: "%${search}%" } } }
      ]
    }`;
  }

  const orderByClause = orderBy || '[{ investment: { createdAt: DESC } }]';

  return `
    query GetPrivateEquityInvestmentData {
      PrivateEquityInvestment(
        limit: ${safeLimit}
        offset: ${offset}
        orderBy: ${orderByClause}
        ${whereClause}
      ) {
        id
        investmentId
        investmentRoleRef
        activeFrom
        activeTo
        createdAt
        investmentRole {
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
      PrivateEquityInvestmentAggregate${whereClause ? `(${whereClause})` : ''} {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useGetPrivateEquityInvestmentData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchPrivateEquityInvestmentData = useCallback(async (variables: PrivateEquityInvestmentQueryVariables = {}) => {
    const query = GET_PRIVATE_EQUITY_INVESTMENT_DATA(variables);
    try {
      const result = await graphqlClient.request<PrivateEquityInvestmentResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching private equity investment data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchPrivateEquityInvestmentData };
}; 