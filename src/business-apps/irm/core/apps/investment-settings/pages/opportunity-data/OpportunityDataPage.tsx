import React, { useMemo } from 'react'
import {
  OpportunitySettingsLayout,
  type OpportunitySettingsTab
} from '@/common/components/common-relations/setting-pages/opportunity'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface OpportunityDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: OpportunitySettingsTab
}

const OpportunityDataPage: React.FC<OpportunityDataPageProps> = props => {
  const config = useMemo(
    () => ({
      statusCatalog: 'InvestmentOpportunityStatus',
      forecastCatalog: 'InvestmentOpportunityForecast',
      pipelineCatalog: 'InvestmentOpportunityPipeline',
      stageCatalog: 'InvestmentOpportunityPipelineStage',
      stageTypeCatalog: 'InvestmentOpportunityPipelineStageType',
      conditionCatalog: 'InvestmentOpportunityPipelineStageCondition',
      dataTestIdPrefix: 'InvestmentOpportunityDataPage',
      headerTitle: 'Opportunity Data',
      headerDescription: 'Manage opportunity pipelines, statuses, and forecast categories'
    }),
    []
  )

  return <OpportunitySettingsLayout config={config} {...props} />
}

export default OpportunityDataPage
