export interface CycleTrackingSummary {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  evaluationPeriodStartDate: string | null
  evaluationPeriodEndDate: string | null
  frequency: string | null
  status: string | null
  totalEvaluations: number
  completedEvaluations: number
  totalReviewerTasks: number
  completedReviewerTasks: number
  totalManagerReviews: number
  completedManagerReviews: number
  totalSelfReviews: number
  completedSelfReviews: number
}

export interface ReviewerDetail {
  id: string
  reviewerEmployeeId: string | null
  reviewerName: string
  reviewerType: string | null
  status: string | null
  assignedDate: string | null
  completedDate: string | null
}

export interface EvaluationDetail {
  id: string
  employeeId: string | null
  employeeName: string
  statusRef: string | null
  startDate: string | null
  actualCompletionDate: string | null
  targetCompletionDate: string | null
  reviewers: ReviewerDetail[]
}

export interface ReviewerListItem {
  reviewerEmployeeId: string
  reviewerName: string
}

export interface ReviewerEvaluationItem {
  id: string
  reviewerType: string | null
  status: string | null
  assignedDate: string | null
  completedDate: string | null
  employeeName: string
  cycleName: string
  evaluationStatusRef: string | null
}

export interface EmployeeEvalItem {
  id: string
  cycleName: string
  statusRef: string | null
  startDate: string | null
  actualCompletionDate: string | null
  reviewers: ReviewerDetail[]
}
