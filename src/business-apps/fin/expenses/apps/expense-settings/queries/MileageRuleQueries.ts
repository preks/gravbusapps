import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export interface MileageRuleQueryVariables {
  offset?: number
  limit?: number
  search?: string
  orderBy?: any[]
  // Filter parameters
  statusFilter?: { active: boolean; inactive: boolean }
  validFromFilter?: string | null
  validToFilter?: string | null
  rulePeriodFilter?: string[]
}

export interface MileageRuleDetail {
  id: string
  amount: number
  limitFrom?: number
  limitTo?: number
  detailOrder: number
  activeFrom?: string
  activeTo?: string
  version?: number
  isDeleted: boolean
}

export interface MileageRuleData {
  id: string
  code: string
  name: string
  rulePeriod?: string
  activeFrom?: string
  activeTo?: string
  version?: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  mileageRuleDetail: MileageRuleDetail[]
}

export interface MileageRuleResponse {
  MileageRule: MileageRuleData[]
  MileageRuleAggregate: {
    aggregate: {
      count: number
    }
  }
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
    rulePeriodFilter
  } = variables

  // Build where conditions with AND logic
  const andConditions: string[] = ['isDeleted: { _eq: false }']

  // Add search conditions (OR logic across code, name, and rulePeriod)
  if (search && search.trim()) {
    const searchTerm = search.trim().replace(/"/g, '\\"')
    andConditions.push(`_or: [
      { code: { _ilike: "%${searchTerm}%" } }
      { name: { _ilike: "%${searchTerm}%" } }
      { rulePeriod: { _ilike: "%${searchTerm}%" } }
    ]`)
  }

  // Add status filter
  if (statusFilter && (statusFilter.active || statusFilter.inactive)) {
    const now = new Date().toISOString()
    const statusConditions: string[] = []

    if (statusFilter.active && statusFilter.inactive) {
      // Both selected - no filter needed (all records)
    } else if (statusFilter.active) {
      // Only active
      statusConditions.push(`_or: [
        { activeFrom: { _isNull: true }, activeTo: { _isNull: true } }
        { activeFrom: { _lte: "${now}" }, activeTo: { _isNull: true } }
        { activeFrom: { _lte: "${now}" }, activeTo: { _gte: "${now}" } }
        { activeFrom: { _isNull: true }, activeTo: { _gte: "${now}" } }
      ]`)
    } else if (statusFilter.inactive) {
      // Only inactive
      statusConditions.push(`_or: [
        { activeFrom: { _gt: "${now}" } }
        { activeTo: { _lt: "${now}" } }
      ]`)
    }

    if (statusConditions.length > 0) {
      andConditions.push(statusConditions.join(', '))
    }
  }

  // Add valid from filter
  if (validFromFilter) {
    andConditions.push(`_or: [
      { activeFrom: { _gte: "${validFromFilter}" } }
      { activeFrom: { _isNull: true } }
    ]`)
  }

  // Add valid to filter
  if (validToFilter) {
    andConditions.push(`_or: [
      { activeTo: { _lte: "${validToFilter}" } }
      { activeTo: { _isNull: true } }
    ]`)
  }

  // Add rule period filter (OR logic for multiple periods)
  if (rulePeriodFilter && rulePeriodFilter.length > 0) {
    const periodConditions = rulePeriodFilter.map(period => `{ rulePeriod: { _eq: "${period}" } }`).join(', ')
    andConditions.push(`_or: [${periodConditions}]`)
  }

  // Combine all conditions with AND
  const whereClause = `{ _and: [{ ${andConditions.join(' }, { ')} }] }`

  // Build order by conditions
  let orderByClause = '[{ name: ASC }]'
  if (orderBy.length > 0) {
    orderByClause = JSON.stringify(orderBy).replace(/"/g, '')
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
  `
}

export const useGetMileageRulesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchMileageRules = useCallback(
    async (variables: MileageRuleQueryVariables = {}) => {
      const query = GET_MILEAGE_RULES(variables)
      try {
        const result = await graphqlClient.request<MileageRuleResponse>(query)
        return result
      } catch (error) {
        console.error('Error fetching mileage rules:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchMileageRules
  }
}

// New interfaces for calculation rule usage
export interface CalculationRuleUsage {
  id: string
  code: string
  name?: string
  activeFrom: string
  activeTo?: string
  country?: {
    id: string
    code: string
    value: string
  }
  currency?: {
    id: string
    code: string
    value: string
  }
  calculationType?: {
    id: string
    code: string
    value: string
  }
}

export interface MileageRuleUsageResponse {
  ExpenseRule: CalculationRuleUsage[]
  ExpenseRuleAggregate: {
    aggregate: {
      count: number
    }
  }
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
  `
}

// Query to get usage count for multiple mileage rules
export const GET_MILEAGE_RULE_USAGE_COUNTS = (mileageRuleCodes: string[]): string => {
  return `
    query GetMileageRuleUsageCounts {
      ${mileageRuleCodes
        .map(
          code => `
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
      `
        )
        .join('')}
    }
  `
}

export const useGetCalculationRuleUsage = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCalculationRulesUsingMileageRule = useCallback(
    async (mileageRuleCode: string) => {
      const query = GET_CALCULATION_RULES_USING_MILEAGE_RULE(mileageRuleCode)
      try {
        const result = await graphqlClient.request<MileageRuleUsageResponse>(query)
        return result
      } catch (error) {
        console.error('Error fetching calculation rules using mileage rule:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchMileageRuleUsageCounts = useCallback(
    async (mileageRuleCodes: string[]) => {
      if (mileageRuleCodes.length === 0) return {}

      const query = GET_MILEAGE_RULE_USAGE_COUNTS(mileageRuleCodes)
      try {
        const result = await graphqlClient.request<any>(query)

        // Transform the result to a more usable format
        const usageCounts: Record<string, number> = {}
        mileageRuleCodes.forEach(code => {
          const key = `rule_${code.replace(/[^a-zA-Z0-9]/g, '_')}`
          usageCounts[code] = result[key]?.aggregate?.count || 0
        })

        return usageCounts
      } catch (error) {
        console.error('Error fetching mileage rule usage counts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchCalculationRulesUsingMileageRule,
    fetchMileageRuleUsageCounts
  }
}
