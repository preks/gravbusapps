import type { RestClient } from '@/common/network/rest/RestClient'

import { buildCompleteAnalysisRequest, COMPLETE_ANALYSIS_PATH } from './compensationAnalysisRestConfig'
import type {
  CompleteAnalysisRequestOptions,
  CompleteAnalysisResponse
} from '../types/compensationAnalysisRequest.types'

export async function requestCompleteCompensationAnalysis(
  restClient: RestClient,
  accessToken: string,
  options: CompleteAnalysisRequestOptions = {}
): Promise<CompleteAnalysisResponse> {
  if (!accessToken) {
    throw new Error('Access token missing')
  }

  const body = buildCompleteAnalysisRequest(options)

  return await restClient.post<CompleteAnalysisResponse>(COMPLETE_ANALYSIS_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
