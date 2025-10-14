export { useOpportunityStatusCatalog } from './useOpportunityStatusCatalog'
export { usePipelineCatalogs } from './usePipelineCatalogs'
export { useCurrencyCatalog } from './useCurrencyCatalog'
export { useOpportunityData } from './useOpportunityData'

export type { OpportunityStatusOption, UseOpportunityStatusCatalogReturn } from './useOpportunityStatusCatalog'
export type { PipelineOption, PipelineStageOption, UsePipelineCatalogsReturn } from './usePipelineCatalogs'
export type { CurrencyOption, UseCurrencyCatalogReturn } from './useCurrencyCatalog'
export type { UseOpportunityDataReturn } from './useOpportunityData'

// Default export for wrapper compatibility
const hooks = {
  useOpportunityStatusCatalog,
  usePipelineCatalogs,
  useCurrencyCatalog,
  useOpportunityData
}

export default hooks as unknown as any
