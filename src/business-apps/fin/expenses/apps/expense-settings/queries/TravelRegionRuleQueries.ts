import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface TravelRegionRuleQueryVariables {
  offset?: number;
  limit?: number;
  search?: string;
  orderBy?: any[];
}

export interface AllowanceRegionRuleDetail {
  id: string;
  amount: number;
  country?: {
    id: string;
    value: string;
    code: string;
  };
  currency?: {
    id: string;
    value: string;
    code: string;
  };
  travelRegion?: {
    id: string;
    value: string;
    code: string;
  };
  countryRef?: string;
  currencyRef?: string;
  travelRegionRef?: string;
  activeFrom?: string;
  activeTo?: string;
  home?: boolean;
  version?: number;
  isDeleted: boolean;
}

export interface TravelRegionRuleData {
  id: string;
  code: string;
  name: string;
  activeFrom?: string;
  activeTo?: string;
  version?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  allowanceRegionRuleDetail: AllowanceRegionRuleDetail[];
}

export interface TravelRegionRuleResponse {
  AllowanceRegionRule: TravelRegionRuleData[];
  AllowanceRegionRuleAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_TRAVEL_REGION_RULES = (variables: TravelRegionRuleQueryVariables): string => {
  const { offset = 0, limit = 20, search, orderBy = [] } = variables;
  
  // Build where conditions
  let whereClause = '{ isDeleted: { _eq: false }';
  
  // Add search conditions
  if (search && search.trim()) {
    const searchTerm = search.trim().replace(/"/g, '\\"');
    whereClause += `, _or: [
      { name: { _ilike: "%${searchTerm}%" } }
      { code: { _ilike: "%${searchTerm}%" } }
    ]`;
  }
  
  whereClause += ' }';

  // Build order by conditions
  let orderByClause = '[{ name: ASC }]';
  if (orderBy.length > 0) {
    orderByClause = JSON.stringify(orderBy).replace(/"/g, '');
  }

  return `
    query GetTravelRegionRules {
      AllowanceRegionRule(
        where: ${whereClause}
        orderBy: ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        code
        name
        activeFrom
        activeTo
        version
        isDeleted
        createdAt
        updatedAt
        allowanceRegionRuleDetail(
          where: { isDeleted: { _eq: false } }
        ) {
          id
          amount
          countryRef
          currencyRef
          travelRegionRef
          home
          country {
            id
            value
            code
          }
          currency {
            id
            value
            code
          }
          travelRegion {
            id
            value
            code
          }
          activeFrom
          activeTo
          version
          isDeleted
        }
      }
      AllowanceRegionRuleAggregate(
        where: ${whereClause}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useGetTravelRegionRulesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchTravelRegionRules = useCallback(async (variables: TravelRegionRuleQueryVariables = {}) => {
    const query = GET_TRAVEL_REGION_RULES(variables);
    try {
      const result = await graphqlClient.request<TravelRegionRuleResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching travel region rules:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchTravelRegionRules };
}; 