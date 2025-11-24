import React, { useMemo, useCallback } from 'react'
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
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'
import ContactSelect, {
  type SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
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
  // Account selection hook result - raw entities and refetch function
  useAccounts?: {
    accounts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
  // Contact selection props
  opportunityContacts?: any[]
  // Contact selection hook result - raw entities and refetch function
  useContacts?: {
    contacts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
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
  useAccounts,
  useContacts,
  customFields,
  hideRelatedEntities = false
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Transform accounts to SelectOption[] internally
  const accountOptions = useMemo<AccountSelectOption[]>(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map((acc: any) => ({
      id: acc.id,
      value: acc.id,
      label: acc.name || acc.displayName || '',
      name: acc.name || acc.displayName || ''
    }))
  }, [useAccounts?.accounts])

  // Search function for accounts - calls refetch with search variables
  const searchAccounts = useCallback(
    (searchTerm: string) => {
      if (useAccounts?.refetch) {
        useAccounts.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useAccounts?.refetch]
  )

  // Transform contacts to SelectOption[] internally
  const contactOptions = useMemo<ContactSelectOption[]>(() => {
    if (!useContacts?.contacts) return []
    return useContacts.contacts.map((contact: any) => {
      const emailChannel = contact.communicationChannels?.find((ch: any) => ch.type === 'EMAIL')
      const phoneChannel = contact.communicationChannels?.find((ch: any) => ch.type === 'PHONE')
      const displayName =
        contact.displayName ||
        contact.fullName ||
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
        'Unknown Contact'
      return {
        id: contact.id,
        value: contact.id,
        label: displayName,
        name: displayName,
        email: emailChannel?.value || undefined,
        phone: phoneChannel?.value || undefined,
        pictureThumbnail: contact.pictureThumbnail,
        jobPosition: contact.jobPosition,
        department: contact.department
      }
    })
  }, [useContacts?.contacts])

  // Search function for contacts - calls refetch with search variables
  const searchContacts = useCallback(
    (searchTerm: string) => {
      if (useContacts?.refetch) {
        useContacts.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useContacts?.refetch]
  )

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
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={entityId ? undefined : 'current-user'}
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
                    let accountId: string | null = null
                    if (typeof value === 'object' && value !== null && 'id' in value) {
                      accountId = value.id
                    } else if (typeof value === 'string') {
                      accountId = value
                    }

                    field.onChange(accountId || '')
                  }}
                  initialAccount={account}
                  dataTestId="opportunity-segment-account-select"
                  error={useAccounts?.error || null}
                  accounts={accountOptions}
                  accountsLoading={useAccounts?.loading || false}
                  accountsError={useAccounts?.error || null}
                  searchAccounts={searchAccounts}
                  multiple={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Contacts Selection using ContactSelect */}
      {!hideRelatedEntities && useContacts && (
        <FormField
          control={form.control}
          name="opportunityContacts"
          render={({ field, fieldState }) => {
            // Transform opportunityContacts to ContactSelect format
            // opportunityContacts: Array<{ id, version, opportunityId, contactId, contactType }>
            // ContactSelect expects: Array<{ id, name, contactType }>
            const opportunityContacts = field.value || []
            const contactSelectValue = opportunityContacts.map((oc: any) => {
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

            // Handle onChange - transform back to opportunityContacts format
            const handleChange = (
              newValue:
                | Array<string | { id: string; name: string; contactType?: string }>
                | string
                | { id: string; name: string; contactType?: string }
                | null
            ) => {
              const opportunityId = form.getValues('id')
              const existingOpportunityContacts = field.value || []
              // Normalize to array
              const normalizedValue = Array.isArray(newValue) ? newValue : newValue === null ? [] : [newValue]
              const opportunityContacts = normalizedValue.map((contactValue: any) => {
                const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
                const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

                // Find existing opportunityContact to preserve id and version
                const existingOc = existingOpportunityContacts.find(
                  (oc: any) => (oc.contactId || oc.contact?.id) === contactId
                )

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
                    contacts={contactOptions}
                    contactsLoading={useContacts.loading}
                    contactsError={useContacts.error}
                    searchContacts={searchContacts}
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
