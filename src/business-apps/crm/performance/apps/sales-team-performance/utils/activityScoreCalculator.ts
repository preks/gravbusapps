import dayjs from 'dayjs'

/**
 * Activity Score Calculation Parameters
 */
export interface ActivityScoreParams {
  gracePeriod: number // G - grace period in days
  penaltyPerDay: number // P - penalty per day after grace period
  maxDelay: number // D_max - maximum delay in days
}

/**
 * Default scoring parameters
 * Can be configured based on business requirements
 */
export const DEFAULT_SCORE_PARAMS: ActivityScoreParams = {
  gracePeriod: 1, // 1 day grace period
  penaltyPerDay: 5, // 5 points penalty per day
  maxDelay: 20 // 20 days maximum delay
}

/**
 * Calculate individual activity score based on delay between creation and occurrence
 *
 * Formula:
 * delay_days = creation_date - occurred_at
 *
 * If delay_days <= G:
 *   score = 100
 * Elif delay_days > D_max:
 *   score = 0
 * Else:
 *   score = max(0, 100 - P × (delay_days - G))
 *
 * @param createdAt - Activity creation date
 * @param occurredAt - Activity occurrence date
 * @param params - Scoring parameters (grace period, penalty, max delay)
 * @returns Activity score (0-100)
 */
export const calculateActivityScore = (
  createdAt: string | null | undefined,
  occurredAt: string | null | undefined,
  params: ActivityScoreParams = DEFAULT_SCORE_PARAMS
): number => {
  // If either date is missing, return default score
  if (!createdAt || !occurredAt) {
    return 50 // Default neutral score
  }

  const creationDate = dayjs(createdAt)
  const occurrenceDate = dayjs(occurredAt)

  // Calculate delay in days (creation_date - occurred_at)
  const delayDays = creationDate.diff(occurrenceDate, 'day')

  const { gracePeriod, penaltyPerDay, maxDelay } = params

  // If delay is within grace period: full score
  if (delayDays <= gracePeriod) {
    return 100
  }

  // If delay exceeds maximum: zero score
  if (delayDays > maxDelay) {
    return 0
  }

  // Otherwise: calculate score with penalty
  const score = Math.max(0, 100 - penaltyPerDay * (delayDays - gracePeriod))

  return Math.round(score)
}

/**
 * Calculate average activity score from multiple activities
 *
 * Formula:
 * final_score = (sum of individual activity scores) / n
 *
 * @param activities - Array of activities with createdAt and occurredAt dates
 * @param params - Scoring parameters
 * @returns Average score (0-100)
 */
export const calculateAverageActivityScore = (
  activities: Array<{
    createdAt: string
    occurredAt?: string | null
  }>,
  params: ActivityScoreParams = DEFAULT_SCORE_PARAMS
): number => {
  if (activities.length === 0) {
    return 0
  }

  const totalScore = activities.reduce((sum, activity) => {
    const score = calculateActivityScore(activity.createdAt, activity.occurredAt, params)
    return sum + score
  }, 0)

  const averageScore = totalScore / activities.length

  return Math.round(averageScore)
}

/**
 * Get score variant for badge display
 */
export const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'secondary' | 'destructive' => {
  if (score >= 85) return 'success'
  if (score >= 70) return 'warning'
  if (score >= 60) return 'secondary'
  return 'destructive'
}
