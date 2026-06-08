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
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import type { AccountSegmentOption } from '@/common/components/common-relations/form-segments/account-segment'
import { ContactSegment } from '@/common/components/common-relations/form-segments/contact-segment'
import type { ContactSegmentOption } from '@/common/components/common-relations/form-segments/contact-segment'
import translations from './_i18n'

interface OpportunityInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps
  // Owner employee from opportunity data (to display immediately)
  ownerEmployee?: any
  // Entity ID (opportunity ID for edit mode)
  entityId?: string
  // Account selection props
  account?: any // Deprecated - use opportunityAccounts instead
  opportunityAccounts?: any[] // Multiple accounts with types (junction table format)
  // Contact selection props
  opportunityContacts?: any[] // Multiple contacts with types (junction table format)
  // Account selection hook result - raw entities and refetch function
  useAccounts?: {
    accounts: any[]
    total?: number
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  // Contact selection hook result - raw entities and refetch function
  useContacts?: {
    contacts: any[]
    total?: number
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  // Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Opportunity Type)
  customFields?: React.ReactNode
  // Hide related entities (account/contact) sections - useful in Lead Convert context
  hideRelatedEntities?: boolean
  // Catalog identifier for opportunity forecast (context-specific)
  opportunityForecastCatalogIdentifier?: string
  // Catalog identifier for account type (context-specific)
  // e.g., 'CustomerAccountType:v1' for CRM, 'InvestmentAccountType:v1' for IRM
  accountTypeCatalogIdentifier?: string
  // Currency catalog identifier
  currencyCatalogIdentifier?: string
}

const OpportunityInformationSegment: React.FC<OpportunityInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  opportunityAccounts,
  opportunityContacts,
  useAccounts,
  useContacts,
  customFields,
  hideRelatedEntities = false,
  opportunityForecastCatalogIdentifier,
  accountTypeCatalogIdentifier,
  currencyCatalogIdentifier = CURRENCY
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Transform accounts to AccountSegmentOption[]
  const accountOptions = useMemo<AccountSegmentOption[]>(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map((acc: any) => ({
      id: acc.id,
      value: acc.id,
      label: acc.name || acc.displayName || '',
      name: acc.name || acc.displayName || '',
      pictureThumbnail: acc.pictureThumbnail,
      extraInfo: {
        website: acc.website
      }
    }))
  }, [useAccounts?.accounts])

  // Search function for accounts — prefers stateful `search`, falls back to `refetch`
  const searchAccounts = useCallback(
    (searchTerm: string) => {
      if (useAccounts?.search) {
        useAccounts.search(searchTerm)
      } else if (useAccounts?.refetch) {
        useAccounts.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useAccounts?.search, useAccounts?.refetch]
  )

  // Transform contacts to ContactSegmentOption[]
  const contactOptions = useMemo<ContactSegmentOption[]>(() => {
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
        pictureThumbnail: contact.pictureThumbnail,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          jobPosition: contact.jobPosition,
          department: contact.department
        }
      }
    })
  }, [useContacts?.contacts])

  // Search function for contacts — prefers stateful `search`, falls back to `refetch`
  const searchContacts = useCallback(
    (searchTerm: string) => {
      if (useContacts?.search) {
        useContacts.search(searchTerm)
      } else if (useContacts?.refetch) {
        useContacts.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useContacts?.search, useContacts?.refetch]
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
            <FormLabel className="gba:text-foreground">{t('opportunity-name-label')}</FormLabel>
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

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign, IRM Opportunity Type) */}
      {customFields && <div>{customFields}</div>}

      {/* Accounts Selection - Multiple accounts with types */}
      {!hideRelatedEntities && useAccounts && (
        <FormItem>
          <FormLabel>{t('opportunity-related-account-label')}</FormLabel>
          <FormControl>
            <AccountSegment
              fieldArrayName="opportunityAccounts"
              accountIdFieldName="accountId"
              accountTypeFieldName="accountTypeRef"
              accountTypeCatalogIdentifier={accountTypeCatalogIdentifier}
              accounts={accountOptions}
              accountsLoading={useAccounts.loading}
              accountsError={useAccounts.error}
              searchAccounts={searchAccounts}
              hasMore={useAccounts.hasMore}
              onLoadMore={useAccounts.loadMore}
              accountContacts={opportunityAccounts || []}
              dataTestId="opportunity-segment-accounts"
            />
          </FormControl>
        </FormItem>
      )}

      {/* Contacts Selection - Multiple contacts with types */}
      {!hideRelatedEntities && useContacts && (
        <FormItem>
          <FormLabel>{t('opportunity-related-contacts-label')}</FormLabel>
          <FormControl>
            <ContactSegment
              fieldArrayName="opportunityContacts"
              contactIdFieldName="contactId"
              contactTypeFieldName="contactType"
              contacts={contactOptions}
              contactsLoading={useContacts.loading}
              contactsError={useContacts.error}
              searchContacts={searchContacts}
              hasMore={useContacts.hasMore}
              onLoadMore={useContacts.loadMore}
              contactRelations={opportunityContacts || []}
              dataTestId="opportunity-segment-contacts"
            />
          </FormControl>
        </FormItem>
      )}
    </div>
  )
}

export default OpportunityInformationSegment
