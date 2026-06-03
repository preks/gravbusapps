import { z } from 'zod'
import { opportunityIcpWeightsSchema } from '../utils/opportunityIcpScoringWeights'

export const ICP_SCORING_ENTITY_TYPES = ['lead', 'opportunity'] as const
export type IcpScoringEntityType = (typeof ICP_SCORING_ENTITY_TYPES)[number]

const leadIcpScoreRequestSchema = z.object({
  entity_type: z.literal('lead'),
  entity_id: z.string().trim().min(1, 'Entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required')
})

const opportunityAiIcpScoreRequestSchema = z.object({
  entity_type: z.literal('opportunity'),
  entity_id: z.string().trim().min(1, 'Entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('ai')
})

const opportunityCustomIcpScoreRequestSchema = z.object({
  entity_type: z.literal('opportunity'),
  entity_id: z.string().trim().min(1, 'Entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('custom'),
  weights: opportunityIcpWeightsSchema
})

export const icpScoreRequestSchema = z.union([
  leadIcpScoreRequestSchema,
  opportunityAiIcpScoreRequestSchema,
  opportunityCustomIcpScoreRequestSchema
])

const leadBulkIcpScoreRequestSchema = z.object({
  entity_type: z.literal('lead'),
  entity_ids: z.array(z.string().trim().min(1, 'Entity ID is required')).min(1, 'At least one entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required')
})

const opportunityAiBulkIcpScoreRequestSchema = z.object({
  entity_type: z.literal('opportunity'),
  entity_ids: z.array(z.string().trim().min(1, 'Entity ID is required')).min(1, 'At least one entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('ai')
})

const opportunityCustomBulkIcpScoreRequestSchema = z.object({
  entity_type: z.literal('opportunity'),
  entity_ids: z.array(z.string().trim().min(1, 'Entity ID is required')).min(1, 'At least one entity ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required'),
  mode: z.literal('custom'),
  weights: opportunityIcpWeightsSchema
})

export const bulkIcpScoreRequestSchema = z.union([
  leadBulkIcpScoreRequestSchema,
  opportunityAiBulkIcpScoreRequestSchema,
  opportunityCustomBulkIcpScoreRequestSchema
])

export type IcpScoreRequest = z.infer<typeof icpScoreRequestSchema>
export type BulkIcpScoreRequest = z.infer<typeof bulkIcpScoreRequestSchema>
export type IcpScoreCommandResult = { scored: true }
export type BulkIcpScoreCommandResult = { scored: true }

export type IcpScoringErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_ENTITY_ID'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN_ERROR'

export class IcpScoringClientError extends Error {
  readonly code: IcpScoringErrorCode
  readonly status?: number

  constructor(code: IcpScoringErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'IcpScoringClientError'
    this.code = code
    this.status = status
  }
}

export function isIcpScoringClientError(error: unknown): error is IcpScoringClientError {
  return error instanceof IcpScoringClientError
}
