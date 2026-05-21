import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Checkbox,
  Label,
  useTranslation,
  AutocompleteInput,
  type AutocompleteOption
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getAutoFilledClassName } from '../utils/autoFilledClassName'
import translations from './_i18n'

interface LeadInformationSegmentProps {
  // Business app context for EmployeeSelect and CatalogSelect
  businessAppContext?: BusinessAppContextProps
  // Owner employee from lead data (to display immediately)
  ownerEmployee?: any
  // Entity ID (lead ID for edit mode)
  entityId?: string
  // Context-specific catalog identifiers
  leadStatusCatalogIdentifier: string // e.g., "SalesLeadStatus:v1" (CRM) or "InvestmentLeadStatus:v1" (IRM)
  leadSourceCatalogIdentifier: string // e.g., "SalesLeadSource:v1" (CRM) or "InvestmentLeadSource:v1" (IRM)
  leadRatingCatalogIdentifier: string // e.g., "SalesLeadRating:v1" (CRM) or "InvestmentLeadRating:v1" (IRM)
  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode
  // Account autocomplete props
  accountSearchOptions?: AutocompleteOption[]
  onAccountSearch?: (query: string) => void
  onAccountSelect?: (accountId: string, accountData: any) => void
  accountSearchLoading?: boolean

  // Auto-filled fields tracking
  autoFilledFields?: Set<string>
  onFieldChange?: (fieldName: string) => void
}

/**
 * LeadInformationSegment - Main lead information fields
 *
 * Contains:
 * - Owner (Employee Select)
 * - First Name, Last Name, Email, Company (required)
 * - Status, Source, Rating (Catalog Selects)
 * - Sensitive (Checkbox)
 * - Custom fields slot (e.g., Sales Campaign for CRM)
 */
const LeadInformationSegment: React.FC<LeadInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  leadStatusCatalogIdentifier,
  leadSourceCatalogIdentifier,
  leadRatingCatalogIdentifier,
  customFields,
  accountSearchOptions = [],
  onAccountSearch,
  onAccountSelect,
  accountSearchLoading = false,
  autoFilledFields = new Set(),
  onFieldChange
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
            <FormLabel>{t('lead-segment-owner')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={entityId ? undefined : 'current-user'}
                placeholder={t('lead-segment-placeholder-select')}
                data-testid="lead-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* First Name and Last Name - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-first-name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-first-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-last-name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-last-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Email */}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-email')}</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-email"
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

      {/* Company Name - Autocomplete with Account Search */}
      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-company-name')}</FormLabel>
            <FormControl>
              <AutocompleteInput
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-company-name"
                value={field.value || ''}
                onChange={e => {
                  field.onChange(e.target.value)
                  if (onFieldChange) onFieldChange('companyName')
                }}
                options={accountSearchOptions}
                onSearch={onAccountSearch}
                onSelect={(accountId, option) => {
                  // Update company name field
                  field.onChange(option.label)
                  // Trigger auto-fill callback if provided
                  if (onAccountSelect && option.data) {
                    onAccountSelect(accountId, option.data)
                  }
                }}
                loading={accountSearchLoading}
                className={getAutoFilledClassName('companyName', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status and Source - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="leadStatusRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-status')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={leadStatusCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="lead-segment-status"
                  allowClear={false}
                  autoSelectFirst
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leadSourceRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-source')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={leadSourceCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="lead-segment-source"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Rating and Sensitive - Same Row */}
      <div className="gba:flex gba:gap-6 gba:items-end">
        {/* Rating Field */}
        <div className="gba:flex-1">
          <FormField
            control={form.control}
            name="leadRatingRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('lead-segment-rating')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={leadRatingCatalogIdentifier}
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="lead-segment-rating"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Sensitive Checkbox */}
        <div className="gba:pb-2">
          <FormField
            control={form.control}
            name="sensitive"
            render={({ field }) => (
              <FormItem>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      data-testid="lead-segment-sensitive"
                    />
                  </FormControl>
                  <Label className="gba:text-sm gba:font-medium gba:cursor-pointer">
                    {t('lead-segment-sensitive')}
                  </Label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign) */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadInformationSegment
