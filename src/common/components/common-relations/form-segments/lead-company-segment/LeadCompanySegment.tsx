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
import translations from './_i18n'

interface LeadCompanySegmentProps {
  // Catalog identifiers (CRM vs IRM differences)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  // Custom fields
  customFields?: React.ReactNode
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
 *
 * Used in Accordion
 */
const LeadCompanySegment: React.FC<LeadCompanySegmentProps> = ({
  companySizeCatalogIdentifier = 'EmployeeSize:v1',
  annualRevenueCatalogIdentifier = 'RevenueSize:v1',
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
      {/* Legal Form and Industry - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="legalFormRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-legal-form')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="LegalForm:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="lead-segment-legal-form"
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
                  catalogIdentifier="IndustryClass:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="lead-segment-industry"
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
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-website')}</FormLabel>
            <FormControl>
              <Input placeholder={t('lead-segment-placeholder-enter')} data-testid="lead-segment-website" {...field} />
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
                onValueChange={v => field.onChange(v)}
                data-testid="lead-segment-number-of-employees"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Annual Revenue */}
      <FormField
        control={form.control}
        name="annualRevenueBandRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-annual-revenue')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={annualRevenueCatalogIdentifier}
                value={field.value || ''}
                onValueChange={v => field.onChange(v)}
                data-testid="lead-segment-annual-revenue"
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
