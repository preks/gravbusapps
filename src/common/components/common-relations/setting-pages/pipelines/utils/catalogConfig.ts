export type SourceApp = 'CRM' | 'IRM'

export interface PipelineCatalogConfig {
  pipelineCatalog: string
  stageCatalog: string
  stageTypeCatalog: string
  conditionCatalog: string
  version: string
}

export const getPipelineCatalogConfig = (sourceApp: SourceApp): PipelineCatalogConfig => {
  if (sourceApp === 'IRM') {
    return {
      pipelineCatalog: 'InvestmentOpportunityPipeline',
      stageCatalog: 'InvestmentOpportunityPipelineStage',
      stageTypeCatalog: 'InvestmentOpportunityPipelineStageType',
      conditionCatalog: 'InvestmentOpportunityPipelineStageCondition',
      version: 'v1'
    } as const
  }

  return {
    pipelineCatalog: 'SalesPipeline',
    stageCatalog: 'SalesPipelineStage',
    stageTypeCatalog: 'SalesPipelineStageType',
    conditionCatalog: 'SalesPipelineStageCondition',
    version: 'v1'
  } as const
}

export const getStageParentEntryId = (sourceApp: SourceApp, stageCode: string): string => {
  const { stageCatalog, version } = getPipelineCatalogConfig(sourceApp)
  return `${stageCatalog}:${version}:${stageCode}`
}

/** Maps pipeline catalog to GraphQL opportunity table for delete-usage checks (CRM vs IRM). */
export function getPipelineUsageCheckSource(pipelineCatalog: string): SourceApp {
  return pipelineCatalog === 'InvestmentOpportunityPipeline' ? 'IRM' : 'CRM'
}
