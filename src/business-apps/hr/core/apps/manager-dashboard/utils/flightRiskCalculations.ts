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
import { getTrackState } from '../../employee-record/components/tabs/performance-evaluation/utils/performanceGoalsSummary'

// Signal weights - configurable based on organization preferences
export const SIGNAL_WEIGHTS: Record<SignalCategory, number> = {
  tenure: 0.15,
  performance: 0.2,
  engagement: 0.15,
  compensation: 0.2,
  wellness: 0.15,
  sentiment: 0.15
}

const getWholeMonthsBetween = (startDate: Date, endDate: Date): number => {
  let months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (endDate.getUTCMonth() - startDate.getUTCMonth())

  if (endDate.getUTCDate() < startDate.getUTCDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

interface TenureRiskBand {
  score: number
  description: string
}

const getTenureRiskBand = (tenureMonths: number): TenureRiskBand => {
  if (tenureMonths < 3) return { score: 10, description: 'Too new, not enough signal' }
  if (tenureMonths < 6) return { score: 25, description: 'Probation period' }
  if (tenureMonths < 12) return { score: 50, description: 'First year adjustment' }
  if (tenureMonths < 18) return { score: 75, description: 'Peak risk starts' }
  if (tenureMonths < 30) return { score: 85, description: 'Peak turnover zone (18-30 months)' }
  if (tenureMonths < 48) return { score: 60, description: 'Declining risk' }
  if (tenureMonths < 60) return { score: 40, description: 'Established' }

  return { score: 20, description: 'Long-tenured, low risk' }
}

/**
 * Calculate tenure risk score
 * Peak risk at 18-24 months (highest turnover period)
 * Lower risk for new hires (<6 months) and long-tenured (>5 years)
 */
export const calculateTenureRiskScore = (tenureMonths: number): number => {
  return getTenureRiskBand(tenureMonths).score
}

/**
 * Get description for tenure risk
 */
export const getTenureRiskDescription = (tenureMonths: number): string => {
  return getTenureRiskBand(tenureMonths).description
}

/**
 * Calculate performance trajectory risk score
 * Analyzes goal progress trends over time
 */
const isGoalBehindTarget = (goal: RawPerformanceGoal): boolean => {
  return goal.status === 'AT_RISK' || goal.status === 'BEHIND_TARGET' || getTrackState(goal) === 'BEHIND_TARGET'
}

const getPerformanceRiskAssessment = (goals: RawPerformanceGoal[]): { score: number; description: string } => {
  if (goals.length === 0) {
    return {
      score: 50,
      description: 'No performance goals set'
    }
  }

  const activeGoals = goals.filter(g => !['ACHIEVED', 'NOT_ACHIEVED'].includes(g.status))

  if (activeGoals.length === 0) {
    const achievedCount = goals.filter(g => g.status === 'ACHIEVED').length
    const successRate = achievedCount / goals.length
    return {
      score: Math.round((1 - successRate) * 50),
      description: `All goals completed; success rate ${Math.round(successRate * 100)}%`
    }
  }

  const behindCount = activeGoals.filter(isGoalBehindTarget).length
  const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progressPercent || 0), 0) / activeGoals.length
  const progressRisk = 100 - avgProgress
  const statusRisk = (behindCount / activeGoals.length) * 100
  const score = Math.round(progressRisk * 0.6 + statusRisk * 0.4)

  return {
    score,
    description: `Progress risk ${Math.round(progressRisk)}% from avg progress ${Math.round(avgProgress)}%; status risk ${Math.round(statusRisk)}% (${behindCount}/${activeGoals.length} active goals behind target or at risk).`
  }
}

export const calculatePerformanceRiskScore = (goals: RawPerformanceGoal[]): number => {
  return getPerformanceRiskAssessment(goals).score
}

/**
 * Get description for performance risk
 */
export const getPerformanceRiskDescription = (goals: RawPerformanceGoal[]): string => {
  return getPerformanceRiskAssessment(goals).description
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
const getLatestFeedbackDate = (feedback: RawFeedback[]): Date | null => {
  if (feedback.length === 0) return null

  const latestFeedbackTimestamp = Math.max(...feedback.map(entry => new Date(entry.feedbackDate).getTime()))
  return Number.isNaN(latestFeedbackTimestamp) ? null : new Date(latestFeedbackTimestamp)
}

const getEngagementRiskAssessment = (
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  tenureMonths: number
): { score: number; description: string } => {
  const receivedCount = feedbackReceived.length
  const managerFeedbackCount = feedbackFromManager.length

  if (managerFeedbackCount === 0) {
    if (tenureMonths > 6) {
      return {
        score: 80,
        description: 'No manager feedback recorded after 6+ months tenure'
      }
    }

    return {
      score: 20,
      description: 'New employee, still within the initial feedback window'
    }
  }

  const expectedManagerFeedback = Math.floor(Math.min(tenureMonths, 12) / 3)
  const managerFeedbackGap = Math.max(0, expectedManagerFeedback - managerFeedbackCount)
  const latestManagerFeedbackDate = getLatestFeedbackDate(feedbackFromManager)
  const daysSinceManagerFeedback = latestManagerFeedbackDate
    ? Math.floor((Date.now() - latestManagerFeedbackDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (daysSinceManagerFeedback > 180) {
    return {
      score: 75,
      description: `Last manager feedback ${Math.floor(daysSinceManagerFeedback / 30)} months ago`
    }
  }

  if (daysSinceManagerFeedback > 90) {
    return {
      score: 55,
      description: `Last manager feedback ${Math.floor(daysSinceManagerFeedback / 30)} months ago`
    }
  }

  if (managerFeedbackGap > 2) {
    return {
      score: 50,
      description: `Manager feedback gap: expected ${expectedManagerFeedback}, recorded ${managerFeedbackCount}`
    }
  }

  if (receivedCount < 2 && tenureMonths > 12) {
    return {
      score: 40,
      description: 'Fewer than 2 feedback entries after 12+ months tenure'
    }
  }

  return {
    score: 20,
    description: 'Regular manager feedback cadence'
  }
}

export const calculateEngagementRiskScore = (
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  tenureMonths: number
): number => {
  return getEngagementRiskAssessment(feedbackReceived, feedbackFromManager, tenureMonths).score
}

/**
 * Get description for engagement risk
 */
export const getEngagementRiskDescription = (
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  tenureMonths: number
): string => {
  return getEngagementRiskAssessment(feedbackReceived, feedbackFromManager, tenureMonths).description
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

  if (Number.isNaN(date.getTime())) {
    return 0
  }

  return getWholeMonthsBetween(date, now)
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

const getTenureBasedCompensationRisk = (tenureMonths: number): number => {
  if (tenureMonths > 24) return 65
  if (tenureMonths > 18) return 50
  if (tenureMonths > 12) return 35
  return 20
}

const getMonthsSinceRaiseRisk = (monthsSinceRaise: number): number => {
  if (monthsSinceRaise > 24) return 40
  if (monthsSinceRaise > 18) return 25
  if (monthsSinceRaise > 12) return 10
  return 0
}

const getRaisePercentRisk = (raisePercent: number, monthsSinceRaise: number): number => {
  if (raisePercent < 3 && monthsSinceRaise < 18) {
    return 15
  }
  return 0
}

const getSalaryRatioRisk = (currentSalary?: number, teamMedianSalary?: number): number => {
  if (!currentSalary || !teamMedianSalary || teamMedianSalary <= 0) {
    return 0
  }

  const salaryRatio = currentSalary / teamMedianSalary
  if (salaryRatio < 0.85) return 20
  if (salaryRatio < 0.95) return 10
  return 0
}

const formatRaiseTimingDescription = (monthsSinceRaise: number, pointsAdded: number): string => {
  if (pointsAdded === 0) {
    return `Recent raise ${monthsSinceRaise} months ago (+0)`
  }

  if (monthsSinceRaise > 24) {
    return `No raise in ${Math.floor(monthsSinceRaise / 12)} years (+${pointsAdded})`
  }

  return `Last raise ${monthsSinceRaise} months ago (+${pointsAdded})`
}

const formatSalaryRatioDescription = (currentSalary: number, teamMedianSalary: number, pointsAdded: number): string => {
  const ratio = (currentSalary / teamMedianSalary) * 100
  return `Current salary is ${ratio.toFixed(0)}% of same-currency team median (+${pointsAdded})`
}

const getFallbackCompensationDescription = (tenureMonths: number): string => {
  if (tenureMonths > 24) {
    return 'No salary history available; 24+ months tenure suggests a compensation review may be overdue'
  }
  if (tenureMonths > 18) {
    return 'No salary history available; employee is approaching the typical compensation review window'
  }
  if (tenureMonths > 12) {
    return 'No salary history available; employee is in the moderate compensation-risk window'
  }

  return 'No salary history available; new hire is likely still on the original offer'
}

const getCompensationRiskAssessment = (
  tenureMonths: number,
  salaryHistory?: SalaryChangeRecord[],
  currentSalary?: number,
  teamMedianSalary?: number
): { score: number; description: string } => {
  if (!salaryHistory || salaryHistory.length === 0) {
    return {
      score: getTenureBasedCompensationRisk(tenureMonths),
      description: getFallbackCompensationDescription(tenureMonths)
    }
  }

  const descriptionParts: string[] = []
  let riskScore = 0
  const raises = salaryHistory.filter(s => s.previousAmount != null && s.newAmount > s.previousAmount)

  if (raises.length === 0) {
    if (tenureMonths > 12) {
      riskScore += 35
      descriptionParts.push('No raises recorded after 12+ months tenure (+35)')
    } else {
      descriptionParts.push('No raises recorded yet, but tenure is under 12 months')
    }
  } else {
    const lastRaise = raises[0]
    const monthsSinceRaise = monthsSinceDate(lastRaise.effectiveDate)
    const timingRisk = getMonthsSinceRaiseRisk(monthsSinceRaise)
    const previousAmount = lastRaise.previousAmount as number
    const raisePercent = lastRaise.changePercent ?? ((lastRaise.newAmount - previousAmount) / previousAmount) * 100
    const raisePercentRisk = getRaisePercentRisk(raisePercent, monthsSinceRaise)

    riskScore += timingRisk + raisePercentRisk
    descriptionParts.push(formatRaiseTimingDescription(monthsSinceRaise, timingRisk))

    if (raisePercentRisk > 0) {
      descriptionParts.push(`Last raise ${raisePercent.toFixed(1)}% is below 3% (+${raisePercentRisk})`)
    } else {
      descriptionParts.push(`Last raise ${raisePercent.toFixed(1)}% is within the expected range (+0)`)
    }
  }

  const salaryRatioRisk = getSalaryRatioRisk(currentSalary, teamMedianSalary)
  riskScore += salaryRatioRisk

  if (currentSalary && teamMedianSalary && teamMedianSalary > 0) {
    descriptionParts.push(formatSalaryRatioDescription(currentSalary, teamMedianSalary, salaryRatioRisk))
  } else {
    descriptionParts.push('No same-currency team median available')
  }

  return {
    score: Math.min(100, Math.max(0, riskScore)),
    description: descriptionParts.join('; ')
  }
}

const getInterventionDefinition = (
  category: SignalCategory
): Omit<FlightRiskIntervention, 'id' | 'priority' | 'suggestedBy'> => {
  switch (category) {
    case 'compensation':
      return {
        type: 'compensation',
        title: 'Review Compensation',
        description: 'Consider a salary review or discuss career growth and total rewards'
      }
    case 'engagement':
      return {
        type: 'engagement',
        title: 'Increase Engagement',
        description: 'Schedule regular 1:1 meetings and provide feedback more frequently'
      }
    case 'wellness':
      return {
        type: 'wellness',
        title: 'Check Wellbeing',
        description: 'Discuss workload, work-life balance, and potential burnout signs'
      }
    case 'performance':
      return {
        type: 'career',
        title: 'Performance Support',
        description: 'Provide coaching, adjust goals if needed, or offer training resources'
      }
    case 'tenure':
      return {
        type: 'career',
        title: 'Career Development Discussion',
        description: 'Discuss career path, growth opportunities, and long-term goals'
      }
    case 'sentiment':
      return {
        type: 'engagement',
        title: 'Open Dialogue',
        description: 'Have a candid conversation about job satisfaction and concerns'
      }
  }
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
  return getCompensationRiskAssessment(tenureMonths, salaryHistory, currentSalary, teamMedianSalary).score
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
  return getCompensationRiskAssessment(tenureMonths, salaryHistory, currentSalary, teamMedianSalary).description
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
  const topRisks = [...signals]
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 3)
    .filter(s => s.normalizedScore >= 50)

  return topRisks.map(risk => {
    const definition = getInterventionDefinition(risk.category)
    const categoryPrefix = risk.category.slice(0, 4)

    return {
      id: `intervention-${categoryPrefix}-${risk.id}`,
      priority: risk.normalizedScore > 70 ? 'high' : 'medium',
      suggestedBy: 'algorithm',
      ...definition
    }
  })
}

/**
 * Calculate tenure in months from hire date
 */
export const calculateTenureMonths = (hireDate: string | undefined): number => {
  if (!hireDate) return 0

  const hire = new Date(hireDate)
  const now = new Date()

  if (Number.isNaN(hire.getTime())) {
    return 0
  }

  return getWholeMonthsBetween(hire, now)
}
