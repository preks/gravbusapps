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
  account?: any
  // Account selection hook result
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  accountsHook?: {
    options: any[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }
  // Contact selection props
  opportunityContacts?: any[]
  // Contact selection hook result
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  contactsHook?: {
    options: ContactSelectOption[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }
  onNewContact?: () => void
  // Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Deal Type)
  customFields?: React.ReactNode
  // Hide related entities (account/contact) sections - useful in Lead Convert context
  hideRelatedEntities?: boolean
}

const OpportunityInformationSegment: React.FC<OpportunityInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  account,
  accountsHook,
  contactsHook,
  customFields,
  hideRelatedEntities = false
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
            <FormLabel>{t('opportunity-owner-label')}</FormLabel>
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
            <FormLabel>{t('opportunity-name-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('opportunity-name-placeholder')}
                data-testid="opportunity-segment-opportunity-name"
                value={field.value || ''}
                onChange={e => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Deal Type) */}
      {customFields && <div>{customFields}</div>}

      {/* Account Selection - Single account for opportunities */}
      {!hideRelatedEntities && (
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-related-account-label')}</FormLabel>
              <FormControl>
                <AccountSelect
                  value={field.value || null}
                  onChange={value => {
                    // Type guard: ensure value is not an array (single-select mode)
                    if (Array.isArray(value)) {
                      return
                    }

                    // Extract ID from value (string or object)
                    const accountId =
                      typeof value === 'object' && value !== null && 'id' in value
                        ? value.id
                        : typeof value === 'string'
                          ? value
                          : null

                    field.onChange(accountId || '')
                  }}
                  initialAccount={account}
                  dataTestId="opportunity-segment-account-select"
                  error={accountsHook?.error || null}
                  accounts={accountsHook?.options || []}
                  accountsLoading={accountsHook?.loading || false}
                  accountsError={accountsHook?.error || null}
                  searchAccounts={accountsHook?.search || (() => {})}
                  multiple={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Contacts Selection using ContactSelect */}
      {!hideRelatedEntities && contactsHook && (
        <FormField
          control={form.control}
          name="opportunityContacts"
          render={({ field, fieldState }) => {
            // Transform opportunityContacts to ContactSelect format
            // opportunityContacts: Array<{ id, version, opportunityId, contactId, contactType }>
            // ContactSelect expects: Array<{ id, name, contactType }>
            const contactSelectValue = React.useMemo(() => {
              const opportunityContacts = field.value || []
              return opportunityContacts.map((oc: any) => {
                // If opportunityContact has contact object with full data, use it
                if (oc.contact) {
                  const contact = oc.contact
                  const displayName =
                    contact.displayName ||
                    contact.fullName ||
                    `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
                    'Unknown Contact'
                  return {
                    id: oc.contactId || oc.contact?.id || '',
                    name: displayName,
                    contactType: oc.contactType || undefined,
                    pictureThumbnail: contact.pictureThumbnail,
                    jobPosition: contact.jobPosition,
                    department: contact.department
                  }
                }
                // Otherwise, use minimal data from opportunityContact
                return {
                  id: oc.contactId || '',
                  name: oc.contact?.name || 'Unknown Contact',
                  contactType: oc.contactType || undefined
                }
              })
            }, [field.value])

            // Handle onChange - transform back to opportunityContacts format
            const handleChange = (newValue: Array<string | { id: string; name: string; contactType?: string }>) => {
              const opportunityId = form.getValues('id')
              const opportunityContacts = newValue.map((contactValue: any) => {
                const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
                const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

                // Find existing opportunityContact to preserve id and version
                const existingOc = (field.value || []).find((oc: any) => (oc.contactId || oc.contact?.id) === contactId)

                return {
                  ...(existingOc?.id && { id: existingOc.id }),
                  ...(existingOc?.version !== undefined && { version: existingOc.version }),
                  opportunityId: opportunityId || undefined,
                  contactId: contactId,
                  contactType: contactType || null
                }
              })
              field.onChange(opportunityContacts)
            }

            return (
              <FormItem>
                <FormLabel>{t('opportunity-related-contacts-label')}</FormLabel>
                <FormControl>
                  <ContactSelect
                    value={contactSelectValue}
                    onChange={handleChange}
                    contacts={contactsHook.options}
                    contactsLoading={contactsHook.loading}
                    contactsError={contactsHook.error}
                    searchContacts={contactsHook.search}
                    accountContacts={field.value || []}
                    dataTestId="opportunity-segment-contacts"
                    error={fieldState.error?.message || null}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}
    </div>
  )
}

export default OpportunityInformationSegment
