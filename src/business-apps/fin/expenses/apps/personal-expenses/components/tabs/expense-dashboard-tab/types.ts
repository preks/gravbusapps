export interface ExpenseType {
  type: string
  amount: number
}

export type RecentActivityKind = 'request-approved' | 'request-returned' | 'plan-approved' | 'plan-returned'

export interface RecentActivity {
  id: string | number
  activityKind: RecentActivityKind
  /** Optional expense request/plan title shown after the translated prefix */
  relatedTitle?: string
  status: string
  updatedAt: string
  totalAmount?: number
  expenseType?: string
}

export interface MonthlyExpense {
  total: number
  count: number
}

export interface DashboardStats {
  currentMonthExpenses?: MonthlyExpense
  previousMonthExpenses?: MonthlyExpense
  currentQuarterExpenses?: MonthlyExpense
  previousQuarterExpenses?: MonthlyExpense
  currentYearExpenses?: MonthlyExpense
  previousYearExpenses?: MonthlyExpense
  pendingPayouts?: number
  bookedExpenseRequests?: number
  pendingAdvancePayments?: number
  bookedAndPendingCount?: number
  pendingItems?: number
  flaggedItems?: number
  upcomingTrips?: number
  expensesByTypeMonth?: Record<string, number>
  expensesByTypeQuarter?: Record<string, number>
  expensesByTypeYear?: Record<string, number>
  recentActivity?: RecentActivity[]
  expenseItemsWithoutReceipts?: number
}
