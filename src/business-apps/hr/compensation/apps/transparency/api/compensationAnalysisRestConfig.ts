import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'

import type {
  CompleteAnalysisRequest,
  CompleteAnalysisRequestOptions
} from '../types/compensationAnalysisRequest.types'

/** Base URL for the compensation analyzer REST client (`useRestClient`). */
export const COMPENSATION_ANALYSIS_BASE_PATH = `${EMPLOYEES_API_URL}/compensation-analyzer/analyze`

/** POST — run all compensation analyses in one request. */
export const COMPLETE_ANALYSIS_PATH = '/complete-analysis'

export const DEFAULT_ANALYSIS_SCOPE = 'company-wide'
export const DEFAULT_TENURE_THRESHOLD_YEARS = 2
export const DEFAULT_MIN_GROUP_SIZE = 5

export function getDefaultAnalysisDate(referenceDate: Date = new Date()): string {
  return `${referenceDate.getFullYear()}-01-01`
}

export function buildCompleteAnalysisRequest(options: CompleteAnalysisRequestOptions = {}): CompleteAnalysisRequest {
  const request: CompleteAnalysisRequest = {
    tenureThresholdYears: options.tenureThresholdYears ?? DEFAULT_TENURE_THRESHOLD_YEARS,
    minGroupSize: options.minGroupSize ?? DEFAULT_MIN_GROUP_SIZE,
    scope: options.scope ?? DEFAULT_ANALYSIS_SCOPE,
    analysisDate: options.analysisDate ?? getDefaultAnalysisDate()
  }

  if (options.jobLevelId) {
    request.jobLevelId = options.jobLevelId
  }

  return request
}
