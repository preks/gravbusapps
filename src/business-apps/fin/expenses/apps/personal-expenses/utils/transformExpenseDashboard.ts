import { getCatalogValue } from '@/common/utils/windowUtils'
import { DashboardStats } from '../../personal-expenses/components/tabs/expense-dashboard-tab/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type ApiAggregate = {
  aggregate?: {
    sum?: { totalAmount?: number; amount?: number }
    count?: number
  }
}

export const processExpensesByType = (expenseData: any[]): Record<string, number> => {
  const expenseTypes: Record<string, number> = {}
  expenseData?.forEach((item: any) => {
    const type = item.expenseGroup ? getCatalogValue(item.expenseGroup) : 'Other'
    if (!expenseTypes[type]) {
      expenseTypes[type] = 0
    }
    expenseTypes[type] += item.totalAmount || 0
  })
  return expenseTypes
}

export const transformDashboardResponse = (
  data: any,
  selectedPeriod: 'monthly' | 'quarterly' | 'yearly'
): DashboardStats => {
  const expensesByTypeMonth = processExpensesByType(data?.expensesByTypeMonth)
  const expensesByTypeQuarter = processExpensesByType(data?.expensesByTypeQuarter)
  const expensesByTypeYear = processExpensesByType(data?.expensesByTypeYear)

  const bookedExpenseRequests = (data?.bookedExpenseRequests as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0
  const pendingAdvancePayments = (data?.pendingAdvancePayments as ApiAggregate)?.aggregate?.sum?.amount ?? 0
  const bookedAndPendingCount =
    ((data?.bookedExpenseRequests as ApiAggregate)?.aggregate?.count || 0) +
    ((data?.pendingAdvancePayments as ApiAggregate)?.aggregate?.count || 0)
  const pendingItems = (data?.pendingItems as ApiAggregate)?.aggregate?.count ?? 0

  return {
    pendingPayouts: (() => {
      if (selectedPeriod === 'yearly') {
        return ((data?.currentYearBooked as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0) + pendingAdvancePayments
      } else if (selectedPeriod === 'quarterly') {
        return ((data?.currentQuarterBooked as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0) + pendingAdvancePayments
      }
      return bookedExpenseRequests + pendingAdvancePayments
    })(),
    bookedExpenseRequests: bookedExpenseRequests,
    pendingAdvancePayments: pendingAdvancePayments,
    bookedAndPendingCount: bookedAndPendingCount,
    pendingItems: pendingItems,
    currentMonthExpenses: {
      total: (data?.currentMonthExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.currentMonthExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    previousMonthExpenses: {
      total: (data?.previousMonthExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.previousMonthExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    currentQuarterExpenses: {
      total: (data?.currentQuarterExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.currentQuarterExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    previousQuarterExpenses: {
      total: (data?.previousQuarterExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.previousQuarterExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    currentYearExpenses: {
      total: (data?.currentYearExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.currentYearExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    previousYearExpenses: {
      total: (data?.previousYearExpenses as ApiAggregate)?.aggregate?.sum?.totalAmount ?? 0,
      count: (data?.previousYearExpenses as ApiAggregate)?.aggregate?.count ?? 0
    },
    flaggedItems: (data?.flaggedItems as ApiAggregate)?.aggregate?.count ?? 0,
    upcomingTrips: (data?.upcomingTrips as ApiAggregate)?.aggregate?.count ?? 0,
    recentActivity: (() => {
      const req = (data?.requestActivity || []).map((r: any) => ({
        id: r.id,
        title:
          (r.commentType === 'APPROVE_COMMENT'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.request_approved', 'Request approved')
            : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.request_returned', 'Request returned')) +
          (r.expenseRequest?.title ? `: ${r.expenseRequest.title}` : ''),
        status: r.expenseRequest?.status,
        updatedAt: r.commentDate,
        totalAmount: 0,
        expenseDate: r.commentDate
      }))
      const plan = (data?.planActivity || []).map((p: any) => ({
        id: p.id,
        title:
          (p.commentType === 'APPROVE_COMMENT'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_approved', 'Plan approved')
            : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_returned', 'Plan returned')) +
          (p.expensePlan?.title ? `: ${p.expensePlan.title}` : ''),
        status: p.expensePlan?.status,
        updatedAt: p.commentDate,
        totalAmount: 0,
        expenseDate: p.commentDate
      }))
      return [...req, ...plan].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    })(),
    expensesByTypeMonth,
    expensesByTypeQuarter,
    expensesByTypeYear,
    expenseItemsWithoutReceipts: (data?.itemsWithoutReceipts as ApiAggregate)?.aggregate?.count ?? 0
  }
}
