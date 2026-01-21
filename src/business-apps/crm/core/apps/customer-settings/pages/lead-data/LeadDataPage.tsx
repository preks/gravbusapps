import React, { useEffect, useState } from 'react'
import { LeadSettings } from '@/common/components/common-relations/setting-pages/lead/LeadSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface LeadDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'ratings' | 'statuses' | 'sources'
}

const DATA_TEST_ID = 'CustomerLeadDataPage'

const LeadDataPage: React.FC<LeadDataPageProps> = ({ prefixDataTestId, onBack, initialTab, ...context }) => {
  const [tab, setTab] = useState<'ratings' | 'statuses' | 'sources'>(initialTab || 'ratings')

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get('tab') as any
    if (t && ['ratings', 'statuses', 'sources'].includes(t)) setTab(t)
  }, [])

  const ratings = useCatalogSettings(context, 'SalesLeadRating')
  const statuses = useCatalogSettings(context, 'SalesLeadStatus')
  const sources = useCatalogSettings(context, 'SalesLeadSource')

  return (
    <LeadSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={tab}
      onBack={onBack}
      ratings={ratings}
      statuses={statuses}
      sources={sources}
    />
  )
}

export default LeadDataPage
