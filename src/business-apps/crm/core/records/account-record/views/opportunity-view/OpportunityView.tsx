import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useCustomerRecordOpportunities } from '@/business-apps/crm/common/hooks/useCustomerRecordOpportunities'
import { createWinningChanceColumn } from '@/business-apps/crm/common/components'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'

interface OpportunityViewProps {
  accountId: string
  context: BusinessAppContextProps
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ accountId, context }) => {
  const { opportunities, loading, error } = useCustomerRecordOpportunities({
    recordId: accountId,
    recordType: 'account',
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

  // CRM-specific: Add Winning Chance column
  const winningChanceColumn = useMemo(() => createWinningChanceColumn<CustomerOpportunity>(), [])

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      accountUrlBuilder={accountUrlBuilder}
      additionalColumns={[winningChanceColumn]}
      extendVisibleColumns={['winningChance']}
      data-testid="account-opportunities-section"
    />
  )
}
