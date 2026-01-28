import React, { useMemo } from 'react'
import { LeadSettingsLayout } from '@/common/components/common-relations/setting-pages/lead'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'ratings' | 'statuses' | 'sources'
}

const LeadDataPage: React.FC<LeadDataPageProps> = props => {
  const config = useMemo(
    () => ({
      ratingCatalog: 'SalesLeadRating',
      statusCatalog: 'SalesLeadStatus',
      sourceCatalog: 'SalesLeadSource',
      dataTestIdPrefix: 'CustomerLeadDataPage',
      headerTitle: 'Lead Data',
      headerDescription: 'Manage lead ratings, statuses, and sources'
    }),
    []
  )

  return <LeadSettingsLayout config={config} {...props} />
}

export default LeadDataPage
