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
    contextType: 'customer',
    context
  })

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/crm/opportunity-record', {
      opportunityId,
      source: 'customer-relations'
    })
  }

  const accountUrlBuilder = (accountId: string) => {
    return buildPlatformUrl('/platform/crm/account-record', {
      accountId,
      source: 'customer-relations'
    })
  }

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      accountUrlBuilder={accountUrlBuilder}
      contextType="customer"
      data-testid="account-opportunities-section"
    />
  )
}
