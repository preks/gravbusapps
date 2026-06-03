import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import {
  bulkIcpScoreRequestSchema,
  IcpScoringClientError,
  icpScoreRequestSchema,
  type BulkIcpScoreCommandResult,
  type BulkIcpScoreRequest,
  type IcpScoreCommandResult,
  type IcpScoreRequest
} from '../types/icpScoringTypes'
import { scoreCompositeOpportunities, scoreCompositeOpportunity, toCompositeScoreRequest } from './compositeScoreClient'
import { toIcpScoringError } from '../utils/icpScoringErrorUtils'

const ICP_SCORING_BASE_PATH = '/flowbot/icp-scoring'

function createIcpScoringClient(): RestClient {
  return new RestClient(resolveFlowbotBaseUrl())
}

function ensureAccessToken(accessToken: string): void {
  if (!accessToken.trim()) {
    throw new IcpScoringClientError('AUTH_ERROR', 'An access token is required for ICP scoring.')
  }
}

export async function scoreEntity(
  request: IcpScoreRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<IcpScoreCommandResult> {
  ensureAccessToken(accessToken)

  const parsedRequest = icpScoreRequestSchema.parse(request)

  if (parsedRequest.entity_type === 'opportunity') {
    const { entity_id: opportunityId, icp_id: icpId, ...scoring } = parsedRequest
    const body = toCompositeScoreRequest(
      opportunityId,
      icpId,
      scoring.mode === 'ai' ? { mode: 'ai' } : { mode: 'custom', weights: scoring.weights }
    )
    return scoreCompositeOpportunity(body, accessToken, signal)
  }

  const client = createIcpScoringClient()

  try {
    await client.post(`${ICP_SCORING_BASE_PATH}/score`, parsedRequest, {
      headers: {
        Authorization: setAccessTokenToAuthorizationHeader(accessToken)
      },
      signal
    })

    return { scored: true }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw toIcpScoringError(error)
  }
}

export async function scoreBulk(
  request: BulkIcpScoreRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<BulkIcpScoreCommandResult> {
  ensureAccessToken(accessToken)

  const parsedRequest = bulkIcpScoreRequestSchema.parse(request)

  if (parsedRequest.entity_type === 'opportunity') {
    const { entity_ids: opportunityIds, icp_id: icpId, ...scoring } = parsedRequest
    const scoringFields =
      scoring.mode === 'ai' ? { mode: 'ai' as const } : { mode: 'custom' as const, weights: scoring.weights }
    return scoreCompositeOpportunities(opportunityIds, icpId, scoringFields, accessToken, signal)
  }

  const client = createIcpScoringClient()

  try {
    await client.post(`${ICP_SCORING_BASE_PATH}/score/bulk`, parsedRequest, {
      headers: {
        Authorization: setAccessTokenToAuthorizationHeader(accessToken)
      },
      signal
    })

    return { scored: true }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw toIcpScoringError(error)
  }
}
