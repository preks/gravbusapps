export interface PerformanceEvaluationOverallApi {
  averageNumeric: number | null
  mappedRatingScaleValueId: string | null
  mappedRatingScaleValueLabel: string | null
  mappedRatingScaleNumericEquivalent: number | null
}

export interface PerformanceEvaluationItemApi {
  evaluationId: string
  startDate: string | null
  targetCompletionDate: string | null
  actualCompletionDate: string | null
  statusRef: string | null
  overall: PerformanceEvaluationOverallApi | null
}

export interface PerformanceCycleApi {
  performanceCycleId: string
  performanceCycleName: string | null
  performanceCycleStartDate: string | null
  performanceCycleEndDate: string | null
  evaluations: PerformanceEvaluationItemApi[]
}

export interface EmployeePerformanceEvaluationsAnalysisResponse {
  performanceCycles: PerformanceCycleApi[]
}

export interface PerformanceEvaluationOverviewItem {
  evaluationId: string
  startDate: string | null
  targetCompletionDate: string | null
  actualCompletionDate: string | null
  statusRef: string | null
  statusCode: string
  overallAverageNumeric: number | null
  overallRatingLabel: string | null
  overallRatingNumericEquivalent: number | null
}

export interface PerformanceCycleOverview {
  performanceCycleId: string
  performanceCycleName: string
  performanceCycleStartDate: string | null
  performanceCycleEndDate: string | null
  totalEvaluations: number
  completedEvaluations: number
  inProgressEvaluations: number
  evaluations: PerformanceEvaluationOverviewItem[]
}

export interface EmployeePerformanceEvaluationsOverview {
  performanceCycles: PerformanceCycleOverview[]
}

export interface PerformanceEvaluationDetailQueryParams {
  employeeId?: string
  employeeUserId?: string
  includePeerReviewerIdentity?: boolean
}

export type PerformanceEvaluationAnalysisDetailResponse = Record<string, unknown>
