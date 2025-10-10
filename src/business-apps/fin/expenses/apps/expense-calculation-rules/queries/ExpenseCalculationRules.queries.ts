import { useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface ExpenseRuleOrderByInput {
  field: string
  direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
}

export interface FetchExpenseRulesVariables {
  orderBy?: ExpenseRuleOrderByInput[]
  limit?: number
  offset?: number
  search?: string
  validityFrom?: string | null
  validityTo?: string | null
  standard?: boolean | null
  calculationTypeCodes?: string[] // from calculation types filter
}

export const GET_CALCULATION_TYPES = (): string => {
  const activeUserLocale = getCurrentActiveUserLocale()
  return `
  query getCalculationTypes($activeUserLocale: String!) {
    calculationType: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "ExpenseCalculationType" } } }
      orderBy: { value: ASC }
    ) {
      value
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        localeCode
        value
      }
      catalog { defaultLocale }
      id
      code
    }
  }
  `
}

export const GET_EXPENSE_RULE_FLAGS = `
query getRuleFlags($id: uuid!) {
  ExpenseRuleFlag(where: { expenseRuleId: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      version
      expenseRuleId
      value
      name
  }
}
`
export const buildGetExpenseRulesQuery = (): string => {
  // where conditions are built via variables substituted inline in GraphQL by concatenating fragments
  return `
  query getExpenseRules($orderBy: [ExpenseRuleOrderBy!] = [{ createdAt: DESC }], $limit: Int, $offset: Int, $where: ExpenseRuleBoolExp, $activeUserLocale: String!) {
    ExpenseRule(orderBy: $orderBy, limit: $limit, offset: $offset, where: $where) {
      id
      version
      code
      calculationType{
      value
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        localeCode
        value
      }
      catalog { defaultLocale }
      id
      code
    }
      standard
      activeFrom
      activeTo
      name
      currencyRef
      currency{
      id
      code
      }
      deductionLimit
      taxesCode
      useLastCountry
      nonpayableCode
      advancePaymentCode
      countryRef
      useSingleCurrency
    }
    ExpenseRuleFlag {
      expenseRuleId
      value
      name
    }
    ExpenseRuleAggregate(where: $where) {
      aggregate { count }
    }
  }
  `
}

export const getExpensesWithRulePk = `query ExpenseRuleAggregateByCode($ruleId: uuid) {
  ExpenseItemAggregate(where: {expenseRuleId: {_eq: $ruleId}}) {
    aggregate {
      count
    }
  }
  ExpenseRequestAggregate(where: {expenseRuleId: {_eq: $ruleId}}) {
    aggregate {
      count
    }
  }
  ExpensePlanAggregate(where: {expenseRuleId: {_eq: $ruleId}}){
    aggregate {
      count
    }
  }
}
`

export interface ExpenseRuleRecord {
  id: string
  version?: string
  code?: string
  calculationType?: any
  standard?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  name?: string
  currency?: any
}

export interface ExpenseRuleQueryResponse {
  ExpenseRule: ExpenseRuleRecord[]
  ExpenseRuleAggregate: { aggregate: { count: number } }
}

export const useExpenseCalculationRulesQueries = (context: BusinessAppContextProps) => {
  const client = useGraphqlClient(context.accessToken)

  const fetchCalculationTypes = useCallback(async () => {
    const query = GET_CALCULATION_TYPES()
    const result = await client.request<{ calculationType: any[] }>(query, {
      activeUserLocale: getCurrentActiveUserLocale()
    })
    return result.calculationType
  }, [client])

  const fetchExpenseRules = useCallback(
    async (variables: { orderBy?: any[]; limit?: number; offset?: number; where?: any; activeUserLocale: string }) => {
      const query = buildGetExpenseRulesQuery()
      const result = await client.request<ExpenseRuleQueryResponse>(query, variables)
      return result
    },
    [client]
  )

  return { fetchCalculationTypes, fetchExpenseRules }
}
