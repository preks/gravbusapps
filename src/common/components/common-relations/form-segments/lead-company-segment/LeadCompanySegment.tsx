import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { PiPlus, PiMinus } from 'react-icons/pi'
import { LEGAL_FORM, INDUSTRY_CLASS, COUNTRY, COUNTRY_REGION } from '@/common/constants/commonCatalogs'
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
 * - Address Lines 1-4 (Text Inputs - flat fields)
 * - Postal Code, Locality (Text Inputs - flat fields)
 * - Region, Country (Catalog Selects - flat fields)
 *
 * Used in Accordion
 */
const LeadCompanySegment: React.FC<LeadCompanySegmentProps> = ({
  companySizeCatalogIdentifier,
  annualRevenueCatalogIdentifier,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for address lines (working with addressLine.lines)
  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine
  } = useFieldArray({
    control: form.control,
    name: 'addressLine.lines'
  })

  // Ensure at least one address line always exists
  React.useEffect(() => {
    if (lineFields.length === 0) {
      appendLine('')
    }
  }, [lineFields.length, appendLine])

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
                  catalogIdentifier={LEGAL_FORM}
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
                  catalogIdentifier={INDUSTRY_CLASS}
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
        name="companyWebsite"
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
        name="accountAnnualRevenueBandRef"
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

      {/* Address Section */}
      <div className="gba:space-y-6 gba:pt-6 gba:border-t">
        <h3 className="gba:text-base gba:font-semibold">{t('lead-segment-address-title')}</h3>

        {/* Address Lines - Dynamic with useFieldArray */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <FormLabel>{t('lead-segment-address-lines-label')}</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendLine('')}
              className="gba:text-xs gba:px-2 gba:py-1"
              data-testid="lead-segment-add-address-line"
            >
              <PiPlus className="gba:w-3 gba:h-3 gba:mr-1" />
              {t('lead-segment-add-address-line')}
            </Button>
          </div>

          {lineFields.map((lineField, lineIndex) => (
            <div key={lineField.id} className="gba:flex gba:items-center gba:gap-2">
              <FormField
                control={form.control}
                name={`addressLine.lines.${lineIndex}`}
                render={({ field: addressLineField }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        placeholder={t('lead-segment-address-line', { number: lineIndex + 1 })}
                        data-testid={`lead-segment-address-line-${lineIndex + 1}`}
                        value={addressLineField.value || ''}
                        onChange={e => addressLineField.onChange(e.target.value)}
                        onBlur={addressLineField.onBlur}
                        name={addressLineField.name}
                        ref={addressLineField.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {lineFields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLine(lineIndex)}
                  className="gba:flex gba:items-center gba:gap-1"
                  data-testid={`lead-segment-remove-address-line-${lineIndex + 1}`}
                >
                  <PiMinus className="gba:w-4 gba:h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Postal Code and Locality - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('lead-segment-postal-code')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('lead-segment-placeholder-enter')}
                    data-testid="lead-segment-postal-code"
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

          <FormField
            control={form.control}
            name="locality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('lead-segment-locality')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('lead-segment-placeholder-enter')}
                    data-testid="lead-segment-locality"
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
        </div>

        {/* Country and Region - Side by side (bidirectional relationship) */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <FormField
            control={form.control}
            name="countryRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('lead-segment-country')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={COUNTRY}
                    childField="regionRef"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="lead-segment-country"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regionRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('lead-segment-region')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={COUNTRY_REGION}
                    parentField="countryRef"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="lead-segment-region"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadCompanySegment
