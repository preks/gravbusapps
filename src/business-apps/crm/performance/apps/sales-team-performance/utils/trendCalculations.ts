/**
 * Shared trend calculation utilities
 * Consolidates duplicated code from useEmployeePerformanceData.ts and useSalesTeamTrendData.ts
 */

export type TrendDirection = 'up' | 'down' | 'stable'

export interface TrendCalculationResult {
  trend: TrendDirection
  percentage: number
}

/**
 * Calculate trend direction and percentage based on current and previous values
 * @param current Current period value
 * @param previous Previous period value
 * @param threshold Percentage threshold for determining up/down trends (default: 3%)
 * @returns Trend direction and percentage change
 */
export const calculateTrend = (current: number, previous: number, threshold: number = 3): TrendCalculationResult => {
  // Special cases
  if (previous === 0 && current > 0) {
    return { trend: 'up', percentage: 100 }
  }
  if (previous === 0 && current === 0) {
    return { trend: 'stable', percentage: 0 }
  }

  // Calculate percentage change
  const percentage = ((current - previous) / previous) * 100

  // Determine trend based on threshold
  let trend: TrendDirection
  if (percentage > threshold) {
    trend = 'up'
  } else if (percentage < -threshold) {
    trend = 'down'
  } else {
    trend = 'stable'
  }

  return {
    trend,
    percentage: Math.abs(percentage)
  }
}

/**
 * Get current and previous month date ranges for trend analysis
 * @returns Object with ISO date strings for current and previous month ranges
 */
export const getCurrentAndPreviousMonthDates = () => {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  return {
    currentStart: currentMonth.toISOString(),
    previousStart: previousMonth.toISOString(),
    previousEnd: previousMonthEnd.toISOString()
  }
}
