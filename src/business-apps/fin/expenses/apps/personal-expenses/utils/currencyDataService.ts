import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import {
  aggregateCurrencyStats,
  pickMostUsedCurrencyRef,
  CurrencyStat,
  CurrencyLikeRow,
  DEFAULT_CURRENCY_REF
} from './currencyUtils'

export type RowMapper<T> = (row: T) => CurrencyLikeRow

export interface FetchCurrencyStatsParams<TVariables extends Record<string, any>, TRow = any> {
  accessToken: string
  query: string
  variables: TVariables
  dataPath: string[] // e.g. ['ExpensePlan'] or ['ExpenseItem']
  mapRow: RowMapper<TRow>
}

export const fetchEmployeeCurrencyStats = async <TVariables extends Record<string, any>, TRow = any>(
  params: FetchCurrencyStatsParams<TVariables, TRow>
): Promise<CurrencyStat[]> => {
  const { accessToken, query, variables, dataPath, mapRow } = params
  graphQLClient.setAccessToken(accessToken)
  const result = await graphQLClient.request<any>(query, variables)
  let rows: any = result
  for (const key of dataPath) {
    rows = rows?.[key]
  }
  const mapped: CurrencyLikeRow[] = (rows || []).map((r: TRow) => mapRow(r))
  return aggregateCurrencyStats(mapped, { fallbackRef: DEFAULT_CURRENCY_REF, fallbackCode: 'EUR' })
}

export const getMostUsedCurrencyRef = (stats: CurrencyStat[], fallbackRef: string = DEFAULT_CURRENCY_REF): string => {
  return pickMostUsedCurrencyRef(stats, fallbackRef)
}
