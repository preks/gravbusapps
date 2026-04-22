import React, { useMemo } from 'react'
import PipelineSettings from '@/common/components/common-relations/setting-pages/pipelines/PipelineSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineSettings } from '@/common/components/common-relations/setting-pages/pipelines/hooks/usePipelineSettings'
import { getPipelineCatalogConfig } from '@/common/components/common-relations/setting-pages/pipelines/utils/catalogConfig'

export interface PipelineDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'InvestmentPipelineDataPage'

const PipelineDataPage: React.FC<PipelineDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const catalogConfig = useMemo(
    () => ({
      ...getPipelineCatalogConfig('IRM'),
      autoFetch: true
    }),
    []
  )

  const { isLoading, error, refetch } = usePipelineSettings(context, catalogConfig)

  return (
    <PipelineSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      headerPhosphorIcon={{ icon: undefined, variant: 'strategy', size: 'lg', label: 'Pipelines' }}
      headerTitle={'Pipelines'}
      headerDescription={'Manage pipeline stages and counts'}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      onBack={onBack}
      accessToken={context.accessToken}
      catalogConfig={catalogConfig}
    />
  )
}

export default PipelineDataPage
