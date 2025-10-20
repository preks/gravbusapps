export { useOpportunityData } from './useOpportunityData'
export { useSalesPipelineStages } from './useSalesPipelineStages'
export { useUpdateOpportunityStage } from './useUpdateOpportunityStage'

import * as OpportunityData from './useOpportunityData'
import * as SalesPipelineStages from './useSalesPipelineStages'
import * as UpdateOpportunityStage from './useUpdateOpportunityStage'

export default {
  ...OpportunityData,
  ...SalesPipelineStages,
  ...UpdateOpportunityStage
}
