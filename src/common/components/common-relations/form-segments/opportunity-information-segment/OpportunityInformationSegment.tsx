import React, { useMemo, useCallback } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation,
  DateInput
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogSelect } from '@/components/catalog-select'
import { CURRENCY } from '@/common/constants/commonCatalogs'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'
import ContactSelect, {
  type SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import { CompanySelect } from '@/components/company-select'
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
  // Catalog identifier for opportunity forecast (context-specific)
  opportunityForecastCatalogIdentifier?: string
  // Currency catalog identifier
  currencyCatalogIdentifier?: string
  // Company from opportunity data (to display immediately)
  company?: any
}

const OpportunityInformationSegment: React.FC<OpportunityInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  account,
  company,
  useAccounts,
  useContacts,
  customFields,
  hideRelatedEntities = false,
  opportunityForecastCatalogIdentifier,
  currencyCatalogIdentifier = CURRENCY
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

  // Helper function to transform opportunityContact to ContactSelect format
  const transformOpportunityContactToContactSelect = (
    oc: any
  ): {
    id: string
    name: string
    contactType?: string
    pictureThumbnail?: string
    jobPosition?: string
    department?: string
  } => {
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
    return {
      id: oc.contactId || '',
      name: oc.contact?.name || 'Unknown Contact',
      contactType: oc.contactType || undefined
    }
  }

  // Helper function to normalize contact value to array
  const normalizeContactValueToArray = (
    newValue:
      | Array<string | { id: string; name: string; contactType?: string }>
      | string
      | { id: string; name: string; contactType?: string }
      | null
  ): Array<string | { id: string; name: string; contactType?: string }> => {
    if (Array.isArray(newValue)) {
      return newValue
    }
    if (newValue === null) {
      return []
    }
    return [newValue]
  }

  // Helper function to transform contact value to opportunityContact format
  const transformContactValueToOpportunityContact = useCallback(
    (contactValue: any, opportunityId: string | undefined, existingOpportunityContacts: any[]) => {
      const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
      const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

      // Find existing opportunityContact to preserve id and version
      const existingOc = existingOpportunityContacts.find((oc: any) => (oc.contactId || oc.contact?.id) === contactId)

      return {
        ...(existingOc?.id && { id: existingOc.id }),
        ...(existingOc?.version !== undefined && { version: existingOc.version }),
        opportunityId: opportunityId || undefined,
        contactId: contactId,
        contactType: contactType || null
      }
    },
    []
  )

  // Helper function to get account ID from value
  const getAccountIdFromValue = (value: any): string | null => {
    if (Array.isArray(value)) {
      return null
    }
    if (typeof value === 'object' && value !== null && 'id' in value) {
      return value.id
    }
    if (typeof value === 'string') {
      return value
    }
    return null
  }

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Company */}
      <FormField
        control={form.control}
        name="companyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('company-label')}</FormLabel>
            <FormControl>
              <CompanySelect
                value={field.value || null}
                onValueChange={(v: string | null) => {
                  field.onChange(v || '')
                }}
                businessAppContext={businessAppContext}
                initialCompany={company}
                data-testid="opportunity-information-segment-company"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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

      {/* Opportunity Forecast */}
      {opportunityForecastCatalogIdentifier && (
        <FormField
          control={form.control}
          name="opportunityForecastRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forecast-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={opportunityForecastCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="opportunity-information-segment-forecast"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Estimated Amount and Currency - Same Row */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="estimatedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-estimated-amount-label')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('opportunity-estimated-amount-placeholder') || 'Please enter estimated amount...'}
                  data-testid="opportunity-segment-estimated-amount"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currencyRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-currency-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={currencyCatalogIdentifier}
                  variant="combobox"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="opportunity-segment-currency-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Close Date - 50% width */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="closeDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-close-date-label') || 'Expected Close Date'}</FormLabel>
              <FormControl>
                <DateInput
                  value={field.value || ''}
                  onChange={value => field.onChange(value || '')}
                  placeholder={t('opportunity-close-date-placeholder') || 'Select date...'}
                  data-testid="opportunity-segment-close-date"
                  outputFormat="iso"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div></div>
      </div>

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
                    const accountId = getAccountIdFromValue(value)
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
            const opportunityContacts = field.value || []
            const contactSelectValue = opportunityContacts.map(transformOpportunityContactToContactSelect)

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
              const normalizedValue = normalizeContactValueToArray(newValue)
              const opportunityContacts = normalizedValue.map((contactValue: any) =>
                transformContactValueToOpportunityContact(contactValue, opportunityId, existingOpportunityContacts)
              )
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
