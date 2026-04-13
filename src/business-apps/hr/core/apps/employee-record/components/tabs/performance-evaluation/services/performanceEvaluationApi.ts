import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import {
  EmployeePerformanceEvaluationsAnalysisResponse,
  PerformanceEvaluationAnalysisDetailResponse,
  PerformanceEvaluationDetailQueryParams
} from '../types/performanceEvaluation.types'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'

const PERFORMANCE_EVALUATIONS_BASE_PATH = '/performance-evaluations'
const EMPLOYEE_PERFORMANCE_EVALUATIONS_ANALYSIS_PATH = `${PERFORMANCE_EVALUATIONS_BASE_PATH}/analysis/employees`

export const getEmployeePerformanceEvaluationsAnalysis = async (
  accessToken: string,
  employeeId: string
): Promise<EmployeePerformanceEvaluationsAnalysisResponse> => {
  const client = new RestClient(EMPLOYEES_API_URL, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })

  return client.get<EmployeePerformanceEvaluationsAnalysisResponse>(
    `${EMPLOYEE_PERFORMANCE_EVALUATIONS_ANALYSIS_PATH}/${encodeURIComponent(employeeId)}`
  )
}

export const getPerformanceEvaluationAnalysisDetail = async (
  accessToken: string,
  evaluationId: string,
  params: PerformanceEvaluationDetailQueryParams
): Promise<PerformanceEvaluationAnalysisDetailResponse> => {
  const hasEmployeeId = Boolean(params.employeeId)
  const hasEmployeeUserId = Boolean(params.employeeUserId)

  if (hasEmployeeId === hasEmployeeUserId) {
    throw new Error('Exactly one of employeeId or employeeUserId must be provided')
  }

  const client = new RestClient(EMPLOYEES_API_URL, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })

  const queryParams: Record<string, string | boolean> = {
    includePeerReviewerIdentity: params.includePeerReviewerIdentity ?? false
  }
  if (params.employeeId) {
    queryParams.employeeId = params.employeeId
  }
  if (params.employeeUserId) {
    queryParams.employeeUserId = params.employeeUserId
  }

  return client.get<PerformanceEvaluationAnalysisDetailResponse>(
    `${PERFORMANCE_EVALUATIONS_BASE_PATH}/${encodeURIComponent(evaluationId)}/analysis`,
    { params: queryParams }
  )
}
