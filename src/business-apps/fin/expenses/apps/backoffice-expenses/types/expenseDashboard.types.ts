/**
 * This file contains all the type definitions for the expense dashboard.
 */

// Data structure for the yearly expense plan stats
export interface ExpensePlanYearly {
  totalAmount: number;
  count: number;
}

// Data structure for Year-to-Date (YTD) stats
export interface YTDStats {
  totalAmount: number;
  count: number;
  previousTotalAmount: number;
  previousCount: number;
}

// Data structure for a single month's expense trend data
export interface MonthlyExpenseTrend {
  month: number;
  monthName: string;
  totalAmount: number;
  count: number;
}

// Data structure for comparing monthly spend
export interface MonthlySpendComparison {
  currentMonthTotal: number;
  previousMonthTotal: number;
  currentMonthCount: number;
  previousMonthCount: number;
  percentChange: number;
  isIncrease: boolean;
}

// Data structure for advance payments statistics
export interface AdvancePaymentsStats {
  count: number;
  totalAmount: number;
}

// Data structure for total company spend comparison
export interface TotalCompanySpendComparison {
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  currentPeriodCount: number;
  previousPeriodCount: number;
  percentChange: number;
  isIncrease: boolean;
}

// The comprehensive data structure for all dashboard stats
export interface DashboardStats {
  expensePlanYearly: ExpensePlanYearly;
  ytdStats: YTDStats;
  monthlyTrends: MonthlyExpenseTrend[];
  monthlySpendComparison: MonthlySpendComparison;
  transferRequired: number;
  pendingRequestsCount: number;
  avgSpendPerTrip: number;
  travelExpensesCount: number;
  advancePaymentsApproved: AdvancePaymentsStats;
  totalCompanySpend: TotalCompanySpendComparison;
}
