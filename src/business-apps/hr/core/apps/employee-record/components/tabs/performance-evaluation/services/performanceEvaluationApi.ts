import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import {
  EmployeePerformanceEvaluationsAnalysisResponse,
  PerformanceEvaluationAnalysisDetailResponse,
  PerformanceEvaluationDetailQueryParams
} from '../types/performanceEvaluation.types'

const PERFORMANCE_EVALUATIONS_BASE_PATH = '/processes/employee/performance-evaluations'
const EMPLOYEE_PERFORMANCE_EVALUATIONS_ANALYSIS_PATH = `${PERFORMANCE_EVALUATIONS_BASE_PATH}/analysis/employees`

export const getEmployeePerformanceEvaluationsAnalysis = async (
  accessToken: string,
  employeeId: string
): Promise<EmployeePerformanceEvaluationsAnalysisResponse> => {
  const baseUrl = env('NEXT_PUBLIC_EMPLOYEES_API_URL') ?? ''
  const client = new RestClient(baseUrl, {
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

  const baseUrl = env('NEXT_PUBLIC_EMPLOYEES_API_URL') ?? ''
  const client = new RestClient(baseUrl, {
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
