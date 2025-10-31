import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useRecordOpportunities } from '@/common/components/common-relations/record-sections/opportunity-section/hooks/useRecordOpportunities'

interface OpportunityViewProps {
  accountId: string
  context: BusinessAppContextProps
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ accountId, context }) => {
  const { opportunities, loading, error } = useRecordOpportunities({
    recordId: accountId,
    recordType: 'account',
    contextType: 'investment',
    context
  })

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      source: 'investments'
    })
  }

  const accountUrlBuilder = (accountId: string) => {
    return buildPlatformUrl('/platform/irm/account-record', {
      accountId,
      source: 'investments'
    })
  }

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      accountUrlBuilder={accountUrlBuilder}
      data-testid="account-opportunities-card"
    />
  )
}
