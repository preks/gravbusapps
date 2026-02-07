/**
 * useFlightRiskPrediction Hook
 * Main orchestrator hook for calculating employee flight risk scores
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
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
  FlightRiskQueryResponse
} from '../types/flightRisk.types'
import { GET_FLIGHT_RISK_DATA } from '../queries/flightRiskQueries'
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
 * Build flight risk signals for an employee
 */
const buildSignals = (
  employeeId: string,
  tenureMonths: number,
  performanceGoals: RawPerformanceGoal[],
  feedbackReceived: RawFeedback[],
  feedbackFromManager: RawFeedback[],
  absences: RawAbsence[]
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

  // Sentiment Signal (from feedback ratings)
  const sentimentScore = calculateSentimentRiskScore(employeeFeedbackReceived)
  signals.push({
    id: `${employeeId}-sentiment`,
    name: 'Feedback Sentiment',
    category: 'sentiment',
    rawValue: employeeFeedbackReceived.length > 0 ? 'available' : null,
    normalizedScore: sentimentScore,
    weight: SIGNAL_WEIGHTS.sentiment,
    description: employeeFeedbackReceived.length > 0 ? 'Based on feedback ratings' : 'No feedback data available',
    dataSource: 'EmployeeFeedback.rating'
  })

  // Compensation Signal
  const compensationScore = calculateCompensationRiskScore(tenureMonths)
  signals.push({
    id: `${employeeId}-compensation`,
    name: 'Compensation',
    category: 'compensation',
    rawValue: null, // Would be filled with actual salary data
    normalizedScore: compensationScore,
    weight: SIGNAL_WEIGHTS.compensation,
    description: getCompensationRiskDescription(tenureMonths),
    dataSource: 'EmployeeSalary'
  })

  return signals
}

/**
 * Process raw query data into FlightRiskEmployee objects
 */
const processFlightRiskData = (response: FlightRiskQueryResponse): FlightRiskEmployee[] => {
  const { employees, performanceGoals, feedbackReceived, managerFeedback, absences } = response

  return employees.map((emp: RawEmployeeData) => {
    const hireDate = emp.workingCondition?.hireDate || ''
    const tenureMonths = calculateTenureMonths(hireDate)

    // Build all signals for this employee
    const signals = buildSignals(emp.id, tenureMonths, performanceGoals, feedbackReceived, managerFeedback, absences)

    // Calculate overall score
    const overallRiskScore = calculateOverallRiskScore(signals)
    const riskLevel = getRiskLevel(overallRiskScore)
    const riskTrend = getRiskTrend()
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

      const response = await graphQLClient.request<FlightRiskQueryResponse>(GET_FLIGHT_RISK_DATA, {
        managerId,
        teamMemberIds: directReportIds,
        oneYearAgo: oneYearAgo.toISOString()
      })

      // Process data and calculate risk scores
      const processedEmployees = processFlightRiskData(response)
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
