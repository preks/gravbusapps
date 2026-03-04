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
  evaluationPeriodStartDate: string | null
  evaluationPeriodEndDate: string | null
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
  evaluationPeriodStartDate: string | null
  evaluationPeriodEndDate: string | null
  totalEvaluations: number
  completedEvaluations: number
  inProgressEvaluations: number
  evaluations: PerformanceEvaluationOverviewItem[]
}

export interface EmployeePerformanceEvaluationsOverview {
  performanceCycles: PerformanceCycleOverview[]
}

export interface FlattenedPerformanceEvaluationItem {
  performanceCycleId: string
  performanceCycleName: string
  performanceCycleStartDate: string | null
  performanceCycleEndDate: string | null
  evaluation: PerformanceEvaluationOverviewItem
}

export interface PerformanceEvaluationDetailQueryParams {
  employeeId?: string
  employeeUserId?: string
  includePeerReviewerIdentity?: boolean
}

export interface PerformanceEvaluationAverages {
  overall?: number | null
  companyValues?: number | null
  skills?: number | null
}

export interface PerformanceEvaluationChangesSinceLastReview {
  overall?: number | null
  companyValues?: number | null
  skills?: number | null
  combined?: number | null
}

export interface PerformanceEvaluationEvaluatorIdentity {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
}

export interface PerformanceEvaluationReviewerEntry {
  reviewerEmployeeId?: string | null
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
  ratingScaleValueLabel?: string | null
  ratingNumericEquivalent?: number | null
  comments?: string | null
  evaluatedDate?: string | null
  [key: string]: unknown
}

export interface PerformanceEvaluationDimensionEntry {
  self?: PerformanceEvaluationReviewerEntry | null
  peers?: PerformanceEvaluationReviewerEntry[] | null
  manager?: PerformanceEvaluationReviewerEntry | null
  [key: string]: unknown
}

export interface PerformanceEvaluationAnalysisDetailResponse {
  evaluationId?: string
  employeeId?: string
  performanceCycleId?: string
  performanceCycleName?: string | null
  performanceCycleStartDate?: string | null
  performanceCycleEndDate?: string | null
  startDate?: string | null
  targetCompletionDate?: string | null
  actualCompletionDate?: string | null
  statusRef?: string | null
  ratingScaleLimit?: number | null
  overall?: PerformanceEvaluationOverallApi | null
  evaluatorManager?: PerformanceEvaluationEvaluatorIdentity | null
  averages?: PerformanceEvaluationAverages | null
  changesSinceLastReview?: PerformanceEvaluationChangesSinceLastReview | null
  skills?: PerformanceEvaluationDimensionEntry[] | null
  companyValues?: PerformanceEvaluationDimensionEntry[] | null
  [key: string]: unknown
}
