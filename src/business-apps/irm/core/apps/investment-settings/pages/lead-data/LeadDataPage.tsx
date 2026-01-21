import React from 'react'
import { LeadSettings } from '@/common/components/common-relations/setting-pages/lead/LeadSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface LeadDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'ratings' | 'statuses' | 'sources'
}

const DATA_TEST_ID = 'InvestmentLeadDataPage'

const LeadDataPage: React.FC<LeadDataPageProps> = ({ prefixDataTestId, onBack, initialTab, ...context }) => {
  const ratings = useCatalogSettings(context, 'InvestmentLeadRating')
  const statuses = useCatalogSettings(context, 'InvestmentLeadStatus')
  const sources = useCatalogSettings(context, 'InvestmentLeadSource')

  return (
    <LeadSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={initialTab}
      onBack={onBack}
      ratings={ratings}
      statuses={statuses}
      sources={sources}
    />
  )
}

export default LeadDataPage
