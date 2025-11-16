import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { OwnerSelect } from '@/common/components/common-relations/selects/owner-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'
import ContactSelect, {
  type SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import translations from './_i18n'

interface OpportunityInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps
  // Owner employee from opportunity data (to display immediately)
  ownerEmployee?: any
  // Entity ID (opportunity ID for edit mode)
  entityId?: string
  // Account selection props
  accountId?: string | { id: string; name: string }
  accounts?: any[]
  accountsLoading?: boolean
  accountsError?: string | null
  searchAccounts?: (search: string) => void
  onAccountChange?: (accountId: string | { id: string; name: string } | null) => void
  // Contact selection props
  opportunityContacts?: any[]
  contacts?: ContactSelectOption[]
  contactsLoading?: boolean
  contactsError?: string | null
  searchContacts?: (search: string) => void
  onContactsChange?: (contactIds: Array<string | { id: string; name: string }>) => void
  onNewContact?: () => void
  // Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Deal Type)
  customFields?: React.ReactNode
}

const OpportunityInformationSegment: React.FC<OpportunityInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  accountId,
  accounts = [],
  accountsLoading = false,
  accountsError = null,
  searchAccounts,
  onAccountChange,
  opportunityContacts = [],
  contacts = [],
  contactsLoading = false,
  contactsError = null,
  searchContacts,
  onContactsChange,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Owner */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('opportunity-owner-label')} <span>*</span>
            </FormLabel>
            <FormControl>
              <OwnerSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext!}
                ownerEmployee={ownerEmployee}
                isNewEntity={!entityId}
                placeholder={t('please-select')}
                data-testid="opportunity-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Opportunity Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('opportunity-name-label')} <span>*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('opportunity-name-placeholder')}
                data-testid="opportunity-segment-opportunity-name"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Deal Type) */}
      {customFields && <div>{customFields}</div>}

      {/* Account Selection - Single account for opportunities */}
      {onAccountChange && searchAccounts && (
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-related-account-label')}</FormLabel>
              <FormControl>
                <AccountSelect
                  value={
                    accountId
                      ? typeof accountId === 'object'
                        ? accountId
                        : { id: accountId, name: accounts.find(a => a.id === accountId)?.name || '' }
                      : null
                  }
                  onChange={value => {
                    const accountValue =
                      typeof value === 'object' && value !== null
                        ? value
                        : typeof value === 'string'
                          ? { id: value, name: accounts.find(a => a.id === value)?.name || '' }
                          : null
                    field.onChange(accountValue ? accountValue.id : '')
                    onAccountChange(accountValue)
                  }}
                  dataTestId="opportunity-segment-account-select"
                  error={accountsError}
                  accounts={accounts.map(acc => ({
                    id: typeof acc.id === 'string' ? acc.id : String(acc.id),
                    value: typeof acc.id === 'string' ? acc.id : String(acc.id),
                    label: acc.label || acc.name || '',
                    name: acc.name || acc.label || ''
                  }))}
                  accountsLoading={accountsLoading}
                  accountsError={accountsError}
                  searchAccounts={searchAccounts}
                  multiple={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Contacts List */}
      {onContactsChange && searchContacts && (
        <FormField
          control={form.control}
          name="contactIds"
          render={() => (
            <FormItem>
              <FormLabel>{t('opportunity-related-contacts-label')}</FormLabel>
              <FormControl>
                <ContactSelect
                  value={
                    (opportunityContacts || []).map((oc: any) => {
                      const contactId = oc.contact?.id || oc.contactId || oc.contact
                      const contact = oc.contact
                      const contactName =
                        contact?.displayName ||
                        contact?.fullName ||
                        `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() ||
                        'Unknown Contact'
                      return typeof contactId === 'string'
                        ? {
                            id: contactId,
                            name: contactName
                          }
                        : contactId
                    }) || []
                  }
                  onChange={onContactsChange}
                  contacts={contacts.map(c => ({
                    id: typeof c.id === 'string' ? c.id : String(c.id),
                    value: typeof c.id === 'string' ? c.id : String(c.id),
                    label: c.label || c.name || '',
                    name: c.name || c.label || ''
                  }))}
                  contactsLoading={contactsLoading}
                  contactsError={contactsError}
                  searchContacts={searchContacts}
                  dataTestId="opportunity-segment-contacts"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

export default OpportunityInformationSegment
