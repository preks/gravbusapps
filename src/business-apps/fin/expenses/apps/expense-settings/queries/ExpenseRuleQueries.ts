import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useCallback } from 'react'
import {
  ExpenseRuleAssignmentResponse,
  ExpenseRuleAssignmentQueryVariables,
  ExpenseRuleQueryVariables,
  ExpenseRuleResponse
} from '../types/ExpenseRuleTypes'

export interface ExpenseRuleAssignmentQueryParams {
  limit?: number
  offset?: number
  search?: string
  orderBy?: any[]
  filters?: any
}

export const GET_EXPENSE_RULE_ASSIGNMENTS = (variables: ExpenseRuleAssignmentQueryVariables): string => {
  const { search, offset = 0, limit = 20, activeOnly = true, orderBy } = variables

  let whereCondition = ''
  const conditions: string[] = []

  // Always filter out deleted records
  conditions.push('isDeleted: {_eq: false}')

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
    ]`)
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
    ]`)
  }

  if (conditions.length > 0) {
    whereCondition = `where: {${conditions.join(', ')}}`
  }

  // Build orderBy string
  let orderByString = ''
  if (orderBy && orderBy.length > 0) {
    const orderByItems = orderBy
      .map((item: any) => {
        const key = Object.keys(item)[0]
        const value = item[key]
        if (typeof value === 'object') {
          // Nested orderBy (e.g., expenseRule: { code: ASC })
          const nestedKey = Object.keys(value)[0]
          const nestedValue = value[nestedKey]
          return `${key}: {${nestedKey}: ${nestedValue}}`
        }
        return `${key}: ${value}`
      })
      .join(', ')
    orderByString = `orderBy: {${orderByItems}}`
  } else {
    orderByString = 'orderBy: {assignmentOrder: ASC_NULLS_LAST}'
  }

  return `
    query GetExpenseRuleAssignments {
      ExpenseRuleAssignment(
        ${whereCondition}
        offset: ${offset}
        limit: ${limit}
        ${orderByString}
      ) {
        id
        assignmentOrder
        cascading
        applicants
        activeFrom
        activeTo
        version
        createdAt
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
  `
}

export const GET_EXPENSE_RULES = (variables: ExpenseRuleQueryVariables): string => {
  const { search, offset = 0, limit = 20, activeOnly = true } = variables

  let whereCondition = ''
  const conditions: string[] = []

  // Always filter out deleted records
  conditions.push('isDeleted: {_eq: false}')

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
    ]`)
  }

  if (search) {
    const searchTerm = search.trim().replace(/"/g, '\\"')
    conditions.push(`_or: [
      {code: {_ilike: "%${searchTerm}%"}},
      {name: {_ilike: "%${searchTerm}%"}},
      {currency: {value: {_ilike: "%${searchTerm}%"}}},
      {calculationType: {value: {_ilike: "%${searchTerm}%"}}}
    ]`)
  }

  if (conditions.length > 0) {
    whereCondition = `where: {${conditions.join(', ')}}`
  }

  return `
    query GetExpenseRules {
      ExpenseRule(
        ${whereCondition}
        offset: ${offset}
        limit: ${limit}
        orderBy: {createdAt: DESC_NULLS_LAST}
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
        createdAt
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
          calculation {
            id
            code
            value
            description
          }
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
  `
}

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
  `
}

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
  `
}

export const GET_EMPLOYEES_FOR_ASSIGNMENT = (): string => {
  return `
    query GetEmployeesForAssignment(
      $where: EmployeePositionBoolExp
      $activeUserLocale: String!
      $today: timestamptz!
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
          
          workingCondition(
            where: {
              isDeleted: {_eq: false}
              _or: [
                {activeFrom: {_isNull: true}, activeTo: {_isNull: true}}
                {
                  activeFrom: {_lte: $today}
                  _or: [{activeTo: {_isNull: true}}, {activeTo: {_gte: $today}}]
                }
              ]
            }
            orderBy: [{activeFrom: DESC}, {createdAt: DESC}]
            limit: 1
          ) {
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
  `
}

export const useGetExpenseRuleAssignments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleAssignments = useCallback(
    async (variables: ExpenseRuleAssignmentQueryVariables = {}) => {
      const query = GET_EXPENSE_RULE_ASSIGNMENTS(variables)
      try {
        const result = await graphqlClient.request<ExpenseRuleAssignmentResponse>(query)
        return result
      } catch (error) {
        console.error('Error fetching expense rule assignments:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleAssignments }
}

export const useGetExpenseRules = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRules = useCallback(
    async (variables: ExpenseRuleQueryVariables = {}) => {
      const query = GET_EXPENSE_RULES(variables)
      try {
        const result = await graphqlClient.request<ExpenseRuleResponse>(query)
        return result
      } catch (error) {
        console.error('Error fetching expense rules:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRules }
}

// ✅ NEW: Individual item fetch queries for fresh data loading
export const GET_MILEAGE_RULE_BY_ID = (mileageRuleId: string): string => {
  return `
    query GetMileageRuleById {
      ExpenseRuleMileage(where: { id: { _eq: "${mileageRuleId}" }, isDeleted: { _eq: false } }) {
        id
        version
        code
        name
        reimbursable
        taxCodeRef
        taxValue
        unitPrice
        mileageOrder
        activeFrom
        activeTo
        wageCode
        businessKey
        additionalProperties
        expenseGroup {
          id
          code
          value
        }
        measurementUnit {
          id
          code
          value
        }
        mileageRule {
          id
          code
          name
        }
      }
    }
  `
}

export const GET_GENERAL_EXPENSE_BY_ID = (generalExpenseId: string): string => {
  return `
    query GetGeneralExpenseById {
      ExpenseRuleGeneralExpense(where: { id: { _eq: "${generalExpenseId}" }, isDeleted: { _eq: false } }) {
        id
        version
        code
        name
        reimbursable
        taxCodeRef
        taxValue
        activeFrom
        activeTo
        businessKey
        additionalProperties
        expenseGroup {
          id
          code
          value
        }
      }
    }
  `
}

export const GET_DEDUCTION_BY_ID = (deductionId: string): string => {
  return `
    query GetDeductionById {
      ExpenseRuleDeduction(where: { id: { _eq: "${deductionId}" }, isDeleted: { _eq: false } }) {
        id
        version
        deductBreakfast
        deductLunch
        deductDinner
        taxBreakfast
        taxLunch
        taxDinner
        deductionDay
        deductionOrder
        overnightAllowance
        activeFrom
        activeTo
        businessKey
        additionalProperties
      }
    }
  `
}

// ✅ Hooks for fetching individual items
export const useGetMileageRuleById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchMileageRuleById = useCallback(
    async (id: string) => {
      const query = GET_MILEAGE_RULE_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleMileage: any[] }>(query)
        return result.ExpenseRuleMileage?.[0] || null
      } catch (error) {
        console.error('Error fetching mileage rule by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchMileageRuleById }
}

export const useGetGeneralExpenseById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchGeneralExpenseById = useCallback(
    async (id: string) => {
      const query = GET_GENERAL_EXPENSE_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleGeneralExpense: any[] }>(query)
        return result.ExpenseRuleGeneralExpense?.[0] || null
      } catch (error) {
        console.error('Error fetching general expense by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchGeneralExpenseById }
}

export const useGetDeductionById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchDeductionById = useCallback(
    async (id: string) => {
      const query = GET_DEDUCTION_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleDeduction: any[] }>(query)
        return result.ExpenseRuleDeduction?.[0] || null
      } catch (error) {
        console.error('Error fetching deduction by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchDeductionById }
}

// ✅ NEW: Main entity queries for lists and forms
export const GET_MILEAGE_RULE_STANDALONE_BY_ID = (mileageRuleId: string): string => {
  return `
    query GetMileageRuleById {
      MileageRule(where: { id: { _eq: "${mileageRuleId}" }, isDeleted: { _eq: false } }) {
        id
        version
        code
        name
        activeFrom
        activeTo
        ruleOrder
        rulePeriod
        businessKey
        additionalProperties
        mileageRuleDetail(where: { isDeleted: { _eq: false } }, orderBy: { detailOrder: ASC }) {
          id
          version
          limitFrom
          limitTo
          amount
          detailOrder
          activeFrom
          activeTo
          businessKey
          additionalProperties
        }
      }
    }
  `
}

export const GET_ALLOWANCE_REGION_RULE_BY_ID = (allowanceRegionRuleId: string): string => {
  return `
    query GetAllowanceRegionRuleById {
      AllowanceRegionRule(where: { id: { _eq: "${allowanceRegionRuleId}" }, isDeleted: { _eq: false } }) {
        id
        version
        code
        name
        activeFrom
        activeTo
        ruleOrder
        businessKey
        additionalProperties
        allowanceRegionRuleDetail(where: { isDeleted: { _eq: false } }) {
          id
          version
          amount
          activeFrom
          activeTo
          home
          travelRegionRef
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
          travelRegion {
            id
            code
            value
          }
          businessKey
          additionalProperties
        }
      }
    }
  `
}

// ✅ NEW: Hooks for main entities
export const useGetMileageRuleStandaloneById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchMileageRuleById = useCallback(
    async (id: string) => {
      const query = GET_MILEAGE_RULE_STANDALONE_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ MileageRule: any[] }>(query)
        return result.MileageRule?.[0] || null
      } catch (error) {
        console.error('Error fetching mileage rule by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchMileageRuleById }
}

export const useGetAllowanceRegionRuleById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAllowanceRegionRuleById = useCallback(
    async (id: string) => {
      const query = GET_ALLOWANCE_REGION_RULE_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ AllowanceRegionRule: any[] }>(query)
        return result.AllowanceRegionRule?.[0] || null
      } catch (error) {
        console.error('Error fetching allowance region rule by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchAllowanceRegionRuleById }
}

export const GET_EXPENSE_RULE_ASSIGNMENT_BY_ID = (assignmentId: string): string => {
  return `
    query GetExpenseRuleAssignmentById {
      ExpenseRuleAssignment(where: { id: { _eq: "${assignmentId}" }, isDeleted: { _eq: false } }) {
        id
        version
        cascading
        applicants
        activeFrom
        activeTo
        assignmentOrder
        businessKey
        additionalProperties
        expenseRule {
          id
          code
          name
        }
        employee {
          id
          firstName
          lastName
          displayName
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
        }
        employmentType {
          id
          code
          value
        }
        contractType {
          id
          code
          value
        }
        employeeId
        companyId
        organizationalUnitId
        siteLocationId
        employmentTypeRef
        contractTypeRef
        expenseRuleId
      }
    }
  `
}

export const useGetExpenseRuleAssignmentById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleAssignmentById = useCallback(
    async (id: string) => {
      const query = GET_EXPENSE_RULE_ASSIGNMENT_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleAssignment: any[] }>(query)
        return result.ExpenseRuleAssignment?.[0] || null
      } catch (error) {
        console.error('Error fetching expense rule assignment by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleAssignmentById }
}

// ✅ NEW: Additional queries for remaining forms
export const GET_EXPENSE_RULE_ALLOWANCE_CODE_BY_ID = (allowanceCodeId: string): string => {
  return `
    query GetExpenseRuleAllowanceCodeById {
      ExpenseRuleAllowanceCode(where: { id: { _eq: "${allowanceCodeId}" }, isDeleted: { _eq: false } }) {
        id
        version
        code
        name
        amount
        calculation {
          id
          code
          value
          description
        }
        calculationRef
        codeOrder
        activeFrom
        activeTo
        businessKey
        additionalProperties
        expenseGroup {
          id
          code
          value
        }
        expenseRule {
          id
          code
          name
        }
        expenseRuleId
        expenseGroupRef
      }
    }
  `
}

export const GET_EXPENSE_RULE_DEDUCTION_BY_ID = (deductionId: string): string => {
  return `
    query GetExpenseRuleDeductionById {
      ExpenseRuleDeduction(where: { id: { _eq: "${deductionId}" }, isDeleted: { _eq: false } }) {
        id
        version
        deductBreakfast
        deductLunch
        deductDinner
        taxBreakfast
        taxLunch
        taxDinner
        deductionDay
        deductionOrder
        overnightAllowance
        activeFrom
        activeTo
        businessKey
        additionalProperties
        expenseRule {
          id
          code
          name
        }
        expenseRuleId
      }
    }
  `
}

export const GET_EXPENSE_RULE_OTHER_INFO_BY_ID = (otherInfoId: string): string => {
  return `
    query GetExpenseRuleOtherInfoById {
      ExpenseRuleOtherInfo(where: { id: { _eq: "${otherInfoId}" }, isDeleted: { _eq: false } }) {
        id
        version
        source
        infoValue
        mandatory
        activeFrom
        activeTo
        businessKey
        additionalProperties
        expenseRule {
          id
          code
          name
        }
        expenseRuleId
        expenseRuleGeneralExpense {
          id
          code
          name
        }
        expenseRuleGeneralExpenseId
        expenseRuleMileage {
          id
          code
          name
        }
        expenseRuleMileageId
      }
    }
  `
}

// ✅ NEW: Hooks for the remaining entities
export const useGetExpenseRuleAllowanceCodeById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleAllowanceCodeById = useCallback(
    async (id: string) => {
      const query = GET_EXPENSE_RULE_ALLOWANCE_CODE_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleAllowanceCode: any[] }>(query)
        return result.ExpenseRuleAllowanceCode?.[0] || null
      } catch (error) {
        console.error('Error fetching expense rule allowance code by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleAllowanceCodeById }
}

export const useGetExpenseRuleDeductionById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleDeductionById = useCallback(
    async (id: string) => {
      const query = GET_EXPENSE_RULE_DEDUCTION_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleDeduction: any[] }>(query)
        return result.ExpenseRuleDeduction?.[0] || null
      } catch (error) {
        console.error('Error fetching expense rule deduction by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleDeductionById }
}

export const useGetExpenseRuleOtherInfoById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleOtherInfoById = useCallback(
    async (id: string) => {
      const query = GET_EXPENSE_RULE_OTHER_INFO_BY_ID(id)
      try {
        const result = await graphqlClient.request<{ ExpenseRuleOtherInfo: any[] }>(query)
        return result.ExpenseRuleOtherInfo?.[0] || null
      } catch (error) {
        console.error('Error fetching expense rule other info by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleOtherInfoById }
}

export const GET_EXPENSE_RULE_BY_ID = (ruleId: string): string => {
  return `
    query GetExpenseRuleById {
      ExpenseRule(
        where: {
          _and: [
            {id: {_eq: "${ruleId}"}},
            {isDeleted: {_eq: false}}
          ]
        }
        limit: 1
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
        createdAt
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
        expenseRuleFlag(where: { isDeleted: { _eq: false } }) {
          id
          code
          name
          value
          version
        }
        expenseRuleGeneralExpense(where: { isDeleted: { _eq: false } }) {
          id
          code
          name
          reimbursable
          taxCodeRef
          taxValue
          activeFrom
          activeTo
          version
          expenseGroup {
            id
            value
            code
            translations {
              value
              localeCode
            }
          }
        }
        expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { codeOrder: ASC }) {
          id
          code
          amount
          calculation {
            id
            code
            value
            description
          }
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
    }
  `
}

export const useGetExpenseRuleById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchExpenseRuleById = useCallback(
    async (ruleId: string) => {
      const query = GET_EXPENSE_RULE_BY_ID(ruleId)
      try {
        const result = await graphqlClient.request<{ ExpenseRule: any[] }>(query)
        return result.ExpenseRule?.[0] || null
      } catch (error) {
        console.error('Error fetching expense rule by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchExpenseRuleById }
}

export const useGetEmployeesForAssignment = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEmployees = useCallback(
    async (
      params: {
        search?: string
        companyId?: string
        organizationalUnitId?: string
        siteLocationId?: string
        limit?: number
        offset?: number
      } = {}
    ) => {
      const { search, companyId, organizationalUnitId, siteLocationId, limit = 20, offset = 0 } = params

      const whereConditions: any = {
        _and: [
          // Active employees: no exit date OR exit date in future
          {
            _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: 'now()' } }]
          },
          // Structure filtering
          { structureId: { _eq: getCurrentActiveStructureId() } }
        ]
      }

      const andConditions = []

      if (search && search.trim().length >= 2) {
        andConditions.push({
          _or: [{ firstName: { _ilike: `%${search}%` } }, { lastName: { _ilike: `%${search}%` } }]
        })
      }
      // If no search or search is less than 2 characters, load all active employees

      if (companyId) {
        andConditions.push({
          company: { id: { _eq: companyId } }
        })
      }

      if (organizationalUnitId) {
        andConditions.push({
          organizationalUnitId: { _eq: organizationalUnitId }
        })
      }

      if (siteLocationId) {
        andConditions.push({
          siteLocationId: { _eq: siteLocationId }
        })
      }

      if (andConditions.length > 0) {
        whereConditions._and.push(...andConditions)
      }

      const query = GET_EMPLOYEES_FOR_ASSIGNMENT()

      try {
        const result = await graphqlClient.request<{ EmployeePosition: any[] }>(query, {
          where: whereConditions,
          activeUserLocale: getCurrentActiveUserLocale(),
          today: new Date().toISOString(),
          limit,
          offset
        })

        return result
      } catch (error) {
        console.error('Error fetching employees for assignment:', error)
        throw error
      }
    },
    [graphqlClient, context.accessToken]
  )

  return { fetchEmployees }
}
