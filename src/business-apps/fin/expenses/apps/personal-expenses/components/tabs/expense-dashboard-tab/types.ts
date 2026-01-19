export interface ExpenseType {
  type: string
  amount: number
}

export interface RecentActivity {
  id: string | number
  title: string
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
