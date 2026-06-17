import { useCallback, useState } from 'react'
import {
  buildOpportunityIcpScoringModePayload,
  DEFAULT_OPPORTUNITY_ICP_WEIGHT_INPUTS,
  type OpportunityIcpScoringModePayload,
  type OpportunityIcpWeightInputs
} from '../utils/opportunityIcpScoringWeights'

export type OpportunityIcpWeightValidationErrorKey = 'required' | 'invalid' | 'exceeds-sum'

export interface UseOpportunityIcpScoringWeighingReturn {
  weightInputs: OpportunityIcpWeightInputs
  setWeightInput: (key: keyof OpportunityIcpWeightInputs, value: string) => void
  weightsValidationErrorKey: OpportunityIcpWeightValidationErrorKey | null
  validateWeights: () => boolean
  buildModePayload: () => OpportunityIcpScoringModePayload | null
  reset: () => void
}

export interface UseOpportunityIcpScoringWeighingOptions {
  allowOptionalWeights?: boolean
}

export function useOpportunityIcpScoringWeighing(
  options: UseOpportunityIcpScoringWeighingOptions = {}
): UseOpportunityIcpScoringWeighingReturn {
  const allowOptionalWeights = options.allowOptionalWeights === true
  const payloadOptions = { allowOptionalWeights }
  const [weightInputs, setWeightInputs] = useState<OpportunityIcpWeightInputs>(DEFAULT_OPPORTUNITY_ICP_WEIGHT_INPUTS)
  const [weightsValidationErrorKey, setWeightsValidationErrorKey] =
    useState<OpportunityIcpWeightValidationErrorKey | null>(null)

  const setWeightInput = useCallback((key: keyof OpportunityIcpWeightInputs, value: string) => {
    setWeightInputs(previous => ({ ...previous, [key]: value }))
    setWeightsValidationErrorKey(null)
  }, [])

  const reset = useCallback(() => {
    setWeightInputs(DEFAULT_OPPORTUNITY_ICP_WEIGHT_INPUTS)
    setWeightsValidationErrorKey(null)
  }, [])

  const validateWeights = useCallback((): boolean => {
    const built = buildOpportunityIcpScoringModePayload(weightInputs, payloadOptions)
    if ('errorKey' in built) {
      setWeightsValidationErrorKey(built.errorKey)
      return false
    }

    setWeightsValidationErrorKey(null)
    return true
  }, [allowOptionalWeights, weightInputs])

  const buildModePayload = useCallback((): OpportunityIcpScoringModePayload | null => {
    const built = buildOpportunityIcpScoringModePayload(weightInputs, payloadOptions)
    if ('errorKey' in built) {
      setWeightsValidationErrorKey(built.errorKey)
      return null
    }

    setWeightsValidationErrorKey(null)
    return built.payload
  }, [allowOptionalWeights, weightInputs])

  return {
    weightInputs,
    setWeightInput,
    weightsValidationErrorKey,
    validateWeights,
    buildModePayload,
    reset
  }
}
