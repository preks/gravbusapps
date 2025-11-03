import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useRecordOpportunities } from '@/common/components/common-relations/record-sections/opportunity-section/hooks/useRecordOpportunities'

interface OpportunityViewProps extends BusinessAppContextProps {
  contactId: string
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ contactId, ...context }) => {
  const { opportunities, loading, error } = useRecordOpportunities({
    recordId: contactId,
    recordType: 'contact',
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
      data-testid="contact-opportunities-section"
    />
  )
}
