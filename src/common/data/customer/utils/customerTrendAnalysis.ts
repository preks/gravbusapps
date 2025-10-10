// Customer trend analysis utilities
// Handles period-over-period comparisons and trend calculations for customer performance

import { TrendIndicator } from '../types/customerTeamPerformanceTypes'

/**
 * Calculate trend direction and significance for customer metrics
 */
export const calculateCustomerPerformanceTrend = (
  current: number,
  previous: number,
  metricType: 'revenue' | 'activity_score' | 'conversion_rate' | 'activity_count' = 'revenue'
): TrendIndicator => {
  // Handle edge cases
  if (current === previous) {
    return {
      direction: 'stable',
      percentage: 0,
      absoluteChange: 0,
      isPositive: true,
      isSignificant: false,
      description: 'No change from previous period',
      iconName: 'minus',
      color: '#8c8c8c'
    }
  }

  if (previous === 0) {
    return {
      direction: current > 0 ? 'up' : 'down',
      percentage: 100,
      absoluteChange: current,
      isPositive: current > 0,
      isSignificant: true,
      description: current > 0 ? 'New performance this period' : 'No performance this period',
      iconName: current > 0 ? 'trending-up' : 'trending-down',
      color: current > 0 ? '#52c41a' : '#ff4d4f'
    }
  }

  // Calculate percentage change
  const percentageChange = Math.round(((current - previous) / Math.abs(previous)) * 100)
  const absoluteChange = current - previous
  const direction = current > previous ? 'up' : 'down'

  // Determine if trend is positive based on metric type
  const isPositive = determineCustomerTrendPositivity(metricType, direction)

  // Determine if trend is significant (>= 5% change)
  const isSignificant = Math.abs(percentageChange) >= 5

  // Generate description
  const description = generateCustomerTrendDescription(percentageChange, metricType, direction, isSignificant)

  // Determine icon and color
  const iconName = direction === 'up' ? 'trending-up' : 'trending-down'
  const color = isPositive ? '#52c41a' : '#ff4d4f'

  return {
    direction,
    percentage: Math.abs(percentageChange),
    absoluteChange,
    isPositive,
    isSignificant,
    description,
    iconName,
    color
  }
}

/**
 * Determine if trend direction is positive for specific customer metrics
 */
export const determineCustomerTrendPositivity = (
  metric: 'revenue' | 'activity_score' | 'conversion_rate' | 'activity_count',
  direction: 'up' | 'down' | 'stable'
): boolean => {
  if (direction === 'stable') return true

  // For most metrics, up is positive
  const positiveUpMetrics = ['revenue', 'activity_score', 'conversion_rate', 'activity_count']

  if (positiveUpMetrics.includes(metric)) {
    return direction === 'up'
  }

  // Default: up is positive
  return direction === 'up'
}

/**
 * Calculate percentage change for customer metrics
 */
export const calculateCustomerPercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

/**
 * Generate descriptive text for customer trends
 */
export const generateCustomerTrendDescription = (
  percentageChange: number,
  metricType: string,
  direction: 'up' | 'down' | 'stable',
  isSignificant: boolean
): string => {
  const absPercentage = Math.abs(percentageChange)
  const changeWord = direction === 'up' ? 'increased' : 'decreased'
  const significanceWord = isSignificant ? 'significantly' : 'slightly'

  if (direction === 'stable') {
    return 'Remained stable from previous period'
  }

  if (absPercentage >= 50) {
    return `${changeWord} dramatically by ${absPercentage}%`
  } else if (absPercentage >= 20) {
    return `${changeWord} significantly by ${absPercentage}%`
  } else if (absPercentage >= 10) {
    return `${changeWord} moderately by ${absPercentage}%`
  } else if (absPercentage >= 5) {
    return `${changeWord} slightly by ${absPercentage}%`
  } else {
    return `${changeWord} minimally by ${absPercentage}%`
  }
}

/**
 * Calculate multiple period trends for customer performance
 */
export const calculateCustomerMultiPeriodTrends = (
  values: number[],
  metricType: 'revenue' | 'activity_score' | 'conversion_rate' | 'activity_count' = 'revenue'
): {
  overallTrend: TrendIndicator
  periodTrends: TrendIndicator[]
  volatility: 'low' | 'medium' | 'high'
  consistency: number
} => {
  if (values.length < 2) {
    return {
      overallTrend: {
        direction: 'stable',
        percentage: 0,
        absoluteChange: 0,
        isPositive: true,
        isSignificant: false,
        description: 'Insufficient data for trend analysis',
        iconName: 'minus',
        color: '#8c8c8c'
      },
      periodTrends: [],
      volatility: 'low',
      consistency: 100
    }
  }

  // Calculate period-to-period trends
  const periodTrends: TrendIndicator[] = []
  for (let i = 1; i < values.length; i++) {
    const trend = calculateCustomerPerformanceTrend(values[i], values[i - 1], metricType)
    periodTrends.push(trend)
  }

  // Calculate overall trend (first to last)
  const overallTrend = calculateCustomerPerformanceTrend(values[values.length - 1], values[0], metricType)

  // Calculate volatility
  const changes = periodTrends.map(t => t.percentage)
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
  const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length
  const standardDeviation = Math.sqrt(variance)

  let volatility: 'low' | 'medium' | 'high'
  if (standardDeviation < 10) volatility = 'low'
  else if (standardDeviation < 25) volatility = 'medium'
  else volatility = 'high'

  // Calculate consistency (how often trends are in the same direction)
  const positiveChanges = periodTrends.filter(t => t.isPositive).length
  const consistency = Math.round((positiveChanges / periodTrends.length) * 100)

  return {
    overallTrend,
    periodTrends,
    volatility,
    consistency
  }
}

/**
 * Compare customer performance against team average
 */
export const compareCustomerPerformanceToTeam = (
  individualValue: number,
  teamAverage: number,
  metricType: string
): {
  performanceGap: number
  performanceGapPercentage: number
  aboveAverage: boolean
  description: string
  category: 'top' | 'above-average' | 'average' | 'below-average' | 'bottom'
} => {
  const performanceGap = individualValue - teamAverage
  const performanceGapPercentage = teamAverage > 0 ? Math.round((performanceGap / teamAverage) * 100) : 0
  const aboveAverage = performanceGap >= 0

  // Determine performance category
  let category: 'top' | 'above-average' | 'average' | 'below-average' | 'bottom'
  const gapPercentage = Math.abs(performanceGapPercentage)

  if (aboveAverage) {
    if (gapPercentage >= 25) category = 'top'
    else if (gapPercentage >= 10) category = 'above-average'
    else category = 'average'
  } else {
    if (gapPercentage >= 25) category = 'bottom'
    else if (gapPercentage >= 10) category = 'below-average'
    else category = 'average'
  }

  // Generate description
  let description: string
  if (category === 'top') {
    description = `Significantly above team average (+${gapPercentage}%)`
  } else if (category === 'above-average') {
    description = `Above team average (+${gapPercentage}%)`
  } else if (category === 'average') {
    description = `Close to team average (${aboveAverage ? '+' : ''}${gapPercentage}%)`
  } else if (category === 'below-average') {
    description = `Below team average (-${gapPercentage}%)`
  } else {
    description = `Significantly below team average (-${gapPercentage}%)`
  }

  return {
    performanceGap,
    performanceGapPercentage,
    aboveAverage,
    description,
    category
  }
}

/**
 * Calculate trend momentum for predictive analysis
 */
export const calculateCustomerTrendMomentum = (
  recentTrends: TrendIndicator[]
): {
  momentum: 'accelerating' | 'steady' | 'decelerating' | 'volatile'
  strength: 'strong' | 'moderate' | 'weak'
  predictedDirection: 'up' | 'down' | 'stable'
} => {
  if (recentTrends.length < 2) {
    return {
      momentum: 'steady',
      strength: 'weak',
      predictedDirection: 'stable'
    }
  }

  // Analyze trend changes
  const trendStrengths = recentTrends.map(t => t.percentage)
  const isAccelerating = trendStrengths[trendStrengths.length - 1] > trendStrengths[0]
  const avgStrength = trendStrengths.reduce((sum, strength) => sum + strength, 0) / trendStrengths.length

  // Determine momentum
  const variance =
    trendStrengths.reduce((sum, strength) => sum + Math.pow(strength - avgStrength, 2), 0) / trendStrengths.length
  const isVolatile = variance > 100

  let momentum: 'accelerating' | 'steady' | 'decelerating' | 'volatile'
  if (isVolatile) {
    momentum = 'volatile'
  } else if (isAccelerating) {
    momentum = 'accelerating'
  } else if (avgStrength > 5) {
    momentum = 'steady'
  } else {
    momentum = 'decelerating'
  }

  // Determine strength
  let strength: 'strong' | 'moderate' | 'weak'
  if (avgStrength >= 20) strength = 'strong'
  else if (avgStrength >= 10) strength = 'moderate'
  else strength = 'weak'

  // Predict direction
  const recentTrend = recentTrends[recentTrends.length - 1]
  const predictedDirection = momentum === 'volatile' ? 'stable' : recentTrend.direction

  return {
    momentum,
    strength,
    predictedDirection
  }
}

/**
 * Calculate seasonal trends for customer performance
 */
export const calculateCustomerSeasonalTrends = (
  monthlyValues: Array<{ month: number; value: number }>
): {
  seasonalPattern: 'spring-peak' | 'summer-peak' | 'fall-peak' | 'winter-peak' | 'consistent' | 'volatile'
  bestMonth: number
  worstMonth: number
  seasonalVariation: number
} => {
  if (monthlyValues.length < 12) {
    return {
      seasonalPattern: 'consistent',
      bestMonth: 1,
      worstMonth: 1,
      seasonalVariation: 0
    }
  }

  // Find best and worst months
  const bestMonth = monthlyValues.reduce((best, current) => (current.value > best.value ? current : best)).month

  const worstMonth = monthlyValues.reduce((worst, current) => (current.value < worst.value ? current : worst)).month

  // Calculate seasonal variation
  const values = monthlyValues.map(mv => mv.value)
  const avgValue = values.reduce((sum, value) => sum + value, 0) / values.length
  const maxDeviation = Math.max(...values.map(value => Math.abs(value - avgValue)))
  const seasonalVariation = avgValue > 0 ? Math.round((maxDeviation / avgValue) * 100) : 0

  // Determine seasonal pattern
  let seasonalPattern: 'spring-peak' | 'summer-peak' | 'fall-peak' | 'winter-peak' | 'consistent' | 'volatile'

  if (seasonalVariation < 10) {
    seasonalPattern = 'consistent'
  } else if (seasonalVariation > 50) {
    seasonalPattern = 'volatile'
  } else {
    // Determine peak season
    if (bestMonth >= 3 && bestMonth <= 5) seasonalPattern = 'spring-peak'
    else if (bestMonth >= 6 && bestMonth <= 8) seasonalPattern = 'summer-peak'
    else if (bestMonth >= 9 && bestMonth <= 11) seasonalPattern = 'fall-peak'
    else seasonalPattern = 'winter-peak'
  }

  return {
    seasonalPattern,
    bestMonth,
    worstMonth,
    seasonalVariation
  }
}
