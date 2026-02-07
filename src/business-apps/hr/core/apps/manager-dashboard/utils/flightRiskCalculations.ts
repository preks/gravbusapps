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
 * Calculate sentiment risk score from feedback ratings
 * (Simplified version - full version would use AI)
 */
export const calculateSentimentRiskScore = (feedback: RawFeedback[]): number => {
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
 * Calculate compensation risk score
 * Placeholder - would need actual salary data integration
 */
export const calculateCompensationRiskScore = (tenureMonths: number): number => {
  // Without salary data, estimate based on tenure
  // Employees without raises for 18+ months are at higher risk
  if (tenureMonths > 24) return 65 // Likely needs compensation review
  if (tenureMonths > 18) return 50
  if (tenureMonths > 12) return 35
  return 20 // Recent hire, compensation probably competitive
}

/**
 * Get description for compensation risk
 */
export const getCompensationRiskDescription = (tenureMonths: number): string => {
  if (tenureMonths > 24) return 'May need compensation review'
  if (tenureMonths > 18) return 'Approaching compensation review period'
  return 'Recent compensation likely competitive'
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
export const getRiskTrend = (): RiskTrend => {
  // In a full implementation, this would compare to previous scores
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
