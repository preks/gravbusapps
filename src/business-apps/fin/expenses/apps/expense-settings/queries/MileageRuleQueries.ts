import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface MileageRuleQueryVariables {
  offset?: number;
  limit?: number;
  search?: string;
  orderBy?: any[];
}

export interface MileageRuleDetail {
  id: string;
  amount: number;
  limitFrom?: number;
  limitTo?: number;
  detailOrder: number;
  activeFrom?: string;
  activeTo?: string;
  isDeleted: boolean;
}

export interface MileageRuleData {
  id: string;
  code: string;
  name: string;
  ruleOrder: number;
  activeFrom?: string;
  activeTo?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  mileageRuleDetail: MileageRuleDetail[];
}

export interface MileageRuleResponse {
  MileageRule: MileageRuleData[];
  MileageRuleAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_MILEAGE_RULES = (variables: MileageRuleQueryVariables): string => {
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
  let orderByClause = '[{ ruleOrder: ASC }, { name: ASC }]';
  if (orderBy.length > 0) {
    orderByClause = JSON.stringify(orderBy).replace(/"/g, '');
  }

  return `
    query GetMileageRules {
      MileageRule(
        where: ${whereClause}
        orderBy: ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        code
        name
        ruleOrder
        activeFrom
        activeTo
        isDeleted
        createdAt
        updatedAt
        mileageRuleDetail(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ detailOrder: ASC }]
        ) {
          id
          amount
          limitFrom
          limitTo
          detailOrder
          activeFrom
          activeTo
          isDeleted
        }
      }
      MileageRuleAggregate(
        where: ${whereClause}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useGetMileageRulesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchMileageRules = useCallback(async (variables: MileageRuleQueryVariables = {}) => {
    const query = GET_MILEAGE_RULES(variables);
    try {
      const result = await graphqlClient.request<MileageRuleResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching mileage rules:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchMileageRules };
}; 