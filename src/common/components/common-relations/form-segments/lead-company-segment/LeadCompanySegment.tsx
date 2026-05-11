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
import { CatalogSelect } from '@/components/catalog-select'
import { LEGAL_FORM, INDUSTRY_CLASS } from '@/common/constants/commonCatalogs'
import { getAutoFilledClassName } from '../utils/autoFilledClassName'
import LeadAddressFields from './LeadAddressFields'
import translations from './_i18n'

interface LeadCompanySegmentProps {
  // Catalog identifiers (CRM vs IRM differences)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  // Custom fields
  customFields?: React.ReactNode
  // Auto-filled fields tracking
  autoFilledFields?: Set<string>
  onFieldChange?: (fieldName: string) => void
}

/**
 * LeadCompanySegment - Company financial and legal details
 *
 * Contains:
 * - Legal Form (Catalog Select)
 * - Industry (Catalog Select)
 * - Website (Text Input)
 * - Company Email (Text Input)
 * - Company Phone (Text Input)
 * - Number of Employees (Catalog Select - context-specific identifier)
 * - Annual Revenue (Catalog Select - context-specific identifier)
 * - Address Lines 1-4 (Text Inputs - flat fields)
 * - Postal Code, Locality (Text Inputs - flat fields)
 * - Region, Country (Catalog Selects - flat fields)
 *
 * Used in Accordion
 */
const LeadCompanySegment: React.FC<LeadCompanySegmentProps> = ({
  companySizeCatalogIdentifier,
  annualRevenueCatalogIdentifier,
  customFields,
  autoFilledFields = new Set(),
  onFieldChange
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
      <LeadAddressFields autoFilledFields={autoFilledFields} onFieldChange={onFieldChange} />

      {/* Legal Form and Industry - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2 gba:pt-6 gba:border-t">
        <FormField
          control={form.control}
          name="legalFormRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-legal-form')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={LEGAL_FORM}
                  parentField="countryRef"
                  value={field.value || ''}
                  onValueChange={v => {
                    field.onChange(v)
                    if (onFieldChange) onFieldChange('legalFormRef')
                  }}
                  data-testid="lead-segment-legal-form"
                  className={getAutoFilledClassName('legalFormRef', autoFilledFields)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industryClassRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-industry')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={INDUSTRY_CLASS}
                  value={field.value || ''}
                  onValueChange={v => {
                    field.onChange(v)
                    if (onFieldChange) onFieldChange('industryClassRef')
                  }}
                  data-testid="lead-segment-industry"
                  className={getAutoFilledClassName('industryClassRef', autoFilledFields)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Website */}
      <FormField
        control={form.control}
        name="companyWebsite"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-website')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-website"
                {...field}
                onChange={e => {
                  field.onChange(e)
                  if (onFieldChange) onFieldChange('companyWebsite')
                }}
                className={getAutoFilledClassName('companyWebsite', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Company Email */}
      <FormField
        control={form.control}
        name="companyEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-company-email')}</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-company-email"
                {...field}
                onChange={e => {
                  field.onChange(e)
                  if (onFieldChange) onFieldChange('companyEmail')
                }}
                className={getAutoFilledClassName('companyEmail', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Company Phone */}
      <FormField
        control={form.control}
        name="companyPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-company-phone')}</FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-company-phone"
                {...field}
                onChange={e => {
                  field.onChange(e)
                  if (onFieldChange) onFieldChange('companyPhone')
                }}
                className={getAutoFilledClassName('companyPhone', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Number of Employees */}
      <FormField
        control={form.control}
        name="companySizeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-number-of-employees')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={companySizeCatalogIdentifier}
                value={field.value || ''}
                onValueChange={v => {
                  field.onChange(v)
                  if (onFieldChange) onFieldChange('companySizeRef')
                }}
                data-testid="lead-segment-number-of-employees"
                className={getAutoFilledClassName('companySizeRef', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Annual Revenue */}
      <FormField
        control={form.control}
        name="accountAnnualRevenueBandRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-annual-revenue')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={annualRevenueCatalogIdentifier}
                value={field.value || ''}
                onValueChange={v => {
                  field.onChange(v)
                  if (onFieldChange) onFieldChange('accountAnnualRevenueBandRef')
                }}
                data-testid="lead-segment-annual-revenue"
                className={getAutoFilledClassName('accountAnnualRevenueBandRef', autoFilledFields)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadCompanySegment
