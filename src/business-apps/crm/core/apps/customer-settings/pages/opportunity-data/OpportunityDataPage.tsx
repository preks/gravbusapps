import React, { useMemo } from 'react'
import { OpportunitySettings } from '@/common/components/common-relations/setting-pages/opportunity/OpportunitySettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineSettings } from '@/common/components/common-relations/setting-pages/pipelines/hooks/usePipelineSettings'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface OpportunityDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'pipelines' | 'statuses' | 'forecasts'
}

const DATA_TEST_ID = 'CustomerOpportunityDataPage'

const OpportunityDataPage: React.FC<OpportunityDataPageProps> = ({
  prefixDataTestId,
  onBack,
  initialTab,
  ...context
}) => {
  // Pipeline configuration
  const catalogConfig = useMemo(
    () => ({
      pipelineCatalog: 'SalesPipeline',
      stageCatalog: 'SalesPipelineStage',
      conditionCatalog: 'SalesPipelineStageCondition',
      version: 'v1',
      autoFetch: true
    }),
    []
  )

  const {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    stages,
    conditions,
    stageConditionCounts,
    isLoadingPipelines,
    isLoadingStages,
    isLoadingConditions,
    error: pipelineError,
    refetchPipelines,
    refetchStages,
    refetchConditions
  } = usePipelineSettings(context, catalogConfig)

  // Status and Forecast handlers
  const statuses = useCatalogSettings(context, 'SalesOpportunityStatus')
  const forecasts = useCatalogSettings(context, 'CustomerOpportunityForecast')

  return (
    <OpportunitySettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={initialTab}
      onBack={onBack}
      headerTitle="Opportunity Data"
      headerDescription="Manage opportunity pipelines, statuses, and forecast categories"
      pipelineTab={{
        ...context,
        pipelines,
        selectedPipeline,
        setSelectedPipeline,
        stages,
        conditions,
        stageConditionCounts,
        isLoadingPipelines,
        isLoadingStages,
        isLoadingConditions,
        error: pipelineError,
        refetchPipelines,
        refetchStages,
        refetchConditions,
        catalogConfig
      }}
      statuses={statuses}
      forecasts={forecasts}
    />
  )
}

export default OpportunityDataPage
