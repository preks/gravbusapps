import { z } from 'zod'

export const OPPORTUNITY_ICP_WEIGHT_KEYS = ['fit_score', 'win_probability', 'activity_score'] as const
export type OpportunityIcpWeightKey = (typeof OPPORTUNITY_ICP_WEIGHT_KEYS)[number]

export type OpportunityWeighingMethod = 'ai' | 'manual'

export type OpportunityIcpWeightInputs = Record<OpportunityIcpWeightKey, string>

export type OpportunityIcpWeights = Record<OpportunityIcpWeightKey, number>

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

export type OpportunityIcpScoringModePayload = { mode: 'ai' } | { mode: 'custom'; weights: OpportunityIcpWeights }

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

export function buildOpportunityIcpScoringModePayload(
  weighingMethod: OpportunityWeighingMethod,
  weightInputs: OpportunityIcpWeightInputs
): { payload: OpportunityIcpScoringModePayload } | { errorKey: 'required' | 'invalid' | 'exceeds-sum' } {
  if (weighingMethod === 'ai') {
    return { payload: { mode: 'ai' } }
  }

  const parsed = parseOpportunityIcpWeightInputs(weightInputs)
  if ('errorKey' in parsed) {
    return parsed
  }

  return { payload: { mode: 'custom', weights: parsed.weights } }
}
