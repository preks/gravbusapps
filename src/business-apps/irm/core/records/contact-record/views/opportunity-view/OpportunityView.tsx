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
    contextType: 'investment',
    context
  })

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      source: 'investments'
    })
  }

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      data-testid="contact-opportunities-section"
    />
  )
}
