import { z } from 'zod'

export const primitiveScoreValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const leadScoreRequestSchema = z.object({
  entity_type: z.literal('lead'),
  entity_id: z.string().trim().min(1, 'Lead ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required')
})

export const bulkLeadScoreRequestSchema = z.object({
  entity_type: z.literal('lead'),
  entity_ids: z.array(z.string().trim().min(1, 'Lead ID is required')).min(1, 'At least one lead ID is required'),
  icp_id: z.string().trim().min(1, 'ICP ID is required')
})

export const fieldScoreDetailSchema = z
  .object({
    field: z.string(),
    icp_value: primitiveScoreValueSchema.optional(),
    entity_value: primitiveScoreValueSchema.optional(),
    score_pct: z.number().nullable().optional(),
    score: z.number().nullable().optional(),
    method: z.string().nullable().optional(),
    weight: z.number().nullable().optional()
  })
  .passthrough()

export const appliedCriterionSchema = z
  .object({
    field: z.string().optional(),
    criterion: z.string().optional(),
    message: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    icp_value: primitiveScoreValueSchema.optional(),
    entity_value: primitiveScoreValueSchema.optional(),
    value: primitiveScoreValueSchema.optional(),
    method: z.string().nullable().optional(),
    weight: z.number().nullable().optional(),
    score_pct: z.number().nullable().optional()
  })
  .passthrough()

export const ignoredCriterionSchema = z
  .object({
    field: z.string().optional(),
    criterion: z.string().optional(),
    message: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    icp_value: primitiveScoreValueSchema.optional(),
    entity_value: primitiveScoreValueSchema.optional(),
    value: primitiveScoreValueSchema.optional(),
    method: z.string().nullable().optional(),
    weight: z.number().nullable().optional()
  })
  .passthrough()

export const leadScoreResultSchema = z
  .object({
    entity_type: z.literal('lead'),
    entity_id: z.string(),
    icp_id: z.string(),
    account_id: z.string().nullable().optional(),
    account_name: z.string().nullable().optional(),
    overall_score: z.number(),
    grade: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    mahalanobis_similarity: z.number().nullable().optional(),
    win_rate: z.number().nullable().optional(),
    field_scores: z.array(fieldScoreDetailSchema).default([]),
    applied_criteria: z.array(appliedCriterionSchema).default([]),
    ignored_criteria: z.array(ignoredCriterionSchema).default([]),
    warnings: z.array(z.string()).default([])
  })
  .passthrough()

export const bulkLeadScoreStatisticsSchema = z
  .object({
    mean: z.number().nullable().optional(),
    median: z.number().nullable().optional(),
    std: z.number().nullable().optional(),
    std_dev: z.number().nullable().optional(),
    count: z.number().nullable().optional()
  })
  .passthrough()

export const bulkLeadScoreItemSchema = leadScoreResultSchema
  .extend({
    icp_id: z.string().optional(),
    rank: z.number().nullable().optional()
  })
  .passthrough()

export const bulkLeadScoreResultSchema = z
  .object({
    icp_id: z.string().optional(),
    requested_count: z.number().nullable().optional(),
    scored_count: z.number().nullable().optional(),
    results: z.array(bulkLeadScoreItemSchema).default([]),
    statistics: bulkLeadScoreStatisticsSchema.default({})
  })
  .passthrough()

export type LeadScoreRequest = z.infer<typeof leadScoreRequestSchema>
export type BulkLeadScoreRequest = z.infer<typeof bulkLeadScoreRequestSchema>
export type LeadScoreCommandResult = { scored: true }
export type BulkLeadScoreCommandResult = { scored: true }
export type FieldScoreDetail = z.infer<typeof fieldScoreDetailSchema>
export type AppliedCriterion = z.infer<typeof appliedCriterionSchema>
export type IgnoredCriterion = z.infer<typeof ignoredCriterionSchema>
export type LeadScoreResult = z.infer<typeof leadScoreResultSchema>
export type BulkLeadScoreStatistics = z.infer<typeof bulkLeadScoreStatisticsSchema>
export type BulkLeadScoreItem = z.infer<typeof bulkLeadScoreItemSchema>
export type BulkLeadScoreResult = z.infer<typeof bulkLeadScoreResultSchema>

export type LeadScoringErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_LEAD_ID'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN_ERROR'

export class LeadScoringClientError extends Error {
  readonly code: LeadScoringErrorCode
  readonly status?: number

  constructor(code: LeadScoringErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'LeadScoringClientError'
    this.code = code
    this.status = status
  }
}

export function isLeadScoringClientError(error: unknown): error is LeadScoringClientError {
  return error instanceof LeadScoringClientError
}
