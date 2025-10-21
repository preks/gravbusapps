import React from 'react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import { useGetInvestmentAccounts } from '@/common/data/investment'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'

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
    search: searchSimpleAccounts
  } = useGetInvestmentAccounts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Hide account selection when creating opportunity from lead conversion
  if (isLeadConversion) {
    return null
  }

  return (
    <div className="gba:space-y-6">
      {/* Related Account */}
      <AccountSelect
        value={formValues.account}
        onChange={value => {
          // Extract ID from object if needed (for single-select compatibility)
          const accountId = typeof value === 'object' && value?.id ? value.id : value
          handleInputChange('account', accountId as string)
        }}
        accounts={simpleAccounts}
        accountsLoading={simpleAccountsLoading}
        accountsError={simpleAccountsError}
        searchAccounts={searchSimpleAccounts}
        label="Related Investment Account"
        dataTestId={formatDataTestId(prefixDataTestId, 'account')}
        error={null}
        multiple={false} // ✅ Single account selection for opportunities
      />
    </div>
  )
}

export default AccountSelectionSection
