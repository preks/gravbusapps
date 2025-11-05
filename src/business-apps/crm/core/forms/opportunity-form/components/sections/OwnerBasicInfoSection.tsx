import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import OwnerSelector from '../OwnerSelector'
import SearchableSelect from '../SearchableSelect'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'
import ContactSelect from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import { useAccountsData } from '../../hooks/useAccountsData'
import { useSalesCampaignsGraphQL } from '@/business-apps/crm/common/hooks/useSalesCampaignsGraphQL'
import { useGetContacts } from '../../../../apps/customer-relations/views/contact-view/hooks/useGetContacts'

const prefixDataTestId = 'OpportunityForm'

const OwnerBasicInfoSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    businessAppContext
  } = useOpportunityFormContext()

  // Account data hook
  const { accountState, searchAccounts } = useAccountsData(businessAppContext)

  // Contacts hook - Using useGetContacts from CRM customer relations
  const [contactSearch, setContactSearch] = React.useState('')
  const {
    contacts: contactsList,
    isLoading: contactsLoading,
    error: contactsErrorObj
  } = useGetContacts(businessAppContext, contactSearch, 0)

  // Create search wrapper for contacts
  const searchContacts = React.useCallback((searchTerm: string) => {
    setContactSearch(searchTerm)
  }, [])

  // Map contacts to the format expected by ContactSelect
  const contacts = React.useMemo(
    () =>
      contactsList.map((contact: any) => ({
        id: String(contact.id || ''),
        value: String(contact.id || ''),
        label: contact.name || '',
        name: contact.name || '',
        extraInfo: {
          email: contact.email,
          jobPosition: contact.jobTitle
        }
      })),
    [contactsList]
  )

  const contactsError = contactsErrorObj ? String(contactsErrorObj) : null

  // Sales Campaign hook (CRM-specific)
  const {
    options: salesCampaigns,
    loading: salesCampaignsLoading,
    hasMore: salesCampaignsHasMore,
    search: searchSalesCampaigns,
    loadMore: loadMoreSalesCampaigns
  } = useSalesCampaignsGraphQL(businessAppContext.accessToken)

  return (
    <div className="gba:space-y-6">
      {/* Owner Selection */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
          Owner <span className="gba:text-red-500">*</span>
        </Label>
        <OwnerSelector
          value={formValues.owner}
          onChange={(value: string) => setFormValues({ owner: value })}
          employees={employeePositions}
          loading={employeePositionsLoading}
          error={employeePositionsError}
          hasMore={employeePositionsHasMore}
          onSearch={searchEmployeePositions}
          onLoadMore={loadMoreEmployeePositions}
          dataTestId={formatDataTestId(prefixDataTestId, 'owner-select')}
        />
      </div>

      {/* Opportunity Name */}
      <div className="gba:space-y-2">
        <Label htmlFor="opportunityName" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
          Opportunity Name <span className="gba:text-red-500">*</span>
        </Label>
        <Input
          id="opportunityName"
          value={formValues.name || ''}
          onChange={e => setFormValues({ name: e.target.value })}
          placeholder="Please enter opportunity name..."
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(prefixDataTestId, 'opportunity-name-input')}
        />
      </div>

      {/* Account Selection (CRM has accounts) */}
      <AccountSelect
        value={
          formValues.accountId && formValues.companyName
            ? { id: formValues.accountId, name: formValues.companyName }
            : formValues.accountId || ''
        }
        onChange={accountValue => {
          // AccountSelect passes { id, name } object for single select
          if (typeof accountValue === 'object' && accountValue !== null && 'id' in accountValue) {
            setFormValues({
              accountId: accountValue.id,
              companyName: accountValue.name
            })
          } else if (typeof accountValue === 'string') {
            // Fallback: if it's a string, set only the ID
            setFormValues({ accountId: accountValue })
          }
        }}
        dataTestId={formatDataTestId(prefixDataTestId, 'account-select')}
        error={null}
        label="Related Account"
        multiple={false}
        accounts={accountState.accounts.map((acc: any) => ({ ...acc, id: String(acc.id) }))}
        accountsLoading={accountState.isLoading}
        accountsError={null}
        searchAccounts={searchAccounts}
      />

      {/* Related Contacts Selection (CRM-specific) */}
      <ContactSelect
        value={formValues.contactIds || []}
        onChange={contactIds => setFormValues({ contactIds })}
        dataTestId={formatDataTestId(prefixDataTestId, 'contact-selector')}
        error={null}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsError={contactsError}
        searchContacts={searchContacts}
      />

      {/* Sales Campaign Selection (CRM-specific) */}
      <div className="gba:space-y-2">
        <SearchableSelect
          label="Sales Campaign"
          name="salesCampaignId"
          value={formValues.salesCampaignId}
          placeholder="Please Select Campaign..."
          options={salesCampaigns as any}
          loading={salesCampaignsLoading}
          hasMore={salesCampaignsHasMore}
          onSearch={searchSalesCampaigns}
          onLoadMore={loadMoreSalesCampaigns}
          onChange={value => {
            setFormValues({
              salesCampaignId: value
            })
          }}
          error={null}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'campaign-select')}
        />
      </div>
    </div>
  )
}

export default OwnerBasicInfoSection
