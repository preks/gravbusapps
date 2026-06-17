import { z } from 'zod'

export const OPPORTUNITY_ICP_WEIGHT_KEYS = ['fit_score', 'win_probability', 'activity_score'] as const
export type OpportunityIcpWeightKey = (typeof OPPORTUNITY_ICP_WEIGHT_KEYS)[number]

export type OpportunityIcpWeightInputs = Record<OpportunityIcpWeightKey, string>

export type OpportunityIcpWeights = Record<OpportunityIcpWeightKey, number>

export const DEFAULT_OPPORTUNITY_ICP_WEIGHTS: OpportunityIcpWeights = {
  fit_score: 0.3,
  win_probability: 0.45,
  activity_score: 0.25
}

export const DEFAULT_OPPORTUNITY_ICP_WEIGHT_INPUTS: OpportunityIcpWeightInputs = {
  fit_score: String(DEFAULT_OPPORTUNITY_ICP_WEIGHTS.fit_score),
  win_probability: String(DEFAULT_OPPORTUNITY_ICP_WEIGHTS.win_probability),
  activity_score: String(DEFAULT_OPPORTUNITY_ICP_WEIGHTS.activity_score)
}

export const EMPTY_OPPORTUNITY_ICP_WEIGHT_INPUTS: OpportunityIcpWeightInputs = {
  fit_score: '',
  win_probability: '',
  activity_score: ''
}

const WEIGHT_SUM_TOLERANCE = 0.000_001

export const opportunityIcpWeightsSchema = z
  .object({
    fit_score: z.number().min(0).max(1),
    win_probability: z.number().min(0).max(1),
    activity_score: z.number().min(0).max(1)
  })
  .refine(weights => weights.fit_score + weights.win_probability + weights.activity_score <= 1 + WEIGHT_SUM_TOLERANCE, {
    message: 'Weight sum must not exceed 1'
  })

export type OpportunityIcpScoringModePayload = { mode: 'custom'; weights?: OpportunityIcpWeights }

export function areOpportunityIcpWeightInputsEmpty(inputs: OpportunityIcpWeightInputs): boolean {
  return OPPORTUNITY_ICP_WEIGHT_KEYS.every(key => !inputs[key].trim())
}

export function sumOpportunityIcpWeights(weights: OpportunityIcpWeights): number {
  return weights.fit_score + weights.win_probability + weights.activity_score
}

export function parseOpportunityIcpWeightInputs(
  inputs: OpportunityIcpWeightInputs
): { weights: OpportunityIcpWeights } | { errorKey: 'required' | 'invalid' | 'exceeds-sum' } {
  const parsed: Partial<OpportunityIcpWeights> = {}

  for (const key of OPPORTUNITY_ICP_WEIGHT_KEYS) {
    const raw = inputs[key].trim()
    if (!raw) {
      return { errorKey: 'required' }
    }

    const value = Number(raw)
    if (Number.isNaN(value) || value < 0 || value > 1) {
      return { errorKey: 'invalid' }
    }

    parsed[key] = value
  }

  const weights = parsed as OpportunityIcpWeights
  if (sumOpportunityIcpWeights(weights) > 1 + WEIGHT_SUM_TOLERANCE) {
    return { errorKey: 'exceeds-sum' }
  }

  const validated = opportunityIcpWeightsSchema.safeParse(weights)
  if (!validated.success) {
    return { errorKey: 'exceeds-sum' }
  }

  return { weights: validated.data }
}

export interface BuildOpportunityIcpScoringModePayloadOptions {
  allowOptionalWeights?: boolean
}

export function buildOpportunityIcpScoringModePayload(
  weightInputs: OpportunityIcpWeightInputs,
  options: BuildOpportunityIcpScoringModePayloadOptions = {}
): { payload: OpportunityIcpScoringModePayload } | { errorKey: 'required' | 'invalid' | 'exceeds-sum' } {
  if (options.allowOptionalWeights && areOpportunityIcpWeightInputsEmpty(weightInputs)) {
    return { payload: { mode: 'custom', weights: DEFAULT_OPPORTUNITY_ICP_WEIGHTS } }
  }

  const parsed = parseOpportunityIcpWeightInputs(weightInputs)
  if ('errorKey' in parsed) {
    return parsed
  }

  return { payload: { mode: 'custom', weights: parsed.weights } }
}

export function applyOpportunityModePayloadToBulkRequest<
  T extends { entity_type: 'opportunity'; icp_id: string; entity_ids: string[] }
>(base: T, payload: OpportunityIcpScoringModePayload): T | (T & { mode: 'custom'; weights: OpportunityIcpWeights }) {
  if (payload.mode === 'custom' && payload.weights) {
    return { ...base, mode: 'custom', weights: payload.weights }
  }

  return base
}

export function applyOpportunityModePayloadToSingleRequest<
  T extends { entity_type: 'opportunity'; icp_id: string; entity_id: string }
>(base: T, payload: OpportunityIcpScoringModePayload): T & { mode: 'custom'; weights: OpportunityIcpWeights } {
  if (!payload.weights) {
    throw new Error('Custom single-opportunity scoring requires weights')
  }

  return { ...base, mode: 'custom', weights: payload.weights }
}
