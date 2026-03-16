import { useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AdvancePayment } from './useMainViewAdvancePayments'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { standardizeCurrencyRef } from '../utils/currencyUtils'

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

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  const effectiveStatsCurrency = primaryCurrency ?? mostUsedCurrency ?? null
  const payStatsCurrencyRef = useMemo(
    () => (effectiveStatsCurrency ? standardizeCurrencyRef(effectiveStatsCurrency) : undefined),
    [effectiveStatsCurrency]
  )

  const paymentsParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      orderBy: payOrderBy
    }),
    [pageSize, currentPage, payOrderBy]
  )

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
  const lastValidStatsRef = useRef<PaymentStats | null>(null)

  const payStats = useMemo((): PaymentStats | null => {
    if (!overview.data) return lastValidStatsRef.current
    const newStats: PaymentStats = {
      totalCount: overview.data.totalPaymentsAll ?? 0,
      sumAmount: overview.data.paymentTotalAmount ?? 0,
      pendingCount: overview.data.pendingPaymentsAll ?? 0,
      pendingAmount: overview.data.paymentPendingAmount ?? 0
    }
    lastValidStatsRef.current = newStats
    return newStats
  }, [
    overview.data?.totalPaymentsAll,
    overview.data?.paymentTotalAmount,
    overview.data?.pendingPaymentsAll,
    overview.data?.paymentPendingAmount
  ])

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

  const totalCount = overview.data?.advancePaymentsTotal ?? 0
  const paymentsLoading = overview.isLoading && !overview.data
  const paymentsError = overview.error ? new Error(overview.error) : null
  const statsLoading = overview.isLoading && !overview.data
  const statsError = overview.error ? new Error(overview.error) : null

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
