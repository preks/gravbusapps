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
      statusCatalog: 'SalesOpportunityStatus',
      forecastCatalog: 'CustomerOpportunityForecast',
      pipelineCatalog: 'SalesPipeline',
      stageCatalog: 'SalesPipelineStage',
      stageTypeCatalog: 'SalesPipelineStageType',
      conditionCatalog: 'SalesPipelineStageCondition',
      dataTestIdPrefix: 'CustomerOpportunityDataPage',
      headerTitle: 'Opportunity Data',
      headerDescription: 'Manage opportunity pipelines, statuses, and forecast categories'
    }),
    []
  )

  return <OpportunitySettingsLayout config={config} {...props} />
}

export default OpportunityDataPage
