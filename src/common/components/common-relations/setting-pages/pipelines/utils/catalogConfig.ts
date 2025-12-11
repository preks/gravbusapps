export type SourceApp = 'CRM' | 'IRM'

export interface PipelineCatalogConfig {
  pipelineCatalog: string
  stageCatalog: string
  conditionCatalog: string
  version: string
}

export const getPipelineCatalogConfig = (sourceApp: SourceApp): PipelineCatalogConfig => {
  if (sourceApp === 'IRM') {
    return {
      pipelineCatalog: 'InvestmentOpportunityPipeline',
      stageCatalog: 'InvestmentOpportunityPipelineStage',
      conditionCatalog: 'InvestmentOpportunityPipelineStageCondition',
      version: 'v1'
    } as const
  }

  return {
    pipelineCatalog: 'SalesPipeline',
    stageCatalog: 'SalesPipelineStage',
    conditionCatalog: 'SalesPipelineStageCondition',
    version: 'v1'
  } as const
}

export const getStageParentEntryId = (sourceApp: SourceApp, stageCode: string): string => {
  const { stageCatalog, version } = getPipelineCatalogConfig(sourceApp)
  return `${stageCatalog}:${version}:${stageCode}`
}
