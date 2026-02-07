/**
 * useFlightRiskPrediction Hook
 * Main orchestrator hook for calculating employee flight risk scores
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useSaveRiskScores } from './useSaveRiskScores'
import {
  FlightRiskEmployee,
  FlightRiskSummary,
  FlightRiskSignal,
  UseFlightRiskResult,
  UseFlightRiskProps,
  RawEmployeeData,
  RawPerformanceGoal,
  RawFeedback,
  RawAbsence,
  RawSalaryHistory,
  RawCurrentSalary,
  FlightRiskQueryResponse,
  SalaryHistoryQueryResponse,
  CurrentSalariesQueryResponse
} from '../types/flightRisk.types'
import { GET_FLIGHT_RISK_DATA, GET_TEAM_SALARY_HISTORY, GET_TEAM_CURRENT_SALARIES } from '../queries/flightRiskQueries'
import {
  SIGNAL_WEIGHTS,
  calculateTenureMonths,
  calculateTenureRiskScore,
  getTenureRiskDescription,
  calculatePerformanceRiskScore,
  getPerformanceRiskDescription,
  calculateAbsenceRiskScore,
  getAbsenceRiskDescription,
  calculateEngagementRiskScore,
  getEngagementRiskDescription,
  calculateSentimentRiskScore,
  getSentimentRiskDescription,
  calculateCompensationRiskScore,
  getCompensationRiskDescription,
  calculateOverallRiskScore,
  getRiskLevel,
  getRiskTrend,
  calculateDataCompleteness,
  calculateConfidenceLevel,
  generateInterventions
} from '../utils/flightRiskCalculations'

/**
 * Salary data structure for an employee
 */
interface EmployeeSalaryInfo {
  salaryHistory: RawSalaryHistory[]
  currentSalary?: number
  teamMedianSalary?: number
}

/**
 * Sentiment analysis data for an employee
 */
interface EmployeeSentimentInfo {
  score: number
  summary?: string
  isAIAnalyzed: boolean
}

/**
 * Historical trend data for an employee
 */
interface EmployeeTrendInfo {
  historicalScores: { overallScore: number; calculatedAt: string }[]
}

/**
 * Build flight risk signals for an employee
 */
const buildSignals = (
  employeeId: string,
  tenureMonths: number,
  performanceGoals: RawPerformanceGoal[],
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  absences: RawAbsence[],
  salaryInfo?: EmployeeSalaryInfo,
  sentimentInfo?: EmployeeSentimentInfo
): FlightRiskSignal[] => {
  const signals: FlightRiskSignal[] = []

  // Tenure Signal
  const tenureScore = calculateTenureRiskScore(tenureMonths)
  signals.push({
    id: `${employeeId}-tenure`,
    name: 'Tenure Risk',
    category: 'tenure',
    rawValue: tenureMonths,
    normalizedScore: tenureScore,
    weight: SIGNAL_WEIGHTS.tenure,
    description: getTenureRiskDescription(tenureMonths),
    dataSource: 'workingCondition.hireDate'
  })

  // Performance Signal
  const employeeGoals = performanceGoals.filter(g => g.employeeId === employeeId)
  const performanceScore = calculatePerformanceRiskScore(employeeGoals)
  signals.push({
    id: `${employeeId}-performance`,
    name: 'Performance',
    category: 'performance',
    rawValue: employeeGoals.length > 0 ? employeeGoals.length : null,
    normalizedScore: performanceScore,
    weight: SIGNAL_WEIGHTS.performance,
    description: getPerformanceRiskDescription(employeeGoals),
    dataSource: 'EmployeePerformanceGoal'
  })

  // Engagement Signal
  const employeeFeedbackReceived = feedbackReceived.filter(f => f.employeeId === employeeId)
  const employeeManagerFeedback = feedbackFromManager.filter(f => f.employeeId === employeeId)
  const engagementScore = calculateEngagementRiskScore(employeeFeedbackReceived, employeeManagerFeedback, tenureMonths)
  signals.push({
    id: `${employeeId}-engagement`,
    name: 'Manager Engagement',
    category: 'engagement',
    rawValue: employeeManagerFeedback.length,
    normalizedScore: engagementScore,
    weight: SIGNAL_WEIGHTS.engagement,
    description: getEngagementRiskDescription(employeeManagerFeedback, tenureMonths),
    dataSource: 'EmployeeFeedback'
  })

  // Wellness/Absence Signal
  const employeeAbsences = absences.filter(a => a.employee.id === employeeId)
  const absenceScore = calculateAbsenceRiskScore(employeeAbsences, tenureMonths)
  signals.push({
    id: `${employeeId}-wellness`,
    name: 'Wellness',
    category: 'wellness',
    rawValue: employeeAbsences.length,
    normalizedScore: absenceScore,
    weight: SIGNAL_WEIGHTS.wellness,
    description: getAbsenceRiskDescription(employeeAbsences, tenureMonths),
    dataSource: 'EmployeeAbsence'
  })

  // Sentiment Signal (AI-analyzed or rating-based)
  const sentimentScore = calculateSentimentRiskScore(employeeFeedbackReceived, sentimentInfo?.score)
  const sentimentDescription = getSentimentRiskDescription(
    employeeFeedbackReceived,
    sentimentInfo?.summary,
    sentimentInfo?.isAIAnalyzed
  )
  signals.push({
    id: `${employeeId}-sentiment`,
    name: sentimentInfo?.isAIAnalyzed ? 'Sentiment (AI)' : 'Feedback Sentiment',
    category: 'sentiment',
    rawValue: sentimentInfo?.isAIAnalyzed ? 'ai-analyzed' : employeeFeedbackReceived.length > 0 ? 'ratings' : null,
    normalizedScore: sentimentScore,
    weight: SIGNAL_WEIGHTS.sentiment,
    description: sentimentDescription,
    dataSource: sentimentInfo?.isAIAnalyzed ? 'FlowBot AI' : 'EmployeeFeedback.rating'
  })

  // Compensation Signal - now with real salary data
  const employeeSalaryHistory = salaryInfo?.salaryHistory || []
  const compensationScore = calculateCompensationRiskScore(
    tenureMonths,
    employeeSalaryHistory,
    salaryInfo?.currentSalary,
    salaryInfo?.teamMedianSalary
  )
  signals.push({
    id: `${employeeId}-compensation`,
    name: 'Compensation',
    category: 'compensation',
    rawValue: salaryInfo?.currentSalary || null,
    normalizedScore: compensationScore,
    weight: SIGNAL_WEIGHTS.compensation,
    description: getCompensationRiskDescription(
      tenureMonths,
      employeeSalaryHistory,
      salaryInfo?.currentSalary,
      salaryInfo?.teamMedianSalary
    ),
    dataSource: 'salaryHistory'
  })

  return signals
}

/**
 * Calculate team median salary from current salaries
 */
const calculateTeamMedianSalary = (currentSalaries: RawCurrentSalary[]): number => {
  if (currentSalaries.length === 0) return 0
  const amounts = currentSalaries.map(s => s.amount).sort((a, b) => a - b)
  const mid = Math.floor(amounts.length / 2)
  return amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2
}

/**
 * Group salary data by employee
 */
const groupSalaryDataByEmployee = (
  salaryHistory: RawSalaryHistory[],
  currentSalaries: RawCurrentSalary[],
  teamMedianSalary: number
): Map<string, EmployeeSalaryInfo> => {
  const salaryMap = new Map<string, EmployeeSalaryInfo>()

  // Group salary history by employee
  salaryHistory.forEach(record => {
    const existing = salaryMap.get(record.employeeId)
    if (existing) {
      existing.salaryHistory.push(record)
    } else {
      salaryMap.set(record.employeeId, {
        salaryHistory: [record],
        teamMedianSalary
      })
    }
  })

  // Add current salaries
  currentSalaries.forEach(salary => {
    const existing = salaryMap.get(salary.employeeId)
    if (existing) {
      existing.currentSalary = salary.amount
    } else {
      salaryMap.set(salary.employeeId, {
        salaryHistory: [],
        currentSalary: salary.amount,
        teamMedianSalary
      })
    }
  })

  return salaryMap
}

/**
 * Process raw query data into FlightRiskEmployee objects
 */
const processFlightRiskData = (
  response: FlightRiskQueryResponse,
  salaryDataMap: Map<string, EmployeeSalaryInfo>,
  sentimentDataMap: Map<string, EmployeeSentimentInfo>,
  trendDataMap: Map<string, EmployeeTrendInfo>
): FlightRiskEmployee[] => {
  const { employees, performanceGoals, feedbackReceived, managerFeedback, absences } = response

  return employees.map((emp: RawEmployeeData) => {
    const hireDate = emp.workingCondition?.hireDate || ''
    const tenureMonths = calculateTenureMonths(hireDate)

    // Get salary data for this employee
    const salaryInfo = salaryDataMap.get(emp.id)

    // Get sentiment data for this employee
    const sentimentInfo = sentimentDataMap.get(emp.id)

    // Get trend data for this employee
    const trendInfo = trendDataMap.get(emp.id)

    // Build all signals for this employee
    const signals = buildSignals(
      emp.id,
      tenureMonths,
      performanceGoals,
      feedbackReceived,
      managerFeedback,
      absences,
      salaryInfo,
      sentimentInfo
    )

    // Calculate overall score
    const overallRiskScore = calculateOverallRiskScore(signals)
    const riskLevel = getRiskLevel(overallRiskScore)
    const riskTrend = getRiskTrend(trendInfo?.historicalScores)
    const dataCompleteness = calculateDataCompleteness(signals)
    const confidenceLevel = calculateConfidenceLevel(dataCompleteness, tenureMonths)

    // Get top 3 risk factors
    const topRiskFactors = [...signals].sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 3)

    // Generate interventions
    const interventions = generateInterventions(signals)

    return {
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      pictureThumbnail: emp.pictureThumbnail,
      jobPositionName: emp.employeePosition?.[0]?.jobPosition?.name || '',
      departmentName: emp.employeePosition?.[0]?.organizationalUnit?.name || '',
      hireDate,
      tenureMonths,
      overallRiskScore,
      riskLevel,
      riskTrend,
      confidenceLevel,
      signals,
      topRiskFactors,
      interventions,
      lastUpdated: new Date(),
      dataCompleteness
    }
  })
}

/**
 * Main hook for flight risk prediction
 */
export const useFlightRiskPrediction = ({
  accessToken,
  managerId,
  directReportIds
}: UseFlightRiskProps): UseFlightRiskResult => {
  const [employees, setEmployees] = useState<FlightRiskEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchFlightRiskData = useCallback(async () => {
    if (!managerId || !accessToken || directReportIds.length === 0) {
      setLoading(false)
      setEmployees([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      // Fetch main flight risk data and salary data in parallel
      const [flightRiskResponse, salaryHistoryResponse, currentSalariesResponse] = await Promise.all([
        graphQLClient.request<FlightRiskQueryResponse>(GET_FLIGHT_RISK_DATA, {
          managerId,
          teamMemberIds: directReportIds,
          oneYearAgo: oneYearAgo.toISOString()
        }),
        graphQLClient
          .request<SalaryHistoryQueryResponse>(GET_TEAM_SALARY_HISTORY, {
            employeeIds: directReportIds
          })
          .catch(() => ({ salaryHistory: [] })), // Graceful fallback if salary API not available
        graphQLClient
          .request<CurrentSalariesQueryResponse>(GET_TEAM_CURRENT_SALARIES, {
            employeeIds: directReportIds
          })
          .catch(() => ({ salaries: [] })) // Graceful fallback
      ])

      // Process salary data
      const currentSalaries = currentSalariesResponse.salaries || []
      const salaryHistory = salaryHistoryResponse.salaryHistory || []
      const teamMedianSalary = calculateTeamMedianSalary(currentSalaries)
      const salaryDataMap = groupSalaryDataByEmployee(salaryHistory, currentSalaries, teamMedianSalary)

      // Sentiment data map - will be populated by useFeedbackSentiment hook when enabled
      const sentimentDataMap = new Map<string, EmployeeSentimentInfo>()

      // Trend data map - will be populated when backend API is available
      const trendDataMap = new Map<string, EmployeeTrendInfo>()

      // Process data and calculate risk scores with salary, sentiment, and trend data
      const processedEmployees = processFlightRiskData(
        flightRiskResponse,
        salaryDataMap,
        sentimentDataMap,
        trendDataMap
      )
      setEmployees(processedEmployees)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch flight risk data'))
      console.error('Error fetching flight risk data:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, directReportIds, graphQLClient])

  useEffect(() => {
    fetchFlightRiskData()
  }, [fetchFlightRiskData])

  // Auto-save risk scores for trend tracking
  const { saveScores } = useSaveRiskScores({
    accessToken,
    managerId,
    enabled: true
  })

  // Track if we've already saved this calculation
  const hasSavedRef = useRef(false)

  useEffect(() => {
    // Save scores once when we have data and haven't saved yet
    if (employees.length > 0 && !loading && !hasSavedRef.current) {
      saveScores(employees)
      hasSavedRef.current = true
    }
  }, [employees, loading, saveScores])

  // Calculate summary statistics
  const summary = useMemo((): FlightRiskSummary => {
    const criticalCount = employees.filter(e => e.riskLevel === 'critical').length
    const highRiskCount = employees.filter(e => e.riskLevel === 'high').length
    const mediumRiskCount = employees.filter(e => e.riskLevel === 'medium').length
    const lowRiskCount = employees.filter(e => e.riskLevel === 'low').length

    const avgScore =
      employees.length > 0 ? employees.reduce((sum, e) => sum + e.overallRiskScore, 0) / employees.length : 0

    return {
      totalEmployees: employees.length,
      atRiskCount: criticalCount + highRiskCount + mediumRiskCount,
      criticalCount,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      averageRiskScore: Math.round(avgScore),
      employeesWithInsufficientData: employees.filter(e => e.dataCompleteness < 50).length,
      lastCalculated: new Date()
    }
  }, [employees])

  // Sort employees by risk score (highest first)
  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => b.overallRiskScore - a.overallRiskScore),
    [employees]
  )

  return {
    summary,
    employees: sortedEmployees,
    loading,
    error,
    refetch: fetchFlightRiskData
  }
}

export default useFlightRiskPrediction
