// Customer revenue calculation utilities
// Handles all revenue-related calculations for customer performance metrics

/**
 * Calculate total revenue from won opportunities
 */
export const calculateCustomerTotalRevenue = (opportunities: any[]): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  return opportunities
    .filter(opp => opp.opportunityStatus?.code === 'WON' && opp.estimatedAmount && opp.estimatedAmount > 0)
    .reduce((total, opp) => total + (opp.estimatedAmount || 0), 0)
}

/**
 * Calculate quarterly revenue for customer activities
 */
export const calculateCustomerQuarterlyRevenue = (opportunities: any[], quarter: number, year: number): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  // Calculate quarter date range
  const quarterStartMonth = (quarter - 1) * 3
  const quarterStart = new Date(year, quarterStartMonth, 1)
  const quarterEnd = new Date(year, quarterStartMonth + 3, 0)

  return opportunities
    .filter(opp => {
      if (opp.opportunityStatus?.code !== 'WON' || !opp.closeDate) {
        return false
      }

      const closeDate = new Date(opp.closeDate)
      return closeDate >= quarterStart && closeDate <= quarterEnd
    })
    .reduce((total, opp) => total + (opp.estimatedAmount || 0), 0)
}

/**
 * Calculate monthly revenue for customer activities
 */
export const calculateCustomerMonthlyRevenue = (opportunities: any[], month: number, year: number): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)

  return opportunities
    .filter(opp => {
      if (opp.opportunityStatus?.code !== 'WON' || !opp.closeDate) {
        return false
      }

      const closeDate = new Date(opp.closeDate)
      return closeDate >= monthStart && closeDate <= monthEnd
    })
    .reduce((total, opp) => total + (opp.estimatedAmount || 0), 0)
}

/**
 * Calculate revenue achievement percentage
 */
export const calculateCustomerRevenueAchievementPercentage = (actual: number, target: number): number => {
  if (!target || target <= 0) {
    return 0
  }

  return Math.round((actual / target) * 100)
}

/**
 * Calculate average opportunity size for customer opportunities
 */
export const calculateCustomerAverageOpportunitySize = (opportunities: any[]): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  const wonOpportunities = opportunities.filter(
    opp => opp.opportunityStatus?.code === 'WON' && opp.estimatedAmount && opp.estimatedAmount > 0
  )

  if (wonOpportunities.length === 0) {
    return 0
  }

  const totalRevenue = wonOpportunities.reduce((total, opp) => total + (opp.estimatedAmount || 0), 0)

  return Math.round(totalRevenue / wonOpportunities.length)
}

/**
 * Calculate revenue per activity for efficiency metrics
 */
export const calculateCustomerRevenuePerActivity = (totalRevenue: number, activityCount: number): number => {
  if (!activityCount || activityCount <= 0) {
    return 0
  }

  return Math.round(totalRevenue / activityCount)
}

/**
 * Calculate revenue per day for a given period
 */
export const calculateCustomerRevenuePerDay = (totalRevenue: number, startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const timeDiff = end.getTime() - start.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

  if (daysDiff <= 0) {
    return 0
  }

  return Math.round(totalRevenue / daysDiff)
}

/**
 * Calculate projected revenue based on current pace
 */
export const calculateCustomerProjectedRevenue = (
  currentRevenue: number,
  daysElapsed: number,
  totalDaysInPeriod: number
): number => {
  if (daysElapsed <= 0 || totalDaysInPeriod <= 0) {
    return currentRevenue
  }

  const dailyAverage = currentRevenue / daysElapsed
  return Math.round(dailyAverage * totalDaysInPeriod)
}

/**
 * Calculate daily revenue required to meet target
 */
export const calculateCustomerDailyRevenueRequired = (
  currentRevenue: number,
  target: number,
  daysRemaining: number
): number => {
  if (daysRemaining <= 0) {
    return 0
  }

  const remainingRevenue = target - currentRevenue
  if (remainingRevenue <= 0) {
    return 0
  }

  return Math.round(remainingRevenue / daysRemaining)
}

/**
 * Format revenue amount with currency
 */
export const formatCustomerRevenue = (amount: number, currencyCode: string = 'EUR'): string => {
  // Extract currency code if it's in the format "Currency:v1:EUR"
  const extractedCurrencyCode = currencyCode.includes(':') ? currencyCode.split(':').pop() || 'EUR' : currencyCode

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: extractedCurrencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Calculate revenue distribution across team members
 */
export const calculateCustomerRevenueDistribution = (
  teamRevenues: Array<{ employeeId: string; revenue: number }>
): Array<{ range: string; count: number; percentage: number; employeeIds: string[] }> => {
  if (!teamRevenues || teamRevenues.length === 0) {
    return []
  }

  // Define revenue ranges
  const ranges = [
    { min: 0, max: 10000, label: '€0 - €10K' },
    { min: 10000, max: 25000, label: '€10K - €25K' },
    { min: 25000, max: 50000, label: '€25K - €50K' },
    { min: 50000, max: 100000, label: '€50K - €100K' },
    { min: 100000, max: Infinity, label: '€100K+' }
  ]

  const distribution = ranges.map(range => {
    const employeesInRange = teamRevenues.filter(tr => tr.revenue >= range.min && tr.revenue < range.max)

    return {
      range: range.label,
      count: employeesInRange.length,
      percentage: Math.round((employeesInRange.length / teamRevenues.length) * 100),
      employeeIds: employeesInRange.map(tr => tr.employeeId)
    }
  })

  return distribution.filter(dist => dist.count > 0)
}

/**
 * Calculate revenue growth rate between periods
 */
export const calculateCustomerRevenueGrowthRate = (currentRevenue: number, previousRevenue: number): number => {
  if (!previousRevenue || previousRevenue <= 0) {
    return currentRevenue > 0 ? 100 : 0
  }

  return Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
}

/**
 * Calculate revenue variance from target
 */
export const calculateCustomerRevenueVariance = (
  actual: number,
  target: number
): { amount: number; percentage: number; isPositive: boolean } => {
  const amount = actual - target
  const percentage = target > 0 ? Math.round((amount / target) * 100) : 0

  return {
    amount,
    percentage,
    isPositive: amount >= 0
  }
}

/**
 * Determine revenue performance grade
 */
export const getCustomerRevenuePerformanceGrade = (achievementPercentage: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (achievementPercentage >= 100) return 'A'
  if (achievementPercentage >= 85) return 'B'
  if (achievementPercentage >= 70) return 'C'
  if (achievementPercentage >= 50) return 'D'
  return 'F'
}

/**
 * Calculate weighted revenue score based on multiple factors
 */
export const calculateCustomerWeightedRevenueScore = (
  revenueAchievement: number,
  consistency: number,
  growth: number
): number => {
  // Weights: achievement 50%, consistency 30%, growth 20%
  const weights = { achievement: 0.5, consistency: 0.3, growth: 0.2 }

  const weightedScore =
    revenueAchievement * weights.achievement + consistency * weights.consistency + growth * weights.growth

  return Math.round(weightedScore)
}
