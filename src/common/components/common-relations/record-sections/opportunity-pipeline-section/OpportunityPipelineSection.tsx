import React from 'react'
import { OpportunityStageProgression } from './OpportunityStageProgression'
import type { OpportunityStageProgressionProps } from './types'

/**
 * OpportunityPipelineSection wrapper component
 *
 * This is a simple wrapper around OpportunityStageProgression for consistency
 * with other record sections in the common components structure.
 */
export const OpportunityPipelineSection: React.FC<OpportunityStageProgressionProps> = props => {
  return <OpportunityStageProgression {...props} />
}

// Export types for convenience
export type { OpportunityStageProgressionProps, OpportunityPipelineContextConfig, ReferenceData } from './types'
