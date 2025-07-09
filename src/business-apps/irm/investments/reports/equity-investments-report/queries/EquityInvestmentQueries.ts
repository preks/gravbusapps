import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { EquityInvestmentQueryVariables, EquityInvestmentResponse } from '../types';

const GET_EQUITY_INVESTMENT_DATA = (variables: EquityInvestmentQueryVariables): string => {
  const { limit = 50, offset = 0, search, orderBy } = variables;
  
  let whereClause = '';
  if (search) {
    whereClause = `where: {
      _or: [
        { investment: { name: { _ilike: "%${search}%" } } },
        { investment: { notesSummary: { _ilike: "%${search}%" } } },
        { investment: { account: { name: { _ilike: "%${search}%" } } } }
      ]
    }`;
  }

  const orderByClause = orderBy || '[{ investment: { createdAt: DESC } }]';

  return `
    query GetEquityInvestmentData {
      EquityInvestment(
        limit: ${limit}
        offset: ${offset}
        orderBy: ${orderByClause}
        ${whereClause}
      ) {
        id
        investmentId
        investmentRoleRef
        activeFrom
        activeTo
        currentCompanyValuation
        lastReportedEbitda
        lastReportedTurnover
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
          activeFrom
          activeTo
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
      EquityInvestmentAggregate${whereClause ? `(${whereClause})` : ''} {
        aggregate {
          count
          sum {
            currentCompanyValuation
            lastReportedEbitda
            lastReportedTurnover
          }
          avg {
            currentCompanyValuation
            lastReportedEbitda
            lastReportedTurnover
          }
        }
      }
    }
  `;
};

export const useGetEquityInvestmentData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchEquityInvestmentData = useCallback(async (variables: EquityInvestmentQueryVariables = {}) => {
    const query = GET_EQUITY_INVESTMENT_DATA(variables);
    try {
      const result = await graphqlClient.request<EquityInvestmentResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching equity investment data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchEquityInvestmentData };
}; 