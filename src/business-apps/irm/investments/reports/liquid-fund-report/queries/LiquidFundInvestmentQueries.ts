import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { LiquidFundInvestmentQueryVariables, LiquidFundInvestmentResponse } from '../types';

const GET_LIQUID_FUND_INVESTMENT_DATA = (variables: LiquidFundInvestmentQueryVariables): string => {
  const { limit = 50, offset = 0, search, orderBy } = variables;
  
  let whereClause = '';
  if (search) {
    whereClause = `where: {
      _or: [
        { investment: { name: { _ilike: "%${search}%" } } },
        { investment: { notesSummary: { _ilike: "%${search}%" } } },
        { investment: { account: { name: { _ilike: "%${search}%" } } } },
        { accountNumber: { _ilike: "%${search}%" } }
      ]
    }`;
  }

  const orderByClause = orderBy || '[{ investment: { createdAt: DESC } }]';

  return `
    query GetLiquidFundInvestmentData {
      LiquidFundInvestment(
        limit: ${limit}
        offset: ${offset}
        orderBy: ${orderByClause}
        ${whereClause}
      ) {
        id
        investmentId
        accountNumber
        interestRate
        maturityDate
        earlyTerminationAllowed
        activeFrom
        activeTo
        createdAt
        interestPaymentFrequency {
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
      LiquidFundInvestmentAggregate${whereClause ? `(${whereClause})` : ''} {
        aggregate {
          count
          sum {
            interestRate
          }
          avg {
            interestRate
          }
        }
      }
    }
  `;
};

export const useGetLiquidFundInvestmentData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchLiquidFundInvestmentData = useCallback(async (variables: LiquidFundInvestmentQueryVariables = {}) => {
    const query = GET_LIQUID_FUND_INVESTMENT_DATA(variables);
    try {
      const result = await graphqlClient.request<LiquidFundInvestmentResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching liquid fund investment data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchLiquidFundInvestmentData };
}; 