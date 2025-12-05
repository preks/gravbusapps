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

// Pre-fetch all catalogs needed for the form
export const GET_FORM_CATALOGS = (): string => {
  return `
  query getFormCatalogs($activeUserLocale: String!) {
    CalculationTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseCalculationType"}}}, orderBy: {value: ASC}) {
      code
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { defaultLocale }
    }
    Currencies: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}}, orderBy: {value: ASC}) {
      code
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { defaultLocale }
    }
    Countries: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } } }, orderBy: { value: ASC }) {
      code
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { defaultLocale }
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

  const fetchFormCatalogs = useCallback(async () => {
    const query = GET_FORM_CATALOGS()
    const result = await client.request<{
      CalculationTypes: any[]
      Currencies: any[]
      Countries: any[]
    }>(query, {
      activeUserLocale: getCurrentActiveUserLocale()
    })

    // Transform to simpler format for the form
    const getDisplayName = (entry: any) => {
      const translation = entry.translations?.[0]?.value
      if (translation) return translation
      if (entry.catalog?.defaultLocale === getCurrentActiveUserLocale()) return entry.value
      return entry.value || entry.code
    }

    return {
      calculationTypes: (result.CalculationTypes || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: getDisplayName(c)
      })),
      currencies: (result.Currencies || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: getDisplayName(c)
      })),
      countries: (result.Countries || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: getDisplayName(c)
      }))
    }
  }, [client])

  return { fetchCalculationTypes, fetchExpenseRules, fetchFormCatalogs }
}
