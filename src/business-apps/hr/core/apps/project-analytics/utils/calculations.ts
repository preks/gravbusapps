import dayjs from 'dayjs'
import { RiskStatus, ProjectAnalyticsData, ProjectWorkingHoursEntry } from '../types'

/**
 * Parse duration text like "4h 15m" or "8h" into hours (decimal)
 */
export const parseHoursFromText = (text?: string): number => {
  if (!text) return 0
  let hours = 0
  let minutes = 0
  const tokens = String(text).trim().split(/\s+/)
  for (const token of tokens) {
    if (/^\d+(\.\d+)?h$/i.test(token)) {
      hours = Number.parseFloat(token.slice(0, -1)) || 0
    } else if (/^\d+m$/i.test(token)) {
      minutes = Number.parseInt(token.slice(0, -1), 10) || 0
    } else if (/^\d+(\.\d+)?$/.test(token)) {
      // Just a number, assume hours
      hours = Number.parseFloat(token) || 0
    }
  }
  return hours + minutes / 60
}

/**
 * Format hours to display text (e.g., 8.5 -> "8h 30m")
 */
export const formatHoursToText = (hours: number): string => {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  if (minutes === 0) {
    return `${wholeHours}h`
  }
  return `${wholeHours}h ${minutes}m`
}

/**
 * Calculate elapsed time percentage between start and end dates
 */
export const calculateElapsedTimePercent = (plannedStartDate?: string, plannedEndDate?: string): number => {
  if (!plannedStartDate || !plannedEndDate) return 0

  const start = dayjs(plannedStartDate)
  const end = dayjs(plannedEndDate)
  const now = dayjs()

  if (now.isBefore(start)) return 0
  if (now.isAfter(end)) return 100

  const totalDuration = end.diff(start, 'day')
  const elapsedDuration = now.diff(start, 'day')

  if (totalDuration <= 0) return 100
  return Math.round((elapsedDuration / totalDuration) * 100)
}

/**
 * Calculate budget consumption percentage
 */
export const calculateBudgetConsumption = (totalLoggedHours: number, hoursBudget?: number): number => {
  if (!hoursBudget || hoursBudget <= 0) return 0
  return Math.round((totalLoggedHours / hoursBudget) * 100)
}

/**
 * Calculate burn rate (hours per day)
 */
export const calculateBurnRate = (totalHours: number, firstWorkingDate?: string, lastWorkingDate?: string): number => {
  if (!firstWorkingDate || !lastWorkingDate || totalHours === 0) return 0

  const start = dayjs(firstWorkingDate)
  const end = dayjs(lastWorkingDate)
  const daysDiff = end.diff(start, 'day') + 1 // Include both days

  if (daysDiff <= 0) return totalHours
  return Math.round((totalHours / daysDiff) * 10) / 10
}

/**
 * Determine risk status based on budget and time consumption
 */
export const determineRiskStatus = (
  budgetConsumptionPercent: number,
  elapsedTimePercent: number,
  totalLoggedHours: number
): { status: RiskStatus; reasons: string[] } => {
  const reasons: string[] = []

  // Not started
  if (totalLoggedHours === 0) {
    return { status: 'not-started', reasons: ['No time logged yet'] }
  }

  // Over budget
  if (budgetConsumptionPercent > 100) {
    reasons.push(`Budget exceeded by ${budgetConsumptionPercent - 100}%`)
    return { status: 'over-budget', reasons }
  }

  // At risk: consuming budget faster than time is progressing
  const scheduleVariance = budgetConsumptionPercent - elapsedTimePercent
  if (scheduleVariance > 10) {
    reasons.push(`Consuming budget ${scheduleVariance}% faster than time progression`)
    return { status: 'at-risk', reasons }
  }

  // At risk: close to budget
  if (budgetConsumptionPercent > 80 && elapsedTimePercent < 70) {
    reasons.push('High budget consumption with significant time remaining')
    return { status: 'at-risk', reasons }
  }

  return { status: 'on-track', reasons: ['Project is progressing as expected'] }
}

/**
 * Generate budget vs time insights
 */
const generateBudgetTimeInsights = (budgetConsumptionPercent: number, elapsedTimePercent: number): string[] => {
  const insights: string[] = []
  if (budgetConsumptionPercent > elapsedTimePercent + 10) {
    insights.push(
      `Project is consuming budget ${budgetConsumptionPercent - elapsedTimePercent}% faster than time progression.`
    )
  } else if (elapsedTimePercent > budgetConsumptionPercent + 20) {
    insights.push(`Project is under-utilizing budget relative to timeline. Consider accelerating work.`)
  }
  return insights
}

/**
 * Generate burn rate trend insights
 */
const generateBurnRateInsights = (weeklyBurnRates: Array<{ burnRate: number }>): string[] => {
  const insights: string[] = []
  if (weeklyBurnRates.length >= 2) {
    const recentRates = weeklyBurnRates.slice(-2)
    const previousRate = recentRates[0]?.burnRate || 0
    const currentRate = recentRates[1]?.burnRate || previousRate
    const rateChange = previousRate > 0 ? Math.round(((currentRate - previousRate) / previousRate) * 100) : 0

    if (rateChange > 20) {
      insights.push(`Burn rate increased by ${rateChange}% in the last 2 weeks.`)
    } else if (rateChange < -20) {
      insights.push(`Burn rate decreased by ${Math.abs(rateChange)}% in the last 2 weeks.`)
    }
  }
  return insights
}

/**
 * Generate forecast insights
 */
const generateForecastInsights = (
  burnRatePerDay: number,
  remainingHours: number,
  plannedEndDate?: string
): string[] => {
  const insights: string[] = []
  if (burnRatePerDay > 0 && remainingHours > 0 && plannedEndDate) {
    const daysNeeded = Math.ceil(remainingHours / burnRatePerDay)
    const projectedEndDate = dayjs().add(daysNeeded, 'day')
    const plannedEnd = dayjs(plannedEndDate)

    if (projectedEndDate.isAfter(plannedEnd)) {
      const daysLate = projectedEndDate.diff(plannedEnd, 'day')
      insights.push(`If current burn rate continues, budget will be exhausted ${daysLate} days after planned end date.`)
    }
  }
  return insights
}

/**
 * Generate team concentration insights
 */
const generateTeamConcentrationInsights = (
  topContributors: Array<{ percentOfTotal: number }>,
  activeContributorsCount: number
): string[] => {
  const insights: string[] = []
  if (topContributors.length > 0 && activeContributorsCount > 2) {
    const top2Percent = topContributors.slice(0, 2).reduce((sum, c) => sum + c.percentOfTotal, 0)
    if (top2Percent > 45) {
      insights.push(`Top 2 contributors account for ${Math.round(top2Percent)}% of total effort.`)
    }
  }
  return insights
}

/**
 * Generate smart insights for a project
 */
export const generateInsights = (analytics: Partial<ProjectAnalyticsData>): string[] => {
  const {
    budgetConsumptionPercent = 0,
    elapsedTimePercent = 0,
    burnRatePerDay = 0,
    remainingHours = 0,
    hoursBudget = 0,
    weeklyBurnRates = [],
    topContributors = [],
    activeContributorsCount = 0,
    plannedEndDate
  } = analytics

  const insights: string[] = []

  // Budget vs Time insight
  insights.push(...generateBudgetTimeInsights(budgetConsumptionPercent, elapsedTimePercent))

  // Burn rate trend
  insights.push(...generateBurnRateInsights(weeklyBurnRates))

  // Forecast
  insights.push(...generateForecastInsights(burnRatePerDay, remainingHours, plannedEndDate))

  // Over budget projection
  if (budgetConsumptionPercent > 100 && hoursBudget) {
    const overrun = Math.round(((budgetConsumptionPercent - 100) / 100) * hoursBudget)
    insights.push(`This project has exceeded budget by ${overrun} hours.`)
  }

  // Team concentration
  insights.push(...generateTeamConcentrationInsights(topContributors, activeContributorsCount))

  return insights
}

/**
 * Aggregate working hours by employee for contributor breakdown
 */
export const aggregateContributors = (
  entries: ProjectWorkingHoursEntry[]
): Array<{
  employeeId: string
  employeeName: string
  employeePicture?: string
  totalHours: number
  percentOfTotal: number
}> => {
  const employeeMap = new Map<string, { name: string; picture?: string; hours: number }>()
  let totalHours = 0

  for (const entry of entries) {
    const hours = parseHoursFromText(entry.actualWorkingHours)
    totalHours += hours

    const existing = employeeMap.get(entry.employeeId)
    if (existing) {
      existing.hours += hours
    } else {
      const name = entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}` : 'Unknown'
      employeeMap.set(entry.employeeId, {
        name,
        picture: entry.employee?.pictureThumbnail,
        hours
      })
    }
  }

  return Array.from(employeeMap.entries())
    .map(([employeeId, data]) => ({
      employeeId,
      employeeName: data.name,
      employeePicture: data.picture,
      totalHours: Math.round(data.hours * 10) / 10,
      percentOfTotal: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
}

/**
 * Calculate weekly burn rates from working hours entries
 */
export const calculateWeeklyBurnRates = (
  entries: ProjectWorkingHoursEntry[]
): Array<{
  weekStart: string
  weekEnd: string
  hoursLogged: number
  burnRate: number
}> => {
  if (entries.length === 0) return []

  // Sort by date
  const sorted = [...entries].sort((a, b) => dayjs(a.workingDate).unix() - dayjs(b.workingDate).unix())

  const weeklyData = new Map<string, number>()

  for (const entry of sorted) {
    const weekStart = dayjs(entry.workingDate).startOf('week').format('YYYY-MM-DD')
    const hours = parseHoursFromText(entry.actualWorkingHours)
    weeklyData.set(weekStart, (weeklyData.get(weekStart) || 0) + hours)
  }

  return Array.from(weeklyData.entries()).map(([weekStart, hours]) => {
    const weekEnd = dayjs(weekStart).endOf('week').format('YYYY-MM-DD')
    // Assuming 5 working days per week
    const burnRate = Math.round((hours / 5) * 10) / 10
    return {
      weekStart,
      weekEnd,
      hoursLogged: Math.round(hours * 10) / 10,
      burnRate
    }
  })
}

/**
 * Get days until deadline
 */
export const getDaysUntilDeadline = (plannedEndDate?: string): number | undefined => {
  if (!plannedEndDate) return undefined
  const end = dayjs(plannedEndDate)
  const now = dayjs()
  return end.diff(now, 'day')
}
