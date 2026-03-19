import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AdvancePayment } from './useMainViewAdvancePayments'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { useCurrencyRefs, usePaginationParams, useStatsFromOverview, extractLoadingError } from './overviewHelpers'

export interface AdvancePaymentsOverviewDataParams {
  managerId: string
  primaryCurrency: string | null
  mostUsedCurrency: string | null
  searchTerm: string
  statusFilter: string[]
  pageSize: number
  currentPage: number
  payOrderBy: unknown[]
}

export interface PaymentStats {
  totalCount: number
  sumAmount: number
  pendingCount: number
  pendingAmount: number
}

export function useAdvancePaymentsOverviewData(
  context: BusinessAppContextProps,
  params: AdvancePaymentsOverviewDataParams
) {
  const { managerId, primaryCurrency, mostUsedCurrency, searchTerm, statusFilter, pageSize, currentPage, payOrderBy } =
    params

  const { currencyRef, statsCurrencyRef: payStatsCurrencyRef } = useCurrencyRefs(primaryCurrency, mostUsedCurrency)
  const paymentsParams = usePaginationParams(pageSize, currentPage, payOrderBy)

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      payStatsCurrencyRef,
      searchTerm,
      payments: paymentsParams,
      paymentsStatus: statusFilter.length > 0 ? statusFilter : undefined,
      requests: { limit: 0, offset: 0 },
      plans: { limit: 0, offset: 0 }
    }),
    [managerId, currencyRef, payStatsCurrencyRef, searchTerm, paymentsParams, statusFilter]
  )

  const overview = useManagerExpensesOverview(context, overviewParams)

  const payStats = useStatsFromOverview<PaymentStats, typeof overview.data>(
    overview.data,
    d => ({
      totalCount: d?.totalPaymentsAll ?? 0,
      sumAmount: d?.paymentTotalAmount ?? 0,
      pendingCount: d?.pendingPaymentsAll ?? 0,
      pendingAmount: d?.paymentPendingAmount ?? 0
    }),
    [
      overview.data?.totalPaymentsAll,
      overview.data?.paymentTotalAmount,
      overview.data?.pendingPaymentsAll,
      overview.data?.paymentPendingAmount
    ]
  )

  const advancePayments = useMemo((): AdvancePayment[] => {
    const rows = overview.data?.advancePayments ?? []
    return rows.map((p: Record<string, unknown>) => ({
      id: p.id,
      code: p.code,
      description: (p.description as string) ?? null,
      status: p.status,
      amount: Number(p.amount ?? 0),
      currencyRef: p.currencyRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      paymentMethod: p.paymentMethod,
      decisionDate: p.decisionDate,
      transactionDate: p.transactionDate,
      costCenter: p.costCenter,
      project: p.project,
      expensePlan: p.expensePlan
    })) as AdvancePayment[]
  }, [overview.data?.advancePayments])

  const { loading: paymentsLoading, error: paymentsError } = extractLoadingError(overview)
  const { loading: statsLoading, error: statsError } = extractLoadingError(overview)
  const totalCount = overview.data?.advancePaymentsTotal ?? 0

  const availableCurrencies = useMemo(() => {
    return overview.data?.distinctCurrenciesFromPayments ?? overview.data?.distinctCurrencies ?? []
  }, [overview.data?.distinctCurrenciesFromPayments, overview.data?.distinctCurrencies])

  return {
    payStats,
    statsLoading,
    statsError,
    advancePayments,
    paymentsLoading,
    paymentsError,
    totalCount,
    availableCurrencies,
    refetch: overview.refetch
  }
}
