import { generateYearOverYearChartData } from './chartDataUtils'
import { calculateWorkStreaks, calculateAverageWorkStreak } from './workStreakCalculator'
import { analyzeSickAbsencesByMonth } from './monthlyAnalysisUtils'

export interface ProcessedStatistics {
  pendingRequests: number
  approvedAbsences: number
  teamMembersAway: number
  upcomingAbsences: number
  vacationCount: number
  sickLeaveCount: number
  averageDaysPerRequest: string
  approvalRate: number
  averageWorkStreak: string
  sickAbsencesByMonth: {
    month: string
    count: number
  }
  plannedAbsences: number
  plannedAbsencesDays: number
  unplannedAbsences: number
  unplannedAbsencesDays: number
  absences: any[]
  yearOverYearData: any[]
}

export const processStatisticsData = (
  apiResults: any,
  currentYear: number,
  previousYear: number
): ProcessedStatistics => {
  const {
    approvedAbsencesResult,
    pendingRequestsResult,
    teamMembersAwayResult,
    upcomingAbsencesResult,
    vacationAbsencesResult,
    sickLeaveAbsencesResult,
    plannedVsUnplannedResult,
    averageDaysResult,
    usageTrendsResult,
    yearOverYearResult,
    averageWorkStreakResult,
    sickAbsencesByMonthResult
  } = apiResults

  const approvedAbsencesCount = approvedAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
  const pendingRequests = pendingRequestsResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
  const teamMembersAway = teamMembersAwayResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
  const upcomingAbsences = upcomingAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
  const vacationCount = vacationAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
  const sickLeaveCount = sickLeaveAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0

  const plannedAbsences = plannedVsUnplannedResult.plannedAbsences?.aggregate?.count || 0
  const unplannedAbsences = plannedVsUnplannedResult.unplannedAbsences?.aggregate?.count || 0

  const approvedAbsencesCountForAvg = averageDaysResult.approvedAbsencesWithDays?.aggregate?.count || 0
  const totalEffectiveDays = averageDaysResult.approvedAbsencesWithDays?.aggregate?.sum?.effectiveDays || 0
  const averageDaysPerRequest =
    approvedAbsencesCountForAvg > 0
      ? (Math.round((totalEffectiveDays / approvedAbsencesCountForAvg) * 10) / 10).toFixed(1)
      : '0.0'

  const totalRequests = approvedAbsencesCount + pendingRequests
  const approvalRate = totalRequests > 0 ? Math.round((approvedAbsencesCount / totalRequests) * 100) : 0

  const yearOverYearRawData = yearOverYearResult.yearOverYearData || []
  const yearOverYearData = generateYearOverYearChartData(yearOverYearRawData, currentYear, previousYear)

  const absencesForStreak = averageWorkStreakResult.approvedAbsencesForStreak || []
  const workStreaks = calculateWorkStreaks(absencesForStreak)
  const averageWorkStreak = calculateAverageWorkStreak(workStreaks)

  const sickAbsences = sickAbsencesByMonthResult.EmployeeAbsence || []
  const sickAbsencesByMonth = analyzeSickAbsencesByMonth(sickAbsences)

  const absencesForTrends = usageTrendsResult.approvedAbsencesForTrends || []

  return {
    pendingRequests,
    approvedAbsences: approvedAbsencesCount,
    teamMembersAway,
    upcomingAbsences,
    vacationCount,
    sickLeaveCount,
    averageDaysPerRequest,
    approvalRate,
    averageWorkStreak,
    sickAbsencesByMonth,
    plannedAbsences,
    plannedAbsencesDays: 0,
    unplannedAbsences,
    unplannedAbsencesDays: 0,
    absences: absencesForTrends,
    yearOverYearData
  }
}
