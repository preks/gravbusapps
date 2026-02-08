/**
 * Flight Risk Calculation Utilities
 * Scoring algorithms and risk calculation functions
 */

import {
  FlightRiskSignal,
  FlightRiskIntervention,
  RiskLevel,
  RiskTrend,
  SignalCategory,
  RawPerformanceGoal,
  RawFeedback,
  RawAbsence
} from '../types/flightRisk.types'

// Signal weights - configurable based on organization preferences
export const SIGNAL_WEIGHTS: Record<SignalCategory, number> = {
  tenure: 0.15,
  performance: 0.2,
  engagement: 0.15,
  compensation: 0.2,
  wellness: 0.15,
  sentiment: 0.15
}

/**
 * Calculate tenure risk score
 * Peak risk at 18-24 months (highest turnover period)
 * Lower risk for new hires (<6 months) and long-tenured (>5 years)
 */
export const calculateTenureRiskScore = (tenureMonths: number): number => {
  if (tenureMonths < 3) return 10 // Too new, not enough signal
  if (tenureMonths < 6) return 25 // Probation period
  if (tenureMonths < 12) return 50 // First year
  if (tenureMonths < 18) return 75 // Peak risk starts
  if (tenureMonths < 30) return 85 // Peak risk zone (18-30 months)
  if (tenureMonths < 48) return 60 // Declining risk
  if (tenureMonths < 60) return 40 // Established
  return 20 // Long-tenured, lower flight risk
}

/**
 * Get description for tenure risk
 */
export const getTenureRiskDescription = (tenureMonths: number): string => {
  if (tenureMonths < 6) return 'New employee, building engagement'
  if (tenureMonths < 18) return 'First year - critical retention period'
  if (tenureMonths < 30) return 'Peak turnover risk window (18-30 months)'
  if (tenureMonths < 48) return 'Established employee'
  return 'Long-tenured, strong retention likelihood'
}

/**
 * Calculate performance trajectory risk score
 * Analyzes goal progress trends over time
 */
export const calculatePerformanceRiskScore = (goals: RawPerformanceGoal[]): number => {
  if (goals.length === 0) return 50 // No data = medium baseline

  const activeGoals = goals.filter(g => !['ACHIEVED', 'NOT_ACHIEVED'].includes(g.status))

  if (activeGoals.length === 0) {
    // All goals completed - check success rate
    const achievedCount = goals.filter(g => g.status === 'ACHIEVED').length
    const successRate = achievedCount / goals.length
    return Math.round((1 - successRate) * 50) // Low risk if successful
  }

  const behindCount = activeGoals.filter(g => g.status === 'BEHIND_TARGET' || g.status === 'AT_RISK').length

  const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progressPercent || 0), 0) / activeGoals.length

  // Higher score = higher risk
  const progressRisk = 100 - avgProgress
  const statusRisk = (behindCount / activeGoals.length) * 100

  return Math.round(progressRisk * 0.6 + statusRisk * 0.4)
}

/**
 * Get description for performance risk
 */
export const getPerformanceRiskDescription = (goals: RawPerformanceGoal[]): string => {
  if (goals.length === 0) return 'No performance goals set'

  const activeGoals = goals.filter(g => !['ACHIEVED', 'NOT_ACHIEVED'].includes(g.status))

  const behindCount = activeGoals.filter(g => g.status === 'BEHIND_TARGET' || g.status === 'AT_RISK').length

  if (behindCount === 0) return 'All goals on track'
  if (behindCount === 1) return '1 goal behind target'
  return `${behindCount} goals behind target`
}

/**
 * Calculate absence pattern risk score
 * Elevated sick leave = potential burnout or disengagement
 */
export const calculateAbsenceRiskScore = (absences: RawAbsence[], tenureMonths: number): number => {
  const sickLeaves = absences.filter(a => a.type?.parentEntryId?.includes('HEALTH'))

  const totalSickDays = sickLeaves.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)

  // Annualized sick days
  const annualizedDays = tenureMonths > 0 ? (totalSickDays / Math.min(tenureMonths, 12)) * 12 : totalSickDays

  // Average is ~5-8 days/year; above 12 is concerning
  if (annualizedDays > 20) return 90
  if (annualizedDays > 15) return 75
  if (annualizedDays > 10) return 60
  if (annualizedDays > 5) return 30
  return 15
}

/**
 * Get description for absence risk
 */
export const getAbsenceRiskDescription = (absences: RawAbsence[], tenureMonths: number): string => {
  const sickLeaves = absences.filter(a => a.type?.parentEntryId?.includes('HEALTH'))

  const totalSickDays = sickLeaves.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)

  const annualizedDays =
    tenureMonths > 0 ? Math.round((totalSickDays / Math.min(tenureMonths, 12)) * 12) : totalSickDays

  if (annualizedDays > 15) return `High sick leave rate (~${annualizedDays} days/year)`
  if (annualizedDays > 8) return `Above average sick leave (~${annualizedDays} days/year)`
  return 'Normal absence patterns'
}

/**
 * Calculate engagement risk score (based on feedback frequency)
 */
export const calculateEngagementRiskScore = (
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  tenureMonths: number
): number => {
  const receivedCount = feedbackReceived.length
  const managerFeedbackCount = feedbackFromManager.length

  // Expected: at least 1 feedback per quarter from manager
  const expectedManagerFeedback = Math.max(1, Math.floor(Math.min(tenureMonths, 12) / 3))
  const managerFeedbackGap = Math.max(0, expectedManagerFeedback - managerFeedbackCount)

  // Days since last manager feedback
  let daysSinceManagerFeedback = 365
  if (feedbackFromManager.length > 0) {
    const lastFeedbackDate = new Date(feedbackFromManager[0].feedbackDate)
    daysSinceManagerFeedback = Math.floor((Date.now() - lastFeedbackDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // No feedback in 6+ months = high risk
  if (managerFeedbackCount === 0 && tenureMonths > 6) return 80
  if (daysSinceManagerFeedback > 180) return 75
  if (daysSinceManagerFeedback > 90) return 55
  if (managerFeedbackGap > 2) return 50
  if (receivedCount < 2 && tenureMonths > 12) return 40
  return 20
}

/**
 * Get description for engagement risk
 */
export const getEngagementRiskDescription = (feedbackFromManager: RawFeedback[], tenureMonths: number): string => {
  if (feedbackFromManager.length === 0) {
    return tenureMonths > 6 ? 'No feedback from manager recorded' : 'New employee, building relationship'
  }

  const lastFeedbackDate = new Date(feedbackFromManager[0].feedbackDate)
  const daysSince = Math.floor((Date.now() - lastFeedbackDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSince > 180) return `No manager feedback in ${Math.floor(daysSince / 30)} months`
  if (daysSince > 90) return 'Manager feedback over 3 months ago'
  if (daysSince > 30) return 'Recent manager engagement'
  return 'Active manager engagement'
}

/**
 * Calculate sentiment risk score from feedback ratings or AI analysis
 * @param feedback - Array of raw feedback data
 * @param aiSentimentScore - Optional AI-analyzed sentiment score (0-100, higher = more negative)
 */
export const calculateSentimentRiskScore = (feedback: RawFeedback[], aiSentimentScore?: number): number => {
  // If AI sentiment score is provided, use it directly
  if (aiSentimentScore !== undefined && aiSentimentScore !== null) {
    return Math.round(Math.max(0, Math.min(100, aiSentimentScore)))
  }

  // Fallback to rating-based calculation
  if (feedback.length === 0) return 50 // No data = neutral

  // Use ratings if available
  const ratingsWithValue = feedback.filter(f => f.rating !== undefined && f.rating !== null)

  if (ratingsWithValue.length > 0) {
    const avgRating = ratingsWithValue.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValue.length
    // Assuming 1-5 rating scale, 3 is neutral
    // Convert to risk: 5 stars = 0 risk, 1 star = 100 risk
    return Math.round(Math.max(0, Math.min(100, (5 - avgRating) * 25)))
  }

  // Without ratings, return neutral
  return 50
}

/**
 * Get description for sentiment risk
 * @param feedback - Array of raw feedback data
 * @param aiSummary - Optional AI-generated summary
 * @param isAIAnalyzed - Whether the score was AI-analyzed
 */
export const getSentimentRiskDescription = (
  feedback: RawFeedback[],
  aiSummary?: string,
  isAIAnalyzed?: boolean
): string => {
  // If we have an AI summary, use it
  if (aiSummary && isAIAnalyzed) {
    return aiSummary
  }

  // Fallback to generic descriptions
  if (feedback.length === 0) {
    return 'No feedback data available'
  }

  const ratingsWithValue = feedback.filter(f => f.rating !== undefined && f.rating !== null)

  if (ratingsWithValue.length > 0) {
    const avgRating = ratingsWithValue.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValue.length
    if (avgRating >= 4) return 'Positive feedback sentiment'
    if (avgRating >= 3) return 'Neutral feedback sentiment'
    if (avgRating >= 2) return 'Mixed feedback sentiment'
    return 'Negative feedback sentiment'
  }

  return 'Based on feedback ratings'
}

/**
 * Calculate months since a given date
 */
const monthsSinceDate = (dateStr: string): number => {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
}

/**
 * Salary change record for compensation analysis
 * Compatible with ProcessedSalaryChange from types
 */
interface SalaryChangeRecord {
  effectiveDate: string
  newAmount: number
  previousAmount: number | null
  changePercent?: number | null
}

/**
 * Calculate compensation risk score with real salary data
 * Uses salary history to determine raise frequency and percentage
 */
export const calculateCompensationRiskScore = (
  tenureMonths: number,
  salaryHistory?: SalaryChangeRecord[],
  currentSalary?: number,
  teamMedianSalary?: number
): number => {
  // If no salary data available, fall back to tenure-based estimate
  if (!salaryHistory || salaryHistory.length === 0) {
    if (tenureMonths > 24) return 65
    if (tenureMonths > 18) return 50
    if (tenureMonths > 12) return 35
    return 20
  }

  let riskScore = 0

  // Find the most recent raise (where newAmount > previousAmount and previousAmount exists)
  const raises = salaryHistory.filter(s => s.previousAmount != null && s.newAmount > s.previousAmount)

  if (raises.length > 0) {
    const lastRaise = raises[0]
    const monthsSinceRaise = monthsSinceDate(lastRaise.effectiveDate)
    // We know previousAmount is not null here due to filter
    const prevAmount = lastRaise.previousAmount as number
    const raisePercent = lastRaise.changePercent ?? ((lastRaise.newAmount - prevAmount) / prevAmount) * 100

    // Time since last raise scoring
    if (monthsSinceRaise > 24) {
      riskScore += 40 // No raise in 24+ months
    } else if (monthsSinceRaise > 18) {
      riskScore += 25 // No raise in 18-24 months
    } else if (monthsSinceRaise > 12) {
      riskScore += 10 // No raise in 12-18 months
    }

    // Raise percentage scoring (if last raise was small)
    if (raisePercent < 3 && monthsSinceRaise < 18) {
      riskScore += 15 // Last raise was below inflation
    }
  } else {
    // No raises found in history
    if (tenureMonths > 12) {
      riskScore += 35 // Been here over a year with no recorded raise
    }
  }

  // Salary vs team median comparison
  if (currentSalary && teamMedianSalary && teamMedianSalary > 0) {
    const salaryRatio = currentSalary / teamMedianSalary
    if (salaryRatio < 0.85) {
      riskScore += 20 // Significantly below team median (>15% below)
    } else if (salaryRatio < 0.95) {
      riskScore += 10 // Below team median (5-15% below)
    }
  }

  // Cap at 100
  return Math.min(100, Math.max(0, riskScore))
}

/**
 * Get description for compensation risk
 */
export const getCompensationRiskDescription = (
  tenureMonths: number,
  salaryHistory?: SalaryChangeRecord[],
  currentSalary?: number,
  teamMedianSalary?: number
): string => {
  if (!salaryHistory || salaryHistory.length === 0) {
    if (tenureMonths > 24) return 'May need compensation review'
    if (tenureMonths > 18) return 'Approaching compensation review period'
    return 'Recent compensation likely competitive'
  }

  const raises = salaryHistory.filter(s => s.previousAmount != null && s.newAmount > s.previousAmount)

  if (raises.length > 0) {
    const lastRaise = raises[0]
    const monthsSinceRaise = monthsSinceDate(lastRaise.effectiveDate)
    // We know previousAmount is not null here due to filter
    const prevAmount = lastRaise.previousAmount as number
    const raisePercent = lastRaise.changePercent ?? ((lastRaise.newAmount - prevAmount) / prevAmount) * 100

    if (monthsSinceRaise > 24) {
      return `No raise in ${Math.floor(monthsSinceRaise / 12)} years`
    }
    if (monthsSinceRaise > 18) {
      return `Last raise ${monthsSinceRaise} months ago`
    }
    if (raisePercent < 3) {
      return `Last raise was ${raisePercent.toFixed(1)}% (below inflation)`
    }
    return `Last raise ${monthsSinceRaise} months ago (+${raisePercent.toFixed(1)}%)`
  }

  // Check if below median
  if (currentSalary && teamMedianSalary && currentSalary < teamMedianSalary * 0.9) {
    return 'Below team median salary'
  }

  return 'No salary change history available'
}

/**
 * Calculate overall risk score from individual signals
 */
export const calculateOverallRiskScore = (signals: FlightRiskSignal[]): number => {
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const signal of signals) {
    if (signal.normalizedScore !== null && signal.normalizedScore !== undefined) {
      totalWeightedScore += signal.normalizedScore * signal.weight
      totalWeight += signal.weight
    }
  }

  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50
}

/**
 * Determine risk level from overall score
 */
export const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 75) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Determine risk trend (simplified - would compare to historical data)
 */
/**
 * Get risk trend based on historical scores
 * @param historicalScores - Array of historical scores (most recent first)
 * @returns The calculated trend
 */
export const getRiskTrend = (historicalScores?: { overallScore: number; calculatedAt: string }[]): RiskTrend => {
  // If no historical data, return stable
  if (!historicalScores || historicalScores.length < 2) {
    return 'stable'
  }

  // Take up to 3 most recent and 3 older scores for comparison
  const recentScores = historicalScores.slice(0, Math.min(3, historicalScores.length))
  const olderScores = historicalScores.slice(Math.min(3, historicalScores.length), Math.min(6, historicalScores.length))

  if (olderScores.length === 0) {
    return 'stable'
  }

  const recentAvg = recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length
  const olderAvg = olderScores.reduce((sum, s) => sum + s.overallScore, 0) / olderScores.length

  const diff = recentAvg - olderAvg

  // Threshold of 10 points for significant change
  // Lower score = less risk, so negative diff = improving
  if (diff < -10) return 'improving'
  if (diff > 10) return 'worsening'
  return 'stable'
}

/**
 * Calculate data completeness percentage
 */
export const calculateDataCompleteness = (signals: FlightRiskSignal[]): number => {
  const signalsWithData = signals.filter(s => s.rawValue !== null && s.rawValue !== undefined)
  return Math.round((signalsWithData.length / signals.length) * 100)
}

/**
 * Calculate confidence level based on data availability
 */
export const calculateConfidenceLevel = (dataCompleteness: number, tenureMonths: number): number => {
  // New employees have less historical data
  const tenureFactor = Math.min(1, tenureMonths / 12)
  return Math.round(dataCompleteness * 0.7 + tenureFactor * 100 * 0.3)
}

/**
 * Generate intervention recommendations based on top risk factors
 */
export const generateInterventions = (signals: FlightRiskSignal[]): FlightRiskIntervention[] => {
  const interventions: FlightRiskIntervention[] = []

  const topRisks = [...signals]
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 3)
    .filter(s => s.normalizedScore >= 50) // Only suggest for meaningful risks

  for (const risk of topRisks) {
    switch (risk.category) {
      case 'compensation':
        interventions.push({
          id: `intervention-comp-${risk.id}`,
          type: 'compensation',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Review Compensation',
          description: 'Consider a salary review or discuss career growth and total rewards',
          suggestedBy: 'algorithm'
        })
        break

      case 'engagement':
        interventions.push({
          id: `intervention-eng-${risk.id}`,
          type: 'engagement',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Increase Engagement',
          description: 'Schedule regular 1:1 meetings and provide feedback more frequently',
          suggestedBy: 'algorithm'
        })
        break

      case 'wellness':
        interventions.push({
          id: `intervention-well-${risk.id}`,
          type: 'wellness',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Check Wellbeing',
          description: 'Discuss workload, work-life balance, and potential burnout signs',
          suggestedBy: 'algorithm'
        })
        break

      case 'performance':
        interventions.push({
          id: `intervention-perf-${risk.id}`,
          type: 'career',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Performance Support',
          description: 'Provide coaching, adjust goals if needed, or offer training resources',
          suggestedBy: 'algorithm'
        })
        break

      case 'tenure':
        interventions.push({
          id: `intervention-ten-${risk.id}`,
          type: 'career',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Career Development Discussion',
          description: 'Discuss career path, growth opportunities, and long-term goals',
          suggestedBy: 'algorithm'
        })
        break

      case 'sentiment':
        interventions.push({
          id: `intervention-sent-${risk.id}`,
          type: 'engagement',
          priority: risk.normalizedScore > 70 ? 'high' : 'medium',
          title: 'Open Dialogue',
          description: 'Have a candid conversation about job satisfaction and concerns',
          suggestedBy: 'algorithm'
        })
        break
    }
  }

  return interventions
}

/**
 * Calculate tenure in months from hire date
 */
export const calculateTenureMonths = (hireDate: string | undefined): number => {
  if (!hireDate) return 0

  const hire = new Date(hireDate)
  const now = new Date()
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth())

  return Math.max(0, months)
}
