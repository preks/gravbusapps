/**
 * GraphQL queries for Performance Tracking.
 * Chain: PerformanceCycle → EmployeePerformanceEvaluation → PerformanceEvaluationReviewer
 */

export const GET_CYCLES_TRACKING = /* GraphQL */ `
  query GetCyclesTracking {
    PerformanceCycle(where: { isDeleted: { _eq: false } }, orderBy: [{ startDate: DESC }]) {
      id
      name
      startDate
      endDate
      evaluationPeriodStartDate
      evaluationPeriodEndDate
      frequency
      status
      employeePerformanceEvaluation(where: { isDeleted: { _eq: false } }) {
        id
        statusRef
        actualCompletionDate
        performanceEvaluationReviewer(where: { isDeleted: { _eq: false } }) {
          id
          reviewerType
          status
          completedDate
        }
      }
    }
  }
`

export interface ReviewerSummaryApi {
  id: string
  reviewerType: string | null
  status: string | null
  completedDate: string | null
}

export interface EvaluationSummaryApi {
  id: string
  statusRef: string | null
  actualCompletionDate: string | null
  performanceEvaluationReviewer: ReviewerSummaryApi[]
}

export interface CycleTrackingApi {
  id: string
  name: string | null
  startDate: string | null
  endDate: string | null
  evaluationPeriodStartDate: string | null
  evaluationPeriodEndDate: string | null
  frequency: string | null
  status: string | null
  employeePerformanceEvaluation: EvaluationSummaryApi[]
}

export interface GetCyclesTrackingResponse {
  PerformanceCycle: CycleTrackingApi[]
}

export const GET_CYCLE_EVALUATION_DETAILS = /* GraphQL */ `
  query GetCycleEvaluationDetails($cycleId: uuid!) {
    EmployeePerformanceEvaluation(
      where: { performanceCycleId: { _eq: $cycleId }, isDeleted: { _eq: false } }
      orderBy: [{ createdAt: DESC }]
    ) {
      id
      employeeId
      statusRef
      startDate
      actualCompletionDate
      targetCompletionDate
      employee {
        id
        firstName
        lastName
        displayName
      }
      performanceEvaluationReviewer(where: { isDeleted: { _eq: false } }) {
        id
        reviewerEmployeeId
        reviewerType
        status
        assignedDate
        completedDate
        reviewerEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
    }
  }
`

export interface EmployeeApi {
  id: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
}

export interface ReviewerDetailApi {
  id: string
  reviewerEmployeeId: string | null
  reviewerType: string | null
  status: string | null
  assignedDate: string | null
  completedDate: string | null
  reviewerEmployee: EmployeeApi | null
}

export interface EvaluationDetailApi {
  id: string
  employeeId: string | null
  statusRef: string | null
  startDate: string | null
  actualCompletionDate: string | null
  targetCompletionDate: string | null
  employee: EmployeeApi | null
  performanceEvaluationReviewer: ReviewerDetailApi[]
}

export interface GetCycleEvaluationDetailsResponse {
  EmployeePerformanceEvaluation: EvaluationDetailApi[]
}

/**
 * Distinct reviewer employees across all evaluations.
 * Uses distinctOn to get one row per reviewerEmployeeId.
 */
export const GET_REVIEWER_LIST = /* GraphQL */ `
  query GetReviewerList {
    PerformanceEvaluationReviewer(
      where: { isDeleted: { _eq: false } }
      distinctOn: [reviewerEmployeeId]
      orderBy: [{ reviewerEmployeeId: ASC }]
    ) {
      reviewerEmployeeId
      reviewerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

export interface ReviewerListApi {
  reviewerEmployeeId: string | null
  reviewerEmployee: EmployeeApi | null
}

export interface GetReviewerListResponse {
  PerformanceEvaluationReviewer: ReviewerListApi[]
}

/**
 * All review tasks for a specific reviewer employee.
 * Includes the evaluated employee and cycle info via nested relationships.
 */
export const GET_REVIEWER_EVALUATIONS = /* GraphQL */ `
  query GetReviewerEvaluations($reviewerEmployeeId: uuid!) {
    PerformanceEvaluationReviewer(
      where: { reviewerEmployeeId: { _eq: $reviewerEmployeeId }, isDeleted: { _eq: false } }
      orderBy: [{ assignedDate: DESC }]
    ) {
      id
      reviewerType
      status
      assignedDate
      completedDate
      employeePerformanceEvaluation {
        id
        statusRef
        startDate
        actualCompletionDate
        employee {
          id
          firstName
          lastName
          displayName
        }
        performanceCycle {
          id
          name
        }
      }
    }
  }
`

export interface ReviewerEvaluationApi {
  id: string
  reviewerType: string | null
  status: string | null
  assignedDate: string | null
  completedDate: string | null
  employeePerformanceEvaluation: {
    id: string
    statusRef: string | null
    startDate: string | null
    actualCompletionDate: string | null
    employee: EmployeeApi | null
    performanceCycle: { id: string; name: string | null } | null
  } | null
}

export interface GetReviewerEvaluationsResponse {
  PerformanceEvaluationReviewer: ReviewerEvaluationApi[]
}

/**
 * Evaluations where a specific employee is the one being evaluated.
 * Includes cycle info and full reviewer breakdown.
 */
export const GET_EMPLOYEE_EVALUATIONS = /* GraphQL */ `
  query GetEmployeeEvaluations($employeeId: uuid!) {
    EmployeePerformanceEvaluation(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false } }
      orderBy: [{ createdAt: DESC }]
    ) {
      id
      statusRef
      startDate
      actualCompletionDate
      performanceCycle {
        id
        name
      }
      performanceEvaluationReviewer(where: { isDeleted: { _eq: false } }) {
        id
        reviewerEmployeeId
        reviewerType
        status
        assignedDate
        completedDate
        reviewerEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
    }
  }
`

export interface EmployeeEvalDetailApi {
  id: string
  statusRef: string | null
  startDate: string | null
  actualCompletionDate: string | null
  performanceCycle: { id: string; name: string | null } | null
  performanceEvaluationReviewer: ReviewerDetailApi[]
}

export interface GetEmployeeEvaluationsResponse {
  EmployeePerformanceEvaluation: EmployeeEvalDetailApi[]
}
