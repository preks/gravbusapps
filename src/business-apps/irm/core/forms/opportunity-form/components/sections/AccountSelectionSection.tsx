import React from 'react'
import { Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import { useAccountsGraphQL } from '../../hooks/useAccountsGraphQL'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'InvestmentOpportunityForm'

const AccountSelectionSection: React.FC = () => {
  const { formValues, businessAppContext } = useOpportunityFormContext()

  const { handleInputChange } = useOpportunityFormFieldClearing()

  // Hide account selection when creating opportunity from lead conversion
  const isLeadConversion = businessAppContext.additionalData?.leadId

  // Simple accounts hook
  const {
    options: simpleAccounts,
    loading: simpleAccountsLoading,
    error: simpleAccountsError,
    hasMore: simpleAccountsHasMore,
    search: searchSimpleAccounts,
    loadMore: loadMoreSimpleAccounts
  } = useAccountsGraphQL({
    accessToken: businessAppContext.accessToken
  })

  // Hide account selection when creating opportunity from lead conversion
  if (isLeadConversion) {
    return null
  }

  return (
    <div className="gba:space-y-6">
      {/* Related Account */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">Related Investment Account</Label>
        <SearchableSelect
          name="account"
          value={formValues.account}
          onChange={value => handleInputChange('account', value)}
          options={simpleAccounts}
          loading={simpleAccountsLoading}
          error={simpleAccountsError}
          hasMore={simpleAccountsHasMore}
          onSearch={searchSimpleAccounts}
          onLoadMore={loadMoreSimpleAccounts}
          placeholder="Please select investment account..."
          data-testid={formatDataTestId(prefixDataTestId, 'account')}
        />
      </div>
    </div>
  )
}

export default AccountSelectionSection
