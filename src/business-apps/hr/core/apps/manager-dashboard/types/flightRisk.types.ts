/**
 * Flight Risk Prediction Types
 * Types and interfaces for the employee retention risk prediction feature
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskTrend = 'improving' | 'stable' | 'worsening'
export type SignalCategory = 'performance' | 'engagement' | 'compensation' | 'wellness' | 'tenure' | 'sentiment'
export type InterventionType = 'compensation' | 'career' | 'engagement' | 'wellness' | 'workload'
export type InterventionPriority = 'high' | 'medium' | 'low'

/**
 * Individual risk signal contributing to the overall score
 */
export interface FlightRiskSignal {
  id: string
  name: string
  category: SignalCategory
  rawValue: number | string | null
  normalizedScore: number // 0-100, higher = more risk
  weight: number // 0-1, contribution to total score
  trend?: RiskTrend
  description: string
  dataSource: string
}

/**
 * Recommended intervention action for at-risk employees
 */
export interface FlightRiskIntervention {
  id: string
  type: InterventionType
  priority: InterventionPriority
  title: string
  description: string
  actionUrl?: string
  suggestedBy: 'algorithm' | 'ai'
}

/**
 * Complete flight risk assessment for a single employee
 */
export interface FlightRiskEmployee {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  departmentName?: string
  hireDate: string
  tenureMonths: number

  // Risk Assessment
  overallRiskScore: number // 0-100
  riskLevel: RiskLevel
  riskTrend: RiskTrend
  confidenceLevel: number // 0-100, based on data availability

  // Signal Breakdown
  signals: FlightRiskSignal[]
  topRiskFactors: FlightRiskSignal[] // Top 3 contributors

  // Recommendations
  interventions: FlightRiskIntervention[]

  // Metadata
  lastUpdated: Date
  dataCompleteness: number // % of signals with data
}

/**
 * Aggregated summary of team flight risk
 */
export interface FlightRiskSummary {
  totalEmployees: number
  atRiskCount: number // medium + high + critical
  criticalCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  averageRiskScore: number
  employeesWithInsufficientData: number
  lastCalculated: Date
}

/**
 * Return type for useFlightRiskPrediction hook
 */
export interface UseFlightRiskResult {
  summary: FlightRiskSummary
  employees: FlightRiskEmployee[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Props for useFlightRiskPrediction hook
 */
export interface UseFlightRiskProps {
  accessToken: string
  managerId: string
  directReportIds: string[]
  enableAISentiment?: boolean
}

/**
 * Raw employee data from GraphQL
 */
export interface RawEmployeeData {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  workingCondition?: {
    hireDate?: string
    probationEnd?: string
    exitDate?: string
  }[]
  employeePosition?: {
    jobPosition?: { name: string }
    organizationalUnit?: { name: string }
    supervisor?: { id: string; firstName: string; lastName: string }
  }[]
}

/**
 * Raw performance goal data from GraphQL
 */
export interface RawPerformanceGoal {
  id: string
  employeeId: string
  title: string
  progressPercent: number
  status: 'ON_TRACK' | 'BEHIND_TARGET' | 'AT_RISK' | 'ACHIEVED' | 'NOT_ACHIEVED'
  startDate: string
  dueDate: string
  updatedAt?: string
  completionDate?: string
  employeePerformanceGoalUpdate?: {
    id: string
    progressPercent?: number
    updateTime?: string
  }[]
}

/**
 * Raw feedback data from GraphQL
 */
export interface RawFeedback {
  id: string
  employeeId: string
  feedback: string
  feedbackDate: string
  rating?: number
  feedbackPublic?: boolean
  senderEmployeeId: string
}

/**
 * Raw absence data from GraphQL
 */
export interface RawAbsence {
  id: string
  startDate: string
  endDate: string
  effectiveDays: number
  type?: {
    id: string
    value: string
    parentEntryId?: string
  }
  employee: { id: string }
}

/**
 * Raw salary history data
 */
/**
 * Currency catalog entry from GraphQL
 */
export interface CurrencyEntry {
  id: string
  code: string
  value: string
}

/**
 * Raw salary record from EmployeeSalary table
 */
export interface RawSalaryRecord {
  id: string
  employeeId: string
  annualGrossSalary: number | null
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currency: CurrencyEntry | null
  currencyRef: string | null
  startDate: string | null
  endDate: string | null
  requestedPercent: number | null
  requestedAmount: number | null
  salaryAdjustReasonRef: string | null
  createdAt: string
}

/**
 * Processed salary history with calculated change amounts
 * Derived from comparing consecutive RawSalaryRecord entries
 */
export interface ProcessedSalaryChange {
  id: string
  employeeId: string
  previousAmount: number | null
  newAmount: number
  changePercent: number | null
  currencyCode: string
  effectiveDate: string
  reason?: string
}

/**
 * Salary data grouped by employee for compensation risk calculation
 */
export interface EmployeeSalaryData {
  currentSalary?: RawSalaryRecord
  salaryRecords: RawSalaryRecord[]
  salaryChanges: ProcessedSalaryChange[]
  lastRaiseDate?: string
  lastRaisePercent?: number
  monthsSinceLastRaise?: number
}

/**
 * GraphQL query response structure
 */
export interface FlightRiskQueryResponse {
  employees: RawEmployeeData[]
  performanceGoals: RawPerformanceGoal[]
  feedbackReceived: RawFeedback[]
  managerFeedback: RawFeedback[]
  absences: RawAbsence[]
}

/**
 * Salary history query response from EmployeeSalary table
 */
export interface SalaryHistoryQueryResponse {
  EmployeeSalary: RawSalaryRecord[]
}

/**
 * Current salaries query response from EmployeeSalary table
 */
export interface CurrentSalariesQueryResponse {
  EmployeeSalary: RawSalaryRecord[]
}

/**
 * Risk score record for trend tracking
 */
export interface RiskScoreRecord {
  id: string
  employeeId?: string
  overallScore: number
  signalScores?: Record<string, number>
  calculatedAt: string
  version?: number
}

/**
 * Input for saving a risk score
 */
export interface RiskScoreInput {
  employeeId: string
  managerId: string
  overallScore: number
  signalScores: Record<string, number>
  version: number
}

/**
 * Risk score history for a single employee
 */
export interface EmployeeRiskScoreHistory {
  employeeId: string
  scores: {
    overallScore: number
    calculatedAt: string
  }[]
}

/**
 * Risk score history query response
 */
export interface RiskScoreHistoryQueryResponse {
  employeeRiskScoreHistory: RiskScoreRecord[]
}

/**
 * Team risk score history query response
 */
export interface TeamRiskScoreHistoryQueryResponse {
  teamRiskScoreHistory: EmployeeRiskScoreHistory[]
}
