import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface MileageRuleQueryVariables {
  offset?: number;
  limit?: number;
  search?: string;
  orderBy?: any[];
  // Filter parameters
  statusFilter?: { active: boolean; inactive: boolean };
  validFromFilter?: string | null;
  validToFilter?: string | null;
  ruleCodeFilter?: string[];
  nameFilter?: string[];
  rulePeriodFilter?: string[];
}

export interface MileageRuleDetail {
  id: string;
  amount: number;
  limitFrom?: number;
  limitTo?: number;
  detailOrder: number;
  activeFrom?: string;
  activeTo?: string;
  version?: number;
  isDeleted: boolean;
}

export interface MileageRuleData {
  id: string;
  code: string;
  name: string;
  rulePeriod?: string;
  activeFrom?: string;
  activeTo?: string;
  version?: number;
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
  const { 
    offset = 0, 
    limit = 20, 
    search, 
    orderBy = [],
    statusFilter,
    validFromFilter,
    validToFilter,
    ruleCodeFilter,
    nameFilter,
    rulePeriodFilter
  } = variables;
  
  // Build where conditions with AND logic
  const andConditions: string[] = ['isDeleted: { _eq: false }'];
  
  // Add search conditions (OR logic across code, name, and rulePeriod)
  if (search && search.trim()) {
    const searchTerm = search.trim().replace(/"/g, '\\"');
    console.log('🔍 Adding search condition:', searchTerm);
    andConditions.push(`_or: [
      { code: { _ilike: "%${searchTerm}%" } }
      { name: { _ilike: "%${searchTerm}%" } }
      { rulePeriod: { _ilike: "%${searchTerm}%" } }
    ]`);
  } else {
    console.log('⚪ No search term - empty WHERE condition for search');
  }
  
  // Add status filter
  if (statusFilter && (statusFilter.active || statusFilter.inactive)) {
    const now = new Date().toISOString();
    const statusConditions: string[] = [];
    
    if (statusFilter.active && statusFilter.inactive) {
      // Both selected - no filter needed (all records)
    } else if (statusFilter.active) {
      // Only active
      statusConditions.push(`_or: [
        { activeFrom: { _is_null: true }, activeTo: { _is_null: true } }
        { activeFrom: { _lte: "${now}" }, activeTo: { _is_null: true } }
        { activeFrom: { _lte: "${now}" }, activeTo: { _gte: "${now}" } }
        { activeFrom: { _is_null: true }, activeTo: { _gte: "${now}" } }
      ]`);
    } else if (statusFilter.inactive) {
      // Only inactive
      statusConditions.push(`_or: [
        { activeFrom: { _gt: "${now}" } }
        { activeTo: { _lt: "${now}" } }
      ]`);
    }
    
    if (statusConditions.length > 0) {
      andConditions.push(statusConditions.join(', '));
    }
  }
  
  // Add valid from filter
  if (validFromFilter) {
    andConditions.push(`_or: [
      { activeFrom: { _gte: "${validFromFilter}" } }
      { activeFrom: { _is_null: true } }
    ]`);
  }
  
  // Add valid to filter
  if (validToFilter) {
    andConditions.push(`_or: [
      { activeTo: { _lte: "${validToFilter}" } }
      { activeTo: { _is_null: true } }
    ]`);
  }
  
  // Add rule code filter (OR logic for multiple codes)
  if (ruleCodeFilter && ruleCodeFilter.length > 0) {
    const codeConditions = ruleCodeFilter.map(code => `{ code: { _eq: "${code}" } }`).join(', ');
    andConditions.push(`_or: [${codeConditions}]`);
  }
  
  // Add name filter (OR logic for multiple names)
  if (nameFilter && nameFilter.length > 0) {
    const nameConditions = nameFilter.map(name => `{ name: { _eq: "${name.replace(/"/g, '\\"')}" } }`).join(', ');
    andConditions.push(`_or: [${nameConditions}]`);
  }
  
  // Add rule period filter (OR logic for multiple periods)
  if (rulePeriodFilter && rulePeriodFilter.length > 0) {
    const periodConditions = rulePeriodFilter.map(period => `{ rulePeriod: { _eq: "${period}" } }`).join(', ');
    andConditions.push(`_or: [${periodConditions}]`);
  }
  
  // Combine all conditions with AND
  const whereClause = `{ _and: [{ ${andConditions.join(' }, { ')} }] }`;

  // Build order by conditions
  let orderByClause = '[{ name: ASC }]';
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
        rulePeriod
        activeFrom
        activeTo
        version
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
          version
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

  const fetchAllMileageRuleOptions = useCallback(async () => {
    const query = GET_ALL_MILEAGE_RULE_OPTIONS();
    try {
      const result = await graphqlClient.request<MileageRuleOptionsResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching mileage rule options:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchPaginatedRuleCodes = useCallback(async (variables: {
    limit: number;
    offset: number;
    search?: string;
  }) => {
    const query = GET_PAGINATED_RULE_CODES(variables);
    try {
      const result = await graphqlClient.request<PaginatedRuleCodesResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching paginated rule codes:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchPaginatedRuleNames = useCallback(async (variables: {
    limit: number;
    offset: number;
    search?: string;
  }) => {
    const query = GET_PAGINATED_RULE_NAMES(variables);
    try {
      const result = await graphqlClient.request<PaginatedRuleNamesResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching paginated rule names:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { 
    fetchMileageRules, 
    fetchAllMileageRuleOptions,
    fetchPaginatedRuleCodes,
    fetchPaginatedRuleNames
  };
}; 

// Query to get all unique codes and names for filter options
export const GET_ALL_MILEAGE_RULE_OPTIONS = (): string => {
  return `
    query GetAllMileageRuleOptions {
      MileageRule(
        where: { isDeleted: { _eq: false } }
        orderBy: [{ code: ASC }]
      ) {
        code
        name
      }
    }
  `;
};

export interface MileageRuleOptionsResponse {
  MileageRule: {
    code: string;
    name: string;
  }[];
}

// Query to get paginated rule codes for filter
export const GET_PAGINATED_RULE_CODES = (variables: {
  limit: number;
  offset: number;
  search?: string;
}): string => {
  const whereConditions = ['isDeleted: { _eq: false }'];
  
  if (variables.search?.trim()) {
    whereConditions.push(`code: { _ilike: "%${variables.search.trim()}%" }`);
  }
  
  return `
    query GetPaginatedRuleCodes {
      MileageRule(
        where: { 
          ${whereConditions.join('\n          ')}
        }
        orderBy: [{ code: ASC }]
        limit: ${variables.limit}
        offset: ${variables.offset}
      ) {
        code
      }
    }
  `;
};

// Query to get paginated rule names for filter
export const GET_PAGINATED_RULE_NAMES = (variables: {
  limit: number;
  offset: number;
  search?: string;
}): string => {
  const whereConditions = ['isDeleted: { _eq: false }'];
  
  if (variables.search?.trim()) {
    whereConditions.push(`name: { _ilike: "%${variables.search.trim()}%" }`);
  }
  
  return `
    query GetPaginatedRuleNames {
      MileageRule(
        where: { 
          ${whereConditions.join('\n          ')}
        }
        orderBy: [{ name: ASC }]
        limit: ${variables.limit}
        offset: ${variables.offset}
      ) {
        name
      }
    }
  `;
};

export interface PaginatedRuleCodesResponse {
  MileageRule: {
    code: string;
  }[];
}

export interface PaginatedRuleNamesResponse {
  MileageRule: {
    name: string;
  }[];
}

// New interfaces for calculation rule usage
export interface CalculationRuleUsage {
  id: string;
  code: string;
  name?: string;
  activeFrom: string;
  activeTo?: string;
  country?: {
    id: string;
    code: string;
    value: string;
  };
  currency?: {
    id: string;
    code: string;
    value: string;
  };
  calculationType?: {
    id: string;
    code: string;
    value: string;
  };
}

export interface MileageRuleUsageResponse {
  ExpenseRule: CalculationRuleUsage[];
  ExpenseRuleAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to find calculation rules that use a specific mileage rule
export const GET_CALCULATION_RULES_USING_MILEAGE_RULE = (mileageRuleCode: string): string => {
  return `
    query GetCalculationRulesUsingMileageRule {
      ExpenseRule(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { expenseRuleMileage: { 
              _and: [
                { isDeleted: { _eq: false } }
                { mileageRule: { code: { _eq: "${mileageRuleCode}" } } }
              ]
            }}
          ]
        }
        orderBy: [{ code: ASC }]
      ) {
        id
        code
        name
        activeFrom
        activeTo
        country {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        calculationType {
          id
          code
          value
        }
      }
      ExpenseRuleAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { expenseRuleMileage: { 
              _and: [
                { isDeleted: { _eq: false } }
                { mileageRule: { code: { _eq: "${mileageRuleCode}" } } }
              ]
            }}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Query to get usage count for multiple mileage rules
export const GET_MILEAGE_RULE_USAGE_COUNTS = (mileageRuleCodes: string[]): string => {
  return `
    query GetMileageRuleUsageCounts {
      ${mileageRuleCodes.map(code => `
        rule_${code.replace(/[^a-zA-Z0-9]/g, '_')}: ExpenseRuleAggregate(
          where: {
            _and: [
              { isDeleted: { _eq: false } }
              { expenseRuleMileage: { 
                _and: [
                  { isDeleted: { _eq: false } }
                  { mileageRule: { code: { _eq: "${code}" } } }
                ]
              }}
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      `).join('')}
    }
  `;
};

export const useGetCalculationRuleUsage = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchCalculationRulesUsingMileageRule = useCallback(async (mileageRuleCode: string) => {
    const query = GET_CALCULATION_RULES_USING_MILEAGE_RULE(mileageRuleCode);
    try {
      const result = await graphqlClient.request<MileageRuleUsageResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching calculation rules using mileage rule:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchMileageRuleUsageCounts = useCallback(async (mileageRuleCodes: string[]) => {
    if (mileageRuleCodes.length === 0) return {};
    
    const query = GET_MILEAGE_RULE_USAGE_COUNTS(mileageRuleCodes);
    try {
      const result = await graphqlClient.request<any>(query);
      
      // Transform the result to a more usable format
      const usageCounts: Record<string, number> = {};
      mileageRuleCodes.forEach(code => {
        const key = `rule_${code.replace(/[^a-zA-Z0-9]/g, '_')}`;
        usageCounts[code] = result[key]?.aggregate?.count || 0;
      });
      
      return usageCounts;
    } catch (error) {
      console.error('Error fetching mileage rule usage counts:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { 
    fetchCalculationRulesUsingMileageRule,
    fetchMileageRuleUsageCounts
  };
}; 