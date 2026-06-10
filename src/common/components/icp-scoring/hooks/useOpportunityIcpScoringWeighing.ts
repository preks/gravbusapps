import { useCallback, useState } from 'react'
import {
  buildOpportunityIcpScoringModePayload,
  EMPTY_OPPORTUNITY_ICP_WEIGHT_INPUTS,
  type OpportunityIcpScoringModePayload,
  type OpportunityIcpWeightInputs,
  type OpportunityWeighingMethod
} from '../utils/opportunityIcpScoringWeights'

export type OpportunityIcpWeightValidationErrorKey = 'required' | 'invalid' | 'exceeds-sum'

export interface UseOpportunityIcpScoringWeighingReturn {
  weighingMethod: OpportunityWeighingMethod
  setWeighingMethod: (method: OpportunityWeighingMethod) => void
  weightInputs: OpportunityIcpWeightInputs
  setWeightInput: (key: keyof OpportunityIcpWeightInputs, value: string) => void
  weightsValidationErrorKey: OpportunityIcpWeightValidationErrorKey | null
  validateWeights: () => boolean
  buildModePayload: () => OpportunityIcpScoringModePayload | null
  reset: () => void
}

export function useOpportunityIcpScoringWeighing(): UseOpportunityIcpScoringWeighingReturn {
  const [weighingMethod, setWeighingMethod] = useState<OpportunityWeighingMethod>('ai')
  const [weightInputs, setWeightInputs] = useState<OpportunityIcpWeightInputs>(EMPTY_OPPORTUNITY_ICP_WEIGHT_INPUTS)
  const [weightsValidationErrorKey, setWeightsValidationErrorKey] =
    useState<OpportunityIcpWeightValidationErrorKey | null>(null)

  const setWeightInput = useCallback((key: keyof OpportunityIcpWeightInputs, value: string) => {
    setWeightInputs(previous => ({ ...previous, [key]: value }))
    setWeightsValidationErrorKey(null)
  }, [])

  const reset = useCallback(() => {
    setWeighingMethod('ai')
    setWeightInputs(EMPTY_OPPORTUNITY_ICP_WEIGHT_INPUTS)
    setWeightsValidationErrorKey(null)
  }, [])

  const validateWeights = useCallback((): boolean => {
    const built = buildOpportunityIcpScoringModePayload(weighingMethod, weightInputs)
    if ('errorKey' in built) {
      setWeightsValidationErrorKey(built.errorKey)
      return false
    }

    setWeightsValidationErrorKey(null)
    return true
  }, [weighingMethod, weightInputs])

  const buildModePayload = useCallback((): OpportunityIcpScoringModePayload | null => {
    const built = buildOpportunityIcpScoringModePayload(weighingMethod, weightInputs)
    if ('errorKey' in built) {
      setWeightsValidationErrorKey(built.errorKey)
      return null
    }

    setWeightsValidationErrorKey(null)
    return built.payload
  }, [weighingMethod, weightInputs])

  return {
    weighingMethod,
    setWeighingMethod,
    weightInputs,
    setWeightInput,
    weightsValidationErrorKey,
    validateWeights,
    buildModePayload,
    reset
  }
}
