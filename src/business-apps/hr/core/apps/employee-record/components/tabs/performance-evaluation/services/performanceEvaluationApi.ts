import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { EmployeePerformanceEvaluationsAnalysisResponse } from '../types/performanceEvaluation.types'

const EMPLOYEE_PERFORMANCE_EVALUATIONS_ANALYSIS_PATH = '/processes/employee/performance-evaluations/analysis/employees'

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
