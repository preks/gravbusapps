import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { z } from 'zod'
import { IcpScoringClientError, type IcpScoreCommandResult } from '../types/icpScoringTypes'
import { opportunityIcpWeightsSchema } from '../utils/opportunityIcpScoringWeights'
import { toIcpScoringError } from '../utils/icpScoringErrorUtils'

const COMPOSITE_SCORE_SCORE_PATH = '/flowbot/composite-score/score'
const COMPOSITE_SCORE_BULK_PATH = '/flowbot/composite-score/score/bulk'

const opportunityIdSchema = z.string().trim().min(1, 'Opportunity ID is required')

const compositeScorePersistField = {
  persist: z.literal(true)
} as const

const compositeScoreAiRequestSchema = z.object({
  opportunity_id: opportunityIdSchema,
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('ai'),
  ...compositeScorePersistField
})

const compositeScoreCustomRequestSchema = z.object({
  opportunity_id: opportunityIdSchema,
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('custom'),
  weights: opportunityIcpWeightsSchema,
  ...compositeScorePersistField
})

const compositeScoreRequestSchema = z.union([compositeScoreAiRequestSchema, compositeScoreCustomRequestSchema])

const compositeScoreBulkAiRequestSchema = z.object({
  opportunity_ids: z.array(opportunityIdSchema).min(1, 'At least one opportunity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('ai'),
  ...compositeScorePersistField
})

const compositeScoreBulkCustomRequestSchema = z.object({
  opportunity_ids: z.array(opportunityIdSchema).min(1, 'At least one opportunity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('custom'),
  weights: opportunityIcpWeightsSchema,
  ...compositeScorePersistField
})

const compositeScoreBulkRequestSchema = z.union([
  compositeScoreBulkAiRequestSchema,
  compositeScoreBulkCustomRequestSchema
])

export type CompositeScoreRequest = z.infer<typeof compositeScoreRequestSchema>
export type CompositeScoreBulkRequest = z.infer<typeof compositeScoreBulkRequestSchema>

type OpportunityIcpScoreFields =
  | { mode: 'ai' }
  | { mode: 'custom'; weights: z.infer<typeof opportunityIcpWeightsSchema> }

export function toCompositeScoreRequest(
  opportunityId: string,
  icpId: string,
  scoring: OpportunityIcpScoreFields
): CompositeScoreRequest {
  const base = {
    opportunity_id: opportunityId.trim(),
    icp_id: icpId.trim(),
    persist: true as const
  }

  if (scoring.mode === 'ai') {
    return { ...base, mode: 'ai' }
  }

  return { ...base, mode: 'custom', weights: scoring.weights }
}

export function toCompositeScoreBulkRequest(
  opportunityIds: string[],
  icpId: string,
  scoring: OpportunityIcpScoreFields
): CompositeScoreBulkRequest {
  const uniqueIds = Array.from(new Set(opportunityIds.map(id => id.trim()).filter(Boolean)))
  const base = {
    opportunity_ids: uniqueIds,
    icp_id: icpId.trim(),
    persist: true as const
  }

  if (scoring.mode === 'ai') {
    return { ...base, mode: 'ai' }
  }

  return { ...base, mode: 'custom', weights: scoring.weights }
}

function createCompositeScoreClient(): RestClient {
  return new RestClient(resolveFlowbotBaseUrl())
}

function ensureAccessToken(accessToken: string): void {
  if (!accessToken.trim()) {
    throw new IcpScoringClientError('AUTH_ERROR', 'An access token is required for ICP scoring.')
  }
}

async function postCompositeScore(
  path: string,
  body: CompositeScoreRequest | CompositeScoreBulkRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<void> {
  const client = createCompositeScoreClient()

  await client.post(path, body, {
    headers: {
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    },
    signal
  })
}

export async function scoreCompositeOpportunity(
  body: CompositeScoreRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<IcpScoreCommandResult> {
  ensureAccessToken(accessToken)

  try {
    const parsedBody = compositeScoreRequestSchema.parse(body)
    await postCompositeScore(COMPOSITE_SCORE_SCORE_PATH, parsedBody, accessToken, signal)
    return { scored: true }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw toIcpScoringError(error)
  }
}

export async function scoreCompositeOpportunities(
  opportunityIds: string[],
  icpId: string,
  scoring: OpportunityIcpScoreFields,
  accessToken: string,
  signal?: AbortSignal
): Promise<IcpScoreCommandResult> {
  ensureAccessToken(accessToken)

  try {
    const body = toCompositeScoreBulkRequest(opportunityIds, icpId, scoring)
    const parsedBody = compositeScoreBulkRequestSchema.parse(body)
    await postCompositeScore(COMPOSITE_SCORE_BULK_PATH, parsedBody, accessToken, signal)
    return { scored: true }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw toIcpScoringError(error)
  }
}
