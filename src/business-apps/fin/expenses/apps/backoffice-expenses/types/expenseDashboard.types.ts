/**
 * This file contains all the type definitions for the expense dashboard.
 */

// Data structure for Year-to-Date (YTD) stats
export interface YTDStats {
  totalAmount: number
  count: number
  previousTotalAmount: number
  previousCount: number
}

// Data structure for actual vs planned comparison
export interface ActualVsPlannedData {
  actualExpenses: {
    totalAmount: number
    count: number
  }
  plannedExpenses: {
    totalAmount: number
    count: number
  }
}

// Data structure for a single month's expense trend data
export interface MonthlyExpenseTrend {
  month: number
  monthName: string
  totalAmount: number
  count: number
}

// Data structure for comparing monthly spend
export interface MonthlySpendComparison {
  currentMonthTotal: number
  previousMonthTotal: number
  currentMonthCount: number
  previousMonthCount: number
  percentChange: number | null // null when previous period is 0 (division by zero)
  isIncrease: boolean
}

// Data structure for advance payments statistics
export interface AdvancePaymentsStats {
  count: number
  totalAmount: number
}

// Data structure for total company spend comparison
export interface TotalCompanySpendComparison {
  currentPeriodTotal: number
  previousPeriodTotal: number
  currentPeriodCount: number
  previousPeriodCount: number
  percentChange: number | null // null when previous period is 0 (division by zero)
  isIncrease: boolean
}

// The comprehensive data structure for all dashboard stats
export interface DashboardStats {
  ytdStats: YTDStats
  actualVsPlanned: ActualVsPlannedData
  monthlyTrends: MonthlyExpenseTrend[]
  monthlySpendComparison: MonthlySpendComparison
  transferRequired: number
  pendingRequestsCount: number
  avgSpendPerTrip: number
  travelExpensesCount: number
  advancePaymentsApproved: AdvancePaymentsStats
  totalCompanySpend: TotalCompanySpendComparison
}
