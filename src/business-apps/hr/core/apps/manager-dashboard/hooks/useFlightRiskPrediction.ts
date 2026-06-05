/**
 * useFlightRiskPrediction Hook
 * Main orchestrator hook for calculating employee flight risk scores
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useFeedbackSentiment, EmployeeSentimentResult } from './useFeedbackSentiment'
import { useRiskTrendHistory, EmployeeTrendResult } from './useRiskTrendHistory'
import { initFlightRiskCache } from '../utils/cacheManagement'
import {
  EmployeeSalaryInfo,
  calculateTeamMedianSalaryByCurrency,
  groupSalaryDataByEmployee
} from '../utils/flightRiskSalaryUtils'
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
  FlightRiskQueryResponse,
  SalaryHistoryQueryResponse
} from '../types/flightRisk.types'
import { GET_FLIGHT_RISK_DATA, GET_TEAM_SALARY_HISTORY } from '../queries/flightRiskQueries'
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

interface BuildSignalsInput {
  employeeId: string
  tenureMonths: number
  performanceGoals: RawPerformanceGoal[]
  feedbackReceived: RawFeedback[]
  feedbackFromManager: RawFeedback[]
  absences: RawAbsence[]
  salaryInfo?: EmployeeSalaryInfo
  sentimentInfo?: EmployeeSentimentInfo
}

const buildSentimentSignalMetadata = (
  sentimentInfo: EmployeeSentimentInfo | undefined,
  feedbackCount: number
): { name: string; rawValue: 'ai-analyzed' | 'ratings' | null; dataSource: string } => {
  if (sentimentInfo?.isAIAnalyzed) {
    return {
      name: 'Sentiment Risk',
      rawValue: 'ai-analyzed',
      dataSource: 'FlowBot AI'
    }
  }

  if (feedbackCount > 0) {
    return {
      name: 'Sentiment Risk',
      rawValue: 'ratings',
      dataSource: 'EmployeeFeedback.rating'
    }
  }

  return {
    name: 'Sentiment Risk',
    rawValue: null,
    dataSource: 'EmployeeFeedback.rating'
  }
}

/**
 * Build flight risk signals for an employee
 */
const buildSignals = ({
  employeeId,
  tenureMonths,
  performanceGoals,
  feedbackReceived,
  feedbackFromManager,
  absences,
  salaryInfo,
  sentimentInfo
}: BuildSignalsInput): FlightRiskSignal[] => {
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
    name: 'Performance Risk',
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
    name: 'Engagement Risk',
    category: 'engagement',
    rawValue: employeeManagerFeedback.length,
    normalizedScore: engagementScore,
    weight: SIGNAL_WEIGHTS.engagement,
    description: getEngagementRiskDescription(employeeFeedbackReceived, employeeManagerFeedback, tenureMonths),
    dataSource: 'EmployeeFeedback'
  })

  // Wellness/Absence Signal
  const employeeAbsences = absences.filter(a => a.employee.id === employeeId)
  const absenceScore = calculateAbsenceRiskScore(employeeAbsences, tenureMonths)
  signals.push({
    id: `${employeeId}-wellness`,
    name: 'Wellness/Absence Risk',
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
  const sentimentSignalMetadata = buildSentimentSignalMetadata(sentimentInfo, employeeFeedbackReceived.length)
  signals.push({
    id: `${employeeId}-sentiment`,
    name: sentimentSignalMetadata.name,
    category: 'sentiment',
    rawValue: sentimentSignalMetadata.rawValue,
    normalizedScore: sentimentScore,
    weight: SIGNAL_WEIGHTS.sentiment,
    description: sentimentDescription,
    dataSource: sentimentSignalMetadata.dataSource
  })

  // Compensation Signal - now with real salary data from EmployeeSalary table
  const employeeSalaryChanges = salaryInfo?.salaryChanges || []
  const compensationScore = calculateCompensationRiskScore(
    tenureMonths,
    employeeSalaryChanges,
    salaryInfo?.currentSalary,
    salaryInfo?.teamMedianSalary
  )
  signals.push({
    id: `${employeeId}-compensation`,
    name: 'Compensation Risk',
    category: 'compensation',
    rawValue: salaryInfo?.currentSalary || null,
    normalizedScore: compensationScore,
    weight: SIGNAL_WEIGHTS.compensation,
    description: getCompensationRiskDescription(
      tenureMonths,
      employeeSalaryChanges,
      salaryInfo?.currentSalary,
      salaryInfo?.teamMedianSalary
    ),
    dataSource: 'EmployeeSalary'
  })

  return signals
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
    const hireDate = emp.workingCondition?.[0]?.hireDate || ''
    const tenureMonths = calculateTenureMonths(hireDate)

    // Get salary data for this employee
    const salaryInfo = salaryDataMap.get(emp.id)

    // Get sentiment data for this employee
    const sentimentInfo = sentimentDataMap.get(emp.id)

    // Get trend data for this employee
    const trendInfo = trendDataMap.get(emp.id)

    // Build all signals for this employee
    const signals = buildSignals({
      employeeId: emp.id,
      tenureMonths,
      performanceGoals,
      feedbackReceived,
      feedbackFromManager: managerFeedback,
      absences,
      salaryInfo,
      sentimentInfo
    })

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
  directReportIds,
  enableAISentiment = false
}: UseFlightRiskProps): UseFlightRiskResult => {
  const [employees, setEmployees] = useState<FlightRiskEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Store raw data for reprocessing when sentiment/trends are ready
  const rawDataRef = useRef<{
    flightRiskResponse: FlightRiskQueryResponse | null
    salaryDataMap: Map<string, EmployeeSalaryInfo>
    feedbackByEmployee: Map<string, RawFeedback[]>
  }>({
    flightRiskResponse: null,
    salaryDataMap: new Map(),
    feedbackByEmployee: new Map()
  })

  const graphQLClient = useGraphqlClient(accessToken)

  // Initialize sentiment analysis hook
  const { analyzeBatch, sentimentResults } = useFeedbackSentiment({
    accessToken
  })

  // Initialize risk trend history hook
  const { trends: trendResults } = useRiskTrendHistory({
    accessToken,
    employeeIds: directReportIds,
    historyLimit: 6
  })

  /**
   * Convert sentiment results to EmployeeSentimentInfo map
   */
  const buildSentimentDataMap = useCallback(
    (results: Map<string, EmployeeSentimentResult>): Map<string, EmployeeSentimentInfo> => {
      const map = new Map<string, EmployeeSentimentInfo>()
      results.forEach((result, employeeId) => {
        map.set(employeeId, {
          score: result.score,
          summary: result.summary,
          isAIAnalyzed: result.isAIAnalyzed
        })
      })
      return map
    },
    []
  )

  /**
   * Convert trend results to EmployeeTrendInfo map
   */
  const buildTrendDataMap = useCallback((results: Map<string, EmployeeTrendResult>): Map<string, EmployeeTrendInfo> => {
    const map = new Map<string, EmployeeTrendInfo>()
    results.forEach((result, employeeId) => {
      // Build historical scores array from available data
      const historicalScores: { overallScore: number; calculatedAt: string }[] = []
      if (result.currentScore !== undefined) {
        historicalScores.push({
          overallScore: result.currentScore,
          calculatedAt: new Date().toISOString()
        })
      }
      if (result.previousScore !== undefined) {
        historicalScores.push({
          overallScore: result.previousScore,
          calculatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // ~30 days ago
        })
      }
      map.set(employeeId, { historicalScores })
    })
    return map
  }, [])

  /**
   * Reprocess employees with updated sentiment and trend data
   */
  const reprocessWithEnhancedData = useCallback(() => {
    const { flightRiskResponse, salaryDataMap } = rawDataRef.current
    if (!flightRiskResponse) return

    const sentimentDataMap = buildSentimentDataMap(sentimentResults)
    const trendDataMap = buildTrendDataMap(trendResults)

    const processedEmployees = processFlightRiskData(flightRiskResponse, salaryDataMap, sentimentDataMap, trendDataMap)
    setEmployees(processedEmployees)
  }, [sentimentResults, trendResults, buildSentimentDataMap, buildTrendDataMap])

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
      const today = new Date()

      // Fetch main flight risk data and salary data in parallel
      const [flightRiskResponse, salaryHistoryResponse] = await Promise.all([
        graphQLClient.request<FlightRiskQueryResponse>(GET_FLIGHT_RISK_DATA, {
          managerId,
          teamMemberIds: directReportIds,
          oneYearAgo: oneYearAgo.toISOString()
        }),
        graphQLClient
          .request<SalaryHistoryQueryResponse>(GET_TEAM_SALARY_HISTORY, {
            employeeIds: directReportIds
          })
          .catch(() => ({ EmployeeSalary: [] })) // Graceful fallback if salary API not available
      ])

      // Process salary data from EmployeeSalary table
      const allSalaryRecords = salaryHistoryResponse.EmployeeSalary || []
      const teamMedianByCurrency = calculateTeamMedianSalaryByCurrency(allSalaryRecords, today)
      const salaryDataMap = groupSalaryDataByEmployee(allSalaryRecords, today, teamMedianByCurrency)

      // Build feedback by employee map for sentiment analysis
      const feedbackByEmployee = new Map<string, RawFeedback[]>()
      const feedbackReceived = flightRiskResponse.feedbackReceived || []
      feedbackReceived.forEach(feedback => {
        const existing = feedbackByEmployee.get(feedback.employeeId) || []
        existing.push(feedback)
        feedbackByEmployee.set(feedback.employeeId, existing)
      })

      // Store raw data for reprocessing
      rawDataRef.current = {
        flightRiskResponse,
        salaryDataMap,
        feedbackByEmployee
      }

      // Initial processing without sentiment/trends (fast first render)
      const sentimentDataMap = new Map<string, EmployeeSentimentInfo>()
      const trendDataMap = new Map<string, EmployeeTrendInfo>()

      const processedEmployees = processFlightRiskData(
        flightRiskResponse,
        salaryDataMap,
        sentimentDataMap,
        trendDataMap
      )
      setEmployees(processedEmployees)

      // Trigger async sentiment analysis if enabled
      if (enableAISentiment && feedbackByEmployee.size > 0) {
        // Don't await - let it run in background
        analyzeBatch(feedbackByEmployee).catch(err => {
          console.warn('Sentiment analysis failed:', err)
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch flight risk data'))
      console.error('Error fetching flight risk data:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, directReportIds, graphQLClient, enableAISentiment, analyzeBatch])

  // Initial data fetch
  useEffect(() => {
    // Initialize cache management
    initFlightRiskCache()

    fetchFlightRiskData()
  }, [fetchFlightRiskData])

  // Reprocess when sentiment results arrive
  useEffect(() => {
    if (sentimentResults.size > 0 && rawDataRef.current.flightRiskResponse) {
      reprocessWithEnhancedData()
    }
  }, [sentimentResults, reprocessWithEnhancedData])

  // Reprocess when trend results arrive
  useEffect(() => {
    if (trendResults.size > 0 && rawDataRef.current.flightRiskResponse) {
      reprocessWithEnhancedData()
    }
  }, [trendResults, reprocessWithEnhancedData])

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
    refetch: () => {
      void fetchFlightRiskData()
    }
  }
}

export default useFlightRiskPrediction
