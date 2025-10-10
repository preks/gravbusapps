// Customer-specific activity scoring utilities
// Adapted from team-member-record activity scoring algorithm

// Global cache for customer activity scores - once calculated, never changes
const CUSTOMER_ACTIVITY_SCORE_CACHE = new Map<string, number>()

/**
 * Generate consistent occurred date for customer activity
 * Uses activity ID as seed for consistent random generation
 */
export const generateCustomerActivityOccurredAt = (createdDate: Date, activityId: string): string => {
  // Use activity ID as seed for consistent random generation
  const seed = activityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const random1 = Math.sin(seed) * 10000
  const random2 = Math.sin(seed * 2) * 10000

  // Generate consistent occurred date that is the same or earlier than created date
  const maxDaysBack = 14 // Up to 2 weeks before logging
  const daysBack = Math.floor((random1 - Math.floor(random1)) * maxDaysBack) // 0-14 days before

  // Generate consistent time offset within the day (0-23 hours back)
  const hoursBack = Math.floor((random2 - Math.floor(random2)) * 24)

  const occurredDate = new Date(createdDate)
  occurredDate.setDate(occurredDate.getDate() - daysBack)
  occurredDate.setHours(occurredDate.getHours() - hoursBack)

  return occurredDate.toISOString()
}

/**
 * Calculate customer activity score based on logging timeliness
 * Score based on how quickly the activity was logged after it occurred
 */
export const calculateCustomerActivityScore = (createdAt: string, occurredAt: string): number => {
  const createdDate = new Date(createdAt)
  const occurredDate = new Date(occurredAt)

  // Calculate hours between when activity occurred and when it was logged
  const timeDiffMs = createdDate.getTime() - occurredDate.getTime()
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60)

  // Score based on how quickly the activity was logged after it occurred
  // Same day logging = 90-100 points
  // Within 3 days = 70-89 points
  // Within 1 week = 50-69 points
  // Within 2 weeks = 30-49 points
  // More than 2 weeks = 0-29 points

  if (timeDiffHours <= 24) {
    // Logged same day: 90-100 points
    return Math.max(90, Math.round(100 - (timeDiffHours / 24) * 10))
  } else if (timeDiffHours <= 72) {
    // Logged within 3 days: 70-89 points
    return Math.max(70, Math.round(90 - ((timeDiffHours - 24) / 48) * 20))
  } else if (timeDiffHours <= 168) {
    // Logged within 1 week: 50-69 points
    return Math.max(50, Math.round(70 - ((timeDiffHours - 72) / 96) * 20))
  } else if (timeDiffHours <= 336) {
    // Logged within 2 weeks: 30-49 points
    return Math.max(30, Math.round(50 - ((timeDiffHours - 168) / 168) * 20))
  } else {
    // Logged after 2+ weeks: 0-29 points
    return Math.max(0, Math.round(30 - ((timeDiffHours - 336) / 168) * 30))
  }
}

/**
 * Get cached customer activity score or calculate and cache it
 * Ensures consistent scoring across multiple calls
 */
export const getCachedCustomerActivityScore = (activityId: string, createdAt: string): number => {
  // Check if we already have a cached score for this activity
  if (CUSTOMER_ACTIVITY_SCORE_CACHE.has(activityId)) {
    return CUSTOMER_ACTIVITY_SCORE_CACHE.get(activityId)!
  }

  // Calculate score once and cache it forever
  const createdDate = new Date(createdAt)
  const occurredAt = generateCustomerActivityOccurredAt(createdDate, activityId)
  const score = calculateCustomerActivityScore(createdAt, occurredAt)

  // Lock this score in cache
  CUSTOMER_ACTIVITY_SCORE_CACHE.set(activityId, score)

  return score
}

/**
 * Calculate average activity score for a collection of customer activities
 */
export const calculateCustomerAverageActivityScore = (activities: any[]): number => {
  if (!activities || activities.length === 0) {
    return 0
  }

  // Filter out activities with null createdAt
  const validActivities = activities.filter((activity: any) => activity.createdAt !== null)

  if (validActivities.length === 0) {
    return 0
  }

  // Calculate activity scores using the cached function
  const scores = validActivities.map((activity: any) => {
    const activityId = activity.id
    const createdAt = activity.createdAt
    return getCachedCustomerActivityScore(activityId, createdAt)
  })

  // Calculate average
  const totalScore = scores.reduce((sum: number, score: number) => sum + score, 0)
  const averageScore = Math.round(totalScore / scores.length)

  return averageScore
}

/**
 * Determine activity performance level based on score
 */
export const getCustomerActivityPerformanceLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'poor'
}

/**
 * Get badge color for activity score visualization
 */
export const getCustomerActivityScoreBadgeColor = (score: number): string => {
  if (score >= 90) return '#52c41a' // green
  if (score >= 70) return '#1890ff' // blue
  if (score >= 50) return '#faad14' // orange
  return '#ff4d4f' // red
}

/**
 * Get badge variant for activity score
 */
export const getCustomerActivityScoreBadgeVariant = (score: number): 'success' | 'info' | 'warning' | 'error' => {
  if (score >= 90) return 'success'
  if (score >= 70) return 'info'
  if (score >= 50) return 'warning'
  return 'error'
}

/**
 * Calculate activity logging delay in hours
 */
export const calculateCustomerActivityLoggingDelay = (createdAt: string, occurredAt: string): number => {
  const createdDate = new Date(createdAt)
  const occurredDate = new Date(occurredAt)
  const timeDiffMs = createdDate.getTime() - occurredDate.getTime()
  return Math.round(timeDiffMs / (1000 * 60 * 60)) // hours
}

/**
 * Format activity logging delay for display
 */
export const formatCustomerActivityLoggingDelay = (delayHours: number): string => {
  if (delayHours < 1) return 'Less than 1 hour'
  if (delayHours < 24) return `${delayHours} hour${delayHours !== 1 ? 's' : ''}`

  const days = Math.floor(delayHours / 24)
  const remainingHours = delayHours % 24

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
}

/**
 * Determine if activity logging is timely
 */
export const isCustomerActivityLoggingTimely = (delayHours: number): boolean => {
  return delayHours <= 24 // Within 24 hours is considered timely
}

/**
 * Calculate activity score distribution for a team
 */
export const calculateCustomerActivityScoreDistribution = (
  activities: any[]
): {
  excellent: number
  good: number
  average: number
  poor: number
} => {
  if (!activities || activities.length === 0) {
    return { excellent: 0, good: 0, average: 0, poor: 0 }
  }

  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 }

  activities.forEach(activity => {
    if (activity.createdAt) {
      const score = getCachedCustomerActivityScore(activity.id, activity.createdAt)
      const level = getCustomerActivityPerformanceLevel(score)
      distribution[level]++
    }
  })

  return distribution
}
