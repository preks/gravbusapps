export interface ExpenseType {
  type: string;
  amount: number;
}

export interface RecentActivity {
  id: string | number;
  title: string;
  status: string;
  updatedAt: string;
  totalAmount: number;
  expenseType?: string;
}

export interface MonthlyExpense {
  total: number;
  count: number;
}

export interface DashboardStats {
  currentMonthExpenses?: MonthlyExpense;
  lastMonthExpenses?: MonthlyExpense;
  pendingPayouts?: number;
  flaggedItems?: number;
  upcomingTrips?: number;
  expensesByType?: Record<string, number>;
  recentActivity?: RecentActivity[];
}
