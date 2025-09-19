import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { GET_EXPENSE_ITEM_STATISTICS, GET_PENDING_ITEMS, GET_PENDING_ITEMS_WITH_DATE_RANGE, GET_EXPENSE_ITEMS_BY_EMPLOYEE } from '../queries/expenseItems';
import { ExpenseStatus } from '../utils';

export interface ExpenseStats {
  totalExpenses: number | null;
  previousMonthTotalExpenses: number | null;
  pendingReimbursementTotal: number;
  previousMonthPendingReimbursementTotal: number;
  pendingItemCountFromApi: number;
  allItems: any[];
  hasLoadedAllItems: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useExpenseItemStatistics = (context: BusinessAppContextProps, currencyRef: string) => {
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: null,
    previousMonthTotalExpenses: null,
    pendingReimbursementTotal: 0,
    previousMonthPendingReimbursementTotal: 0,
    pendingItemCountFromApi: 0,
    allItems: [],
    hasLoadedAllItems: false,
    isLoading: false,
    error: null,
  });
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  const fetchItemStatistics = useCallback(async () => {
    setStats((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const employeeId = context?.userInfo?.employeeDetails?.employeeId;
      const accessToken = context?.accessToken;
      if (!employeeId || !accessToken) throw new Error('Missing employee ID or access token');

      const today = dayjs();
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      const lastMonth = today.subtract(1, 'month');
      const previousMonthStart = lastMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const previousMonthEnd = lastMonth.endOf('month').format('YYYY-MM-DD HH:mm:ss');

      const fetchStatsForPeriod = async (startDate: string, endDate: string) => {
        const res = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ query: GET_EXPENSE_ITEM_STATISTICS, variables: { employeeId, currencyRef, startDate, endDate } }),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '));
        return result.data?.totalExpenses?.aggregate?.sum?.totalAmount ?? 0;
      };

      const fetchPendingStatsForPeriod = async (startDate: string, endDate: string) => {
        const res = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ query: GET_PENDING_ITEMS_WITH_DATE_RANGE, variables: { employeeId, currencyRef, startDate, endDate } }),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '));
        return result.data?.pendingExcludingAllowance?.aggregate?.sum?.reimbursableAmount;
      };

      const [currentMonthTotal, previousMonthTotal, currentMonthPending, previousMonthPending] = await Promise.all([
        fetchStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchStatsForPeriod(previousMonthStart, previousMonthEnd),
        fetchPendingStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchPendingStatsForPeriod(previousMonthStart, previousMonthEnd),
      ]);

      if (!isMounted.current) return;
      setStats((s) => ({
        ...s,
        totalExpenses: currentMonthTotal,
        previousMonthTotalExpenses: previousMonthTotal,
        pendingReimbursementTotal: currentMonthPending,
        previousMonthPendingReimbursementTotal: previousMonthPending,
      }));
    } catch (error) {
      if (!isMounted.current) return;
      setStats((s) => ({ ...s, error: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      if (!isMounted.current) return;
      setStats((s) => ({ ...s, isLoading: false }));
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef]);

  const fetchAllItemsForStats = useCallback(async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;
    if (!employeeId || !accessToken) return;

    const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Origin': window.location.origin },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({
        query: GET_EXPENSE_ITEMS_BY_EMPLOYEE,
        variables: {
          employeeId,
          searchTerm: '%',
          limit: 1000,
          offset: 0,
          status: Object.values(ExpenseStatus),
          expenseDateStart: null,
          expenseDateEnd: null,
          totalAmountMin: null,
          totalAmountMax: null,
          currencyRef,
        },
      }),
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.errors) return;
    const responseItems = result.data?.ExpenseItem ?? [];
    const mappedItems = responseItems.map((item: any) => ({
      id: item.id,
      description: item.description,
      date: item.date,
      status: item.status,
      totalAmount: item.totalAmount,
      reimbursableAmount: item.reimbursableAmount,
      nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
      deductibleAmount: item.deductibleAmount,
      currencyRef: item.currencyRef,
      costCenter: item.costCenter,
      expenseClass: item.expenseClass,
      additionalProperties: item.additionalProperties,
      expenseItemFile: item.expenseItemFile,
      employee: item.employee,
    }));
    if (!isMounted.current) return;
    setStats((s) => ({ ...s, allItems: mappedItems, hasLoadedAllItems: true }));
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef]);

  const refreshPendingCount = useCallback(async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;
    if (!employeeId || !accessToken) return;
    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ query: GET_PENDING_ITEMS, variables: { employeeId, currencyRef } }),
      });
      if (!response.ok) return;
      const result = await response.json();
      const count = result?.data?.pendingExcludingAllowance?.aggregate?.count ?? 0;
      if (!isMounted.current) return;
      setStats((s) => ({ ...s, pendingItemCountFromApi: count }));
    } catch {
      if (!isMounted.current) return;
      setStats((s) => ({ ...s, pendingItemCountFromApi: 0 }));
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef]);

  useEffect(() => {
    fetchItemStatistics();
  }, [fetchItemStatistics]);

  return {
    ...stats,
    refetch: fetchItemStatistics,
    fetchAllItemsForStats,
    refreshPendingCount,
  };
};


