import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import {
  bulkLeadScoreRequestSchema,
  LeadScoringClientError,
  leadScoreRequestSchema,
  type BulkLeadScoreCommandResult,
  type BulkLeadScoreRequest,
  type LeadScoreCommandResult,
  type LeadScoreRequest
} from '../types/leadScoringTypes'

const ICP_SCORING_BASE_PATH = '/flowbot/icp-scoring'
const REST_FAILED_PATTERN = /REST request failed:\s*(\d+)/

function createLeadScoringClient(): RestClient {
  return new RestClient(resolveFlowbotBaseUrl())
}

function extractHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  const match = REST_FAILED_PATTERN.exec(error.message)
  if (!match) {
    return undefined
  }

  const status = Number.parseInt(match[1], 10)
  return Number.isNaN(status) ? undefined : status
}

function toLeadScoringError(error: unknown): LeadScoringClientError {
  if (error instanceof LeadScoringClientError) {
    return error
  }

  const status = extractHttpStatus(error)

  if (status === 400) {
    return new LeadScoringClientError('INVALID_LEAD_ID', 'The lead ID or lead IDs are invalid for scoring.', status)
  }

  if (status === 401) {
    return new LeadScoringClientError('AUTH_ERROR', 'Your session expired. Refresh the page and try again.', status)
  }

  if (status === 404) {
    return new LeadScoringClientError(
      'NOT_FOUND',
      'The lead or ICP profile could not be found, or you do not have access to it.',
      status
    )
  }

  if (status === 502) {
    return new LeadScoringClientError(
      'UPSTREAM_ERROR',
      'Lead scoring is temporarily unavailable because an upstream data source failed.',
      status
    )
  }

  if (error instanceof Error) {
    return new LeadScoringClientError('UNKNOWN_ERROR', error.message, status)
  }

  return new LeadScoringClientError('UNKNOWN_ERROR', 'An unknown error occurred while scoring the lead.', status)
}

function ensureAccessToken(accessToken: string): void {
  if (!accessToken.trim()) {
    throw new LeadScoringClientError('AUTH_ERROR', 'An access token is required for lead scoring.')
  }
}

export async function scoreLead(
  request: LeadScoreRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<LeadScoreCommandResult> {
  ensureAccessToken(accessToken)

  const client = createLeadScoringClient()
  const parsedRequest = leadScoreRequestSchema.parse(request)

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

    throw toLeadScoringError(error)
  }
}

export async function scoreBulk(
  request: BulkLeadScoreRequest,
  accessToken: string,
  signal?: AbortSignal
): Promise<BulkLeadScoreCommandResult> {
  ensureAccessToken(accessToken)

  const client = createLeadScoringClient()
  const parsedRequest = bulkLeadScoreRequestSchema.parse(request)

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

    throw toLeadScoringError(error)
  }
}
