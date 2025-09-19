import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE } from '../queries/expensePlans';
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils';
import { fetchEmployeeCurrencyStats } from '../utils/currencyDataService';

export interface PlanCurrencyStat {
  ref: string;
  code: string;
  count: number;
}

export const useExpensePlanCurrencies = (
  context?: BusinessAppContextProps,
  selectedFilters: string[] = [],
  setFilters?: (filters: string[]) => void
) => {
  const [currencyStats, setCurrencyStats] = useState<PlanCurrencyStat[]>([]);
  const hasPreselectedCurrencyRef = useRef<boolean>(false);

  const selectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find((f) => f.startsWith('currency:'));
    return token ? token.substring('currency:'.length) : undefined;
  }, [selectedFilters]);

  const preselectMostUsedOnce = useCallback((stats: PlanCurrencyStat[]) => {
    if (!setFilters || hasPreselectedCurrencyRef.current || stats.length === 0) return;
    const anyCurrencySelected = selectedFilters.some((f) => f.startsWith('currency:'));
    if (anyCurrencySelected) return;
    const mostUsed = stats[0];
    const nonCurrencyFilters = selectedFilters.filter((f) => !f.startsWith('currency:'));
    setFilters([...nonCurrencyFilters, `currency:${mostUsed.ref}`]);
    hasPreselectedCurrencyRef.current = true;
  }, [selectedFilters, setFilters]);

  useEffect(() => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;
    if (!employeeId || !accessToken) return;

    (async () => {
      try {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE,
            variables: { employeeId, limit: 2000 },
          }),
        });
        if (!response.ok) return;
        await response.json();
        const stats = await fetchEmployeeCurrencyStats({
          accessToken,
          query: GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE,
          variables: { employeeId, limit: 2000 },
          dataPath: ['ExpensePlan'],
          mapRow: (r: any) => ({
            currencyRef: r.currencyRef || r.expenseRequest?.[0]?.currencyRef || DEFAULT_CURRENCY_REF,
            currency: { code: r.currency?.code || r.expenseRequest?.[0]?.currency?.code || 'EUR' }
          }),
        });
        setCurrencyStats(stats as PlanCurrencyStat[]);
        preselectMostUsedOnce(stats as PlanCurrencyStat[]);
      } catch (_e) {
        // ignore
      }
    })();
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, preselectMostUsedOnce]);

  return {
    currencyStats,
    selectedCurrencyRef,
  };
};


