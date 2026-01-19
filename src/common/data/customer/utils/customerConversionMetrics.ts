// Customer conversion metrics utilities
// Handles lead-to-account, account-to-opportunity, and opportunity-to-win conversion calculations

/**
 * Calculate lead to account conversion rate
 */
export const calculateCustomerLeadConversionRate = (leads: any[], accounts: any[]): number => {
  if (!leads || leads.length === 0) {
    return 0
  }

  // Count leads that have been converted to accounts
  const convertedLeads = leads.filter(
    lead => lead.conversionDate && accounts.some(account => account.convertedFromLeadId === lead.id)
  )

  return Math.round((convertedLeads.length / leads.length) * 100)
}

/**
 * Calculate account to opportunity conversion rate
 */
export const calculateCustomerAccountOpportunityConversionRate = (accounts: any[], opportunities: any[]): number => {
  if (!accounts || accounts.length === 0) {
    return 0
  }

  // Count accounts that have opportunities (using opportunityAccounts junction table)
  const accountsWithOpportunities = accounts.filter(account =>
    opportunities.some(opportunity => opportunity.opportunityAccounts?.some((oa: any) => oa.accountId === account.id))
  )

  return Math.round((accountsWithOpportunities.length / accounts.length) * 100)
}

/**
 * Calculate opportunity win rate
 */
export const calculateCustomerOpportunityWinRate = (opportunities: any[]): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  // Count closed opportunities (both won and lost)
  const closedOpportunities = opportunities.filter(
    opp => opp.opportunityStatus && (opp.opportunityStatus.code === 'WON' || opp.opportunityStatus.code === 'LOST')
  )

  if (closedOpportunities.length === 0) {
    return 0
  }

  // Count won opportunities
  const wonOpportunities = closedOpportunities.filter(opp => opp.opportunityStatus.code === 'WON')

  return Math.round((wonOpportunities.length / closedOpportunities.length) * 100)
}

/**
 * Calculate average opportunity cycle length
 */
export const calculateCustomerSalesCycleLength = (opportunities: any[]): number => {
  if (!opportunities || opportunities.length === 0) {
    return 0
  }

  // Filter won opportunities with both creation and close dates
  const wonOpportunities = opportunities.filter(
    opp => opp.opportunityStatus?.code === 'WON' && opp.createdAt && opp.closeDate
  )

  if (wonOpportunities.length === 0) {
    return 0
  }

  // Calculate cycle lengths in days
  const cycleLengths = wonOpportunities.map(opp => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)
    const diffMs = closed.getTime() - created.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) // Convert to days
  })

  // Calculate average
  const totalDays = cycleLengths.reduce((sum, days) => sum + days, 0)
  return Math.round(totalDays / cycleLengths.length)
}

/**
 * Calculate full conversion funnel metrics
 */
export const calculateCustomerConversionFunnel = (leads: any[], accounts: any[], opportunities: any[]) => {
  const leadCount = leads?.length || 0
  const accountCount = accounts?.length || 0
  const opportunityCount = opportunities?.length || 0
  const wonOpportunityCount = opportunities?.filter(opp => opp.opportunityStatus?.code === 'WON').length || 0

  // Calculate conversion rates
  const leadToAccountRate = calculateCustomerLeadConversionRate(leads, accounts)
  const accountToOpportunityRate = calculateCustomerAccountOpportunityConversionRate(accounts, opportunities)
  const opportunityWinRate = calculateCustomerOpportunityWinRate(opportunities)

  // Calculate overall funnel efficiency
  const overallConversionRate = leadCount > 0 ? Math.round((wonOpportunityCount / leadCount) * 100) : 0

  return {
    leadCount,
    accountCount,
    opportunityCount,
    wonOpportunityCount,
    leadToAccountRate,
    accountToOpportunityRate,
    opportunityWinRate,
    overallConversionRate,
    funnelStages: [
      { stage: 'Leads', count: leadCount, conversionRate: 100 },
      { stage: 'Accounts', count: accountCount, conversionRate: leadToAccountRate },
      { stage: 'Opportunities', count: opportunityCount, conversionRate: accountToOpportunityRate },
      { stage: 'Won', count: wonOpportunityCount, conversionRate: opportunityWinRate }
    ]
  }
}

/**
 * Calculate conversion efficiency score
 */
export const calculateCustomerConversionEfficiency = (
  leadToAccountRate: number,
  accountToOpportunityRate: number,
  opportunityWinRate: number
): number => {
  // Weight the different conversion rates
  const weights = {
    leadToAccount: 0.3,
    accountToOpportunity: 0.3,
    opportunityWin: 0.4
  }

  const weightedScore =
    leadToAccountRate * weights.leadToAccount +
    accountToOpportunityRate * weights.accountToOpportunity +
    opportunityWinRate * weights.opportunityWin

  return Math.round(weightedScore)
}

/**
 * Calculate time-based conversion metrics
 */
export const calculateCustomerTimeBasedConversions = (
  entities: any[],
  entityType: 'lead' | 'account' | 'opportunity',
  timeframe: 'monthly' | 'quarterly' | 'yearly'
): Array<{
  period: string
  count: number
  conversionRate: number
}> => {
  if (!entities || entities.length === 0) {
    return []
  }

  // Group entities by time period
  const groupedEntities = new Map<string, any[]>()

  entities.forEach(entity => {
    const date = new Date(entity.createdAt || entity.conversionDate)
    let periodKey: string

    if (timeframe === 'monthly') {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else if (timeframe === 'quarterly') {
      const quarter = Math.ceil((date.getMonth() + 1) / 3)
      periodKey = `${date.getFullYear()}-Q${quarter}`
    } else {
      periodKey = date.getFullYear().toString()
    }

    if (!groupedEntities.has(periodKey)) {
      groupedEntities.set(periodKey, [])
    }
    groupedEntities.get(periodKey)!.push(entity)
  })

  // Calculate conversion rates for each period
  const periodConversions = Array.from(groupedEntities.entries()).map(([period, periodEntities]) => {
    let conversionRate = 0

    if (entityType === 'lead') {
      const convertedLeads = periodEntities.filter(lead => lead.conversionDate)
      conversionRate = Math.round((convertedLeads.length / periodEntities.length) * 100)
    } else if (entityType === 'opportunity') {
      const wonOpportunities = periodEntities.filter(opp => opp.opportunityStatus?.code === 'WON')
      conversionRate = Math.round((wonOpportunities.length / periodEntities.length) * 100)
    }

    return {
      period,
      count: periodEntities.length,
      conversionRate
    }
  })

  // Sort by period
  return periodConversions.sort((a, b) => a.period.localeCompare(b.period))
}

/**
 * Calculate conversion velocity (speed of conversions)
 */
export const calculateCustomerConversionVelocity = (
  conversions: Array<{ createdAt: string; convertedAt?: string; closedAt?: string }>
): {
  averageDays: number
  medianDays: number
  fastestDays: number
  slowestDays: number
  velocityTrend: 'improving' | 'stable' | 'declining'
} => {
  if (!conversions || conversions.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      fastestDays: 0,
      slowestDays: 0,
      velocityTrend: 'stable'
    }
  }

  // Calculate conversion times in days
  const conversionTimes = conversions
    .filter(conv => conv.convertedAt || conv.closedAt)
    .map(conv => {
      const startDate = new Date(conv.createdAt)
      const endDate = new Date(conv.convertedAt || conv.closedAt!)
      const diffMs = endDate.getTime() - startDate.getTime()
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    })
    .filter(days => days > 0)

  if (conversionTimes.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      fastestDays: 0,
      slowestDays: 0,
      velocityTrend: 'stable'
    }
  }

  // Calculate statistics
  const sortedTimes = [...conversionTimes].sort((a, b) => a - b)
  const averageDays = Math.round(conversionTimes.reduce((sum, days) => sum + days, 0) / conversionTimes.length)
  const medianDays = sortedTimes[Math.floor(sortedTimes.length / 2)]
  const fastestDays = sortedTimes[0]
  const slowestDays = sortedTimes[sortedTimes.length - 1]

  // Calculate velocity trend
  let velocityTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (conversionTimes.length >= 6) {
    const firstHalf = conversionTimes.slice(0, Math.floor(conversionTimes.length / 2))
    const secondHalf = conversionTimes.slice(Math.floor(conversionTimes.length / 2))

    const firstHalfAvg = firstHalf.reduce((sum, days) => sum + days, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, days) => sum + days, 0) / secondHalf.length

    const improvement = firstHalfAvg - secondHalfAvg
    const improvementPercentage = Math.abs(improvement / firstHalfAvg) * 100

    if (improvementPercentage >= 10) {
      velocityTrend = improvement > 0 ? 'improving' : 'declining'
    }
  }

  return {
    averageDays,
    medianDays,
    fastestDays,
    slowestDays,
    velocityTrend
  }
}

/**
 * Calculate conversion quality score
 */
export const calculateCustomerConversionQuality = (
  opportunities: any[]
): {
  qualityScore: number
  averageDealSize: number
  dealSizeConsistency: 'high' | 'medium' | 'low'
  qualityIndicators: string[]
} => {
  if (!opportunities || opportunities.length === 0) {
    return {
      qualityScore: 0,
      averageDealSize: 0,
      dealSizeConsistency: 'low',
      qualityIndicators: ['No opportunities to analyze']
    }
  }

  const wonOpportunities = opportunities.filter(opp => opp.opportunityStatus?.code === 'WON')

  if (wonOpportunities.length === 0) {
    return {
      qualityScore: 0,
      averageDealSize: 0,
      dealSizeConsistency: 'low',
      qualityIndicators: ['No won opportunities']
    }
  }

  // Calculate average deal size
  const dealSizes = wonOpportunities.filter(opp => opp.estimatedAmount > 0).map(opp => opp.estimatedAmount)

  const averageDealSize =
    dealSizes.length > 0 ? Math.round(dealSizes.reduce((sum, size) => sum + size, 0) / dealSizes.length) : 0

  // Calculate deal size consistency
  let dealSizeConsistency: 'high' | 'medium' | 'low' = 'low'
  if (dealSizes.length >= 3) {
    const variance = dealSizes.reduce((sum, size) => sum + Math.pow(size - averageDealSize, 2), 0) / dealSizes.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / averageDealSize

    if (coefficientOfVariation < 0.3) dealSizeConsistency = 'high'
    else if (coefficientOfVariation < 0.6) dealSizeConsistency = 'medium'
  }

  // Calculate quality indicators
  const qualityIndicators: string[] = []

  const winRate = calculateCustomerOpportunityWinRate(opportunities)
  if (winRate >= 60) qualityIndicators.push('High win rate')
  else if (winRate < 30) qualityIndicators.push('Low win rate needs improvement')

  if (averageDealSize >= 50000) qualityIndicators.push('Large deal sizes')
  else if (averageDealSize < 10000) qualityIndicators.push('Small deal sizes')

  if (dealSizeConsistency === 'high') qualityIndicators.push('Consistent deal sizes')
  else if (dealSizeConsistency === 'low') qualityIndicators.push('Inconsistent deal sizes')

  // Calculate overall quality score
  let qualityScore = 0
  qualityScore += Math.min(winRate, 100) * 0.4 // Win rate (40% weight)
  qualityScore += Math.min(averageDealSize / 1000, 100) * 0.3 // Deal size (30% weight)
  qualityScore += (dealSizeConsistency === 'high' ? 100 : dealSizeConsistency === 'medium' ? 60 : 20) * 0.3 // Consistency (30% weight)

  return {
    qualityScore: Math.round(qualityScore),
    averageDealSize,
    dealSizeConsistency,
    qualityIndicators
  }
}

/**
 * Calculate conversion benchmarks
 */
export const calculateCustomerConversionBenchmarks = (
  teamConversions: Array<{
    employeeId: string
    leadToAccountRate: number
    accountToOpportunityRate: number
    opportunityWinRate: number
  }>
): {
  benchmarks: {
    leadToAccount: { min: number; max: number; average: number; median: number }
    accountToOpportunity: { min: number; max: number; average: number; median: number }
    opportunityWin: { min: number; max: number; average: number; median: number }
  }
  topPerformers: {
    leadToAccount: string
    accountToOpportunity: string
    opportunityWin: string
  }
} => {
  if (!teamConversions || teamConversions.length === 0) {
    const emptyBenchmark = { min: 0, max: 0, average: 0, median: 0 }
    return {
      benchmarks: {
        leadToAccount: emptyBenchmark,
        accountToOpportunity: emptyBenchmark,
        opportunityWin: emptyBenchmark
      },
      topPerformers: {
        leadToAccount: '',
        accountToOpportunity: '',
        opportunityWin: ''
      }
    }
  }

  // Helper function to calculate statistics
  const calculateStats = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
      median: sorted[Math.floor(sorted.length / 2)]
    }
  }

  // Extract rates
  const leadToAccountRates = teamConversions.map(tc => tc.leadToAccountRate)
  const accountToOpportunityRates = teamConversions.map(tc => tc.accountToOpportunityRate)
  const opportunityWinRates = teamConversions.map(tc => tc.opportunityWinRate)

  // Calculate benchmarks
  const benchmarks = {
    leadToAccount: calculateStats(leadToAccountRates),
    accountToOpportunity: calculateStats(accountToOpportunityRates),
    opportunityWin: calculateStats(opportunityWinRates)
  }

  // Find top performers
  const topLeadToAccount = teamConversions.reduce((top, current) =>
    current.leadToAccountRate > top.leadToAccountRate ? current : top
  ).employeeId

  const topAccountToOpportunity = teamConversions.reduce((top, current) =>
    current.accountToOpportunityRate > top.accountToOpportunityRate ? current : top
  ).employeeId

  const topOpportunityWin = teamConversions.reduce((top, current) =>
    current.opportunityWinRate > top.opportunityWinRate ? current : top
  ).employeeId

  return {
    benchmarks,
    topPerformers: {
      leadToAccount: topLeadToAccount,
      accountToOpportunity: topAccountToOpportunity,
      opportunityWin: topOpportunityWin
    }
  }
}
