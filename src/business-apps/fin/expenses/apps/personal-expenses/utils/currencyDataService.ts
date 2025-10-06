import { env } from '@/common/env/EnvUtils';
import { aggregateCurrencyStats, pickMostUsedCurrencyRef, CurrencyStat, CurrencyLikeRow, DEFAULT_CURRENCY_REF } from './currencyUtils';

export type RowMapper<T> = (row: T) => CurrencyLikeRow;

export interface FetchCurrencyStatsParams<TVariables, TRow = any> {
  accessToken: string;
  query: string;
  variables: TVariables;
  dataPath: string[]; // e.g. ['ExpensePlan'] or ['ExpenseItem']
  mapRow: RowMapper<TRow>;
}

export const fetchEmployeeCurrencyStats = async <TVariables, TRow = any>(
  params: FetchCurrencyStatsParams<TVariables, TRow>
): Promise<CurrencyStat[]> => {
  const { accessToken, query, variables, dataPath, mapRow } = params;
  const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) return [];
  const result = await response.json();
  let rows: any = result?.data;
  for (const key of dataPath) {
    rows = rows?.[key];
  }
  const mapped: CurrencyLikeRow[] = (rows || []).map((r: TRow) => mapRow(r));
  return aggregateCurrencyStats(mapped, { fallbackRef: DEFAULT_CURRENCY_REF, fallbackCode: 'EUR' });
};

export const getMostUsedCurrencyRef = (stats: CurrencyStat[], fallbackRef: string = DEFAULT_CURRENCY_REF): string => {
  return pickMostUsedCurrencyRef(stats, fallbackRef);
};


