import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { useCallback } from 'react';
import { 
  ExpenseRuleAssignment, 
  ExpenseRuleAssignmentResponse, 
  ExpenseRuleAssignmentQueryVariables,
  ExpenseRule,
  ExpenseRuleQueryVariables,
  ExpenseRuleResponse,
  Employee,
  EmployeeQueryVariables,
  EmployeeResponse
} from '../types/ExpenseRuleTypes';

export interface ExpenseRuleAssignmentQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any[];
  filters?: any;
}

export const GET_EXPENSE_RULE_ASSIGNMENTS = (variables: ExpenseRuleAssignmentQueryVariables): string => {
  const { search, offset = 0, limit = 20, activeOnly = true } = variables;
  
  let whereCondition = '';
  const conditions: string[] = [];
  
  // Always filter out deleted records
  conditions.push('isDeleted: {_eq: false}');
  
  if (activeOnly) {
    conditions.push(`_and: [
      {
        _or: [
          {activeFrom: {_eq: null}},
          {activeFrom: {_lte: "now()"}}
        ]
      },
      {
        _or: [
          {activeTo: {_eq: null}},
          {activeTo: {_gte: "now()"}}
        ]
      }
    ]`);
  }
  
  if (search) {
    conditions.push(`_or: [
      {expenseRule: {_and: [{code: {_ilike: "%${search}%"}}, {isDeleted: {_eq: false}}]}},
      {expenseRule: {_and: [{name: {_ilike: "%${search}%"}}, {isDeleted: {_eq: false}}]}},
      {employee: {_and: [{firstName: {_ilike: "%${search}%"}}, {isDeleted: {_eq: false}}]}},
      {employee: {_and: [{lastName: {_ilike: "%${search}%"}}, {isDeleted: {_eq: false}}]}},
      {company: {name: {_ilike: "%${search}%"}}},
      {organizationalUnit: {name: {_ilike: "%${search}%"}}},
      {siteLocation: {name: {_ilike: "%${search}%"}}}
    ]`);
  }
  
  if (conditions.length > 0) {
    whereCondition = `where: {${conditions.join(', ')}}`;
  }

  return `
    query GetExpenseRuleAssignments {
      ExpenseRuleAssignment(
        ${whereCondition}
        offset: ${offset}
        limit: ${limit}
        orderBy: {assignmentOrder: ASC}
      ) {
        id
        assignmentOrder
        cascading
        applicants
        activeFrom
        activeTo
        version
        expenseRuleId
        employeeId
        companyId
        organizationalUnitId
        siteLocationId
        expenseRule {
          id
          code
          name
          standard
          activeFrom
          activeTo
          deductionLimit
          useLastCountry
          useSingleCurrency
          taxesCode
          nonpayableCode
          version
          calculationType {
            id
            code
            value
          }
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
        }
        employee {
          id
          firstName
          lastName
        }
        company {
          id
          name
        }
        organizationalUnit {
          id
          name
        }
        siteLocation {
          id
          name
          countryRef
        }
        contractType {
          id
          code
          value
        }
        employmentType {
          id
          code
          value
        }
      }
      ExpenseRuleAssignmentAggregate(${whereCondition}) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const GET_EXPENSE_RULES = (variables: ExpenseRuleQueryVariables): string => {
  const { search, offset = 0, limit = 20, activeOnly = true } = variables;
  
  let whereCondition = '';
  const conditions: string[] = [];
  
  // Always filter out deleted records
  conditions.push('isDeleted: {_eq: false}');
  
  if (activeOnly) {
    conditions.push(`_and: [
      {
        _or: [
          {activeFrom: {_eq: null}},
          {activeFrom: {_lte: "now()"}}
        ]
      },
      {
        _or: [
          {activeTo: {_eq: null}},
          {activeTo: {_gte: "now()"}}
        ]
      }
    ]`);
  }
  
  if (search) {
    conditions.push(`_or: [
      {code: {_ilike: "%${search}%"}},
      {name: {_ilike: "%${search}%"}}
    ]`);
  }
  
  if (conditions.length > 0) {
    whereCondition = `where: {${conditions.join(', ')}}`;
  }

  return `
    query GetExpenseRules {
      ExpenseRule(
        ${whereCondition}
        offset: ${offset}
        limit: ${limit}
        orderBy: {code: ASC}
      ) {
        id
        code
        name
        standard
        activeFrom
        activeTo
        deductionLimit
        advancePaymentCode
        useLastCountry
        useSingleCurrency
        taxesCode
        nonpayableCode
        version
        calculationType {
          id
          code
          value
        }
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
        expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { codeOrder: ASC }) {
          id
          code
          amount
          abroad
          calculation
          codeOrder
          activeFrom
          activeTo
          version
          isDeleted
        }
        expenseRuleDeduction(where: { isDeleted: { _eq: false } }, orderBy: { deductionOrder: ASC }) {
          id
          deductBreakfast
          deductLunch
          deductDinner
          deductionDay
          deductionOrder
          overnightAllowance
          activeFrom
          activeTo
          version
          isDeleted
        }
        expenseRuleMileage(where: { isDeleted: { _eq: false } }, orderBy: { mileageOrder: ASC }) {
          id
          code
          mileageOrder
          unitPrice
          taxValue
          activeFrom
          activeTo
          version
          isDeleted
        }
      }
      ExpenseRuleAggregate(${whereCondition}) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const GET_MILEAGE_RULES = (): string => {
  return `
    query GetMileageRules(
      $where: MileageRuleBoolExp
      $orderBy: [MileageRuleOrderBy!]
      $limit: Int
      $offset: Int
    ) {
      MileageRule(
        where: {_and: [{isDeleted: {_eq: false}}, $where]}
        limit: $limit
        offset: $offset
        orderBy: $orderBy
      ) {
        id
        code
        name
        description
        rateType
        rateAmount
        currency

        activeFrom
        activeTo
        version
        isDeleted
        
        mileageRuleDetails {
          id
          category
          rate
          currency
          minDistance
          maxDistance
          conditions
          version
        }
      }
    }
  `;
};

export const GET_ALLOWANCE_REGION_RULES = (): string => {
  return `
    query GetAllowanceRegionRules(
      $where: AllowanceRegionRuleBoolExp
      $orderBy: [AllowanceRegionRuleOrderBy!]
      $limit: Int
      $offset: Int
    ) {
      AllowanceRegionRule(
        where: {_and: [{isDeleted: {_eq: false}}, $where]}
        limit: $limit
        offset: $offset
        orderBy: $orderBy
      ) {
        id
        code
        name
        description
        regionType
        countryCode
        cityName
        activeFrom
        activeTo
        version
        isDeleted
        
        allowanceRegionRuleDetails {
          id
          category
          allowanceType
          amount
          currency
          conditions
          version
        }
      }
    }
  `;
};

export const GET_EMPLOYEES_FOR_ASSIGNMENT = (): string => {
  return `
    query GetEmployeesForAssignment(
      $where: EmployeePositionBoolExp
      $activeUserLocale: String!
      $limit: Int
      $offset: Int
    ) {
      EmployeePosition(
        where: $where
        limit: $limit
        offset: $offset
        orderBy: {firstName: ASC}
      ) {
        id
        employeeId
        firstName
        lastName
        
        employee {
          id
          displayName
          
          workingCondition {
            contractType {
              id
              value
              translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                localeCode
                value
              }
              catalog {
                defaultLocale
              }
            }
            employmentType {
              id
              value
              translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                localeCode
                value
              }
              catalog {
                defaultLocale
              }
            }
          }
        }
        
        company {
          id
          name
        }
        organizationalUnit {
          id
          name
        }
        siteLocation {
          id
          name
          countryRef
        }
      }
    }
  `;
};

export const useGetExpenseRuleAssignments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchExpenseRuleAssignments = useCallback(async (variables: ExpenseRuleAssignmentQueryVariables = {}) => {
    const query = GET_EXPENSE_RULE_ASSIGNMENTS(variables);
    try {
      const result = await graphqlClient.request<ExpenseRuleAssignmentResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching expense rule assignments:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchExpenseRuleAssignments };
};

export const useGetExpenseRules = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchExpenseRules = useCallback(async (variables: ExpenseRuleQueryVariables = {}) => {
    const query = GET_EXPENSE_RULES(variables);
    try {
      const result = await graphqlClient.request<ExpenseRuleResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching expense rules:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchExpenseRules };
};

export const useGetEmployeesForAssignment = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchEmployees = useCallback(async (params: {
    search?: string;
    companyId?: string;
    organizationalUnitId?: string;
    siteLocationId?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const {
      search,
      companyId,
      organizationalUnitId,
      siteLocationId,
      limit = 20,
      offset = 0
    } = params;
    
    const whereConditions: any = {
      _and: [
        // Active employees: no exit date OR exit date in future
        {
          _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: "now()" } }
          ]
        },
        // Structure filtering
        { structureId: { _eq: getCurrentActiveStructureId() } }
      ]
    };
    
    const andConditions = [];
    
    if (search && search.trim().length >= 2) {
      andConditions.push({
        _or: [
          { firstName: { _ilike: `%${search}%` } },
          { lastName: { _ilike: `%${search}%` } }
        ]
      });
    }
    // If no search or search is less than 2 characters, load all active employees
    
    if (companyId) {
      andConditions.push({
        company: { id: { _eq: companyId } }
      });
    }
    
    if (organizationalUnitId) {
      andConditions.push({
        organizationalUnitId: { _eq: organizationalUnitId }
      });
    }
    
    if (siteLocationId) {
      andConditions.push({
        siteLocationId: { _eq: siteLocationId }
      });
    }
    
    if (andConditions.length > 0) {
      whereConditions._and.push(...andConditions);
    }
    
    const query = GET_EMPLOYEES_FOR_ASSIGNMENT();
    
    try {
      const result = await graphqlClient.request<{ EmployeePosition: any[] }>(query, {
        where: whereConditions,
        activeUserLocale: getCurrentActiveUserLocale(),
        limit,
        offset
      });
      console.log('useGetEmployeesForAssignment query variables:', {
        where: whereConditions,
        activeUserLocale: getCurrentActiveUserLocale(),
        limit,
        offset
      });
      console.log('useGetEmployeesForAssignment result:', result);
      console.log('useGetEmployeesForAssignment EmployeePosition count:', result?.EmployeePosition?.length);
      console.log('useGetEmployeesForAssignment first few IDs:', result?.EmployeePosition?.slice(0, 3)?.map((emp: any) => ({ id: emp.employeeId, name: `${emp.firstName} ${emp.lastName}` })));
      return result;
    } catch (error) {
      console.error('Error fetching employees for assignment:', error);
      throw error;
    }
  }, [graphqlClient, context.accessToken]);

  return { fetchEmployees };
}; 