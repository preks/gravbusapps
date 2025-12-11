import React, { useMemo } from 'react'
import PipelineSettings from '@/common/components/common-relations/setting-pages/pipelines/PipelineSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineSettings } from '@/common/components/common-relations/setting-pages/pipelines/hooks/usePipelineSettings'

export interface PipelineDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'InvestmentPipelineDataPage'

const PipelineDataPage: React.FC<PipelineDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const catalogConfig = useMemo(
    () => ({
      pipelineCatalog: 'InvestmentOpportunityPipeline',
      stageCatalog: 'InvestmentOpportunityPipelineStage',
      conditionCatalog: 'InvestmentOpportunityPipelineStageCondition',
      version: 'v1',
      autoFetch: true
    }),
    []
  )

  const { pipelines, isLoading, error, refetch } = usePipelineSettings(context, catalogConfig)

  const renderPipelineCard = undefined

  // no inline delete in this view; handled by dedicated modal/components

  return (
    <>
      <PipelineSettings
        prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        headerPhosphorIcon={{ icon: undefined, variant: 'strategy', size: 'lg', label: 'Pipelines' }}
        headerTitle={'Pipelines'}
        headerDescription={'Manage pipeline stages and counts'}
        isLoading={isLoading}
        error={error}
        pipelines={pipelines as any}
        renderPipelineCard={renderPipelineCard}
        onRetry={refetch}
        onBack={onBack}
        accessToken={context.accessToken}
        catalogConfig={catalogConfig}
      />
    </>
  )
}

export default PipelineDataPage
