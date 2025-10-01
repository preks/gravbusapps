import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_USED_ADVANCE_PAYMENT_CURRENCIES } from '../queries/advancePayments';
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils';
import { fetchEmployeeCurrencyStats } from '../utils/currencyDataService';

export interface CurrencyStat {
  ref: string;
  code: string;
  count: number;
}

export const useAdvancePaymentCurrencies = (
  context?: BusinessAppContextProps,
  selectedFilters: string[] = [],
  setFilters?: (filters: string[]) => void
) => {
  const [currencyStats, setCurrencyStats] = useState<CurrencyStat[]>([]);
  const hasPreselectedCurrencyRef = useRef<boolean>(false);

  const selectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find((f) => f.startsWith('currency:'));
    return token ? token.substring('currency:'.length) : undefined;
  }, [selectedFilters]);

  const preselectMostUsedOnce = useCallback((stats: CurrencyStat[]) => {
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
        const stats = await fetchEmployeeCurrencyStats({
          accessToken,
          query: GET_USED_ADVANCE_PAYMENT_CURRENCIES,
          variables: { employeeId, limit: 2000 },
          dataPath: ['AdvancePayment'],
          mapRow: (r: any) => ({
            currencyRef: r.currencyRef || DEFAULT_CURRENCY_REF,
            currency: { code: r.currency?.code || 'EUR' }
          }),
        });
        setCurrencyStats(stats as CurrencyStat[]);
        preselectMostUsedOnce(stats as CurrencyStat[]);
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


