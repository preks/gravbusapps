import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { LEGAL_FORM } from '@/common/constants/commonCatalogs'
import translations from './_i18n'

interface CoreInformationSegmentProps {
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)
  customFields?: React.ReactNode
}

const CoreInformationSegment: React.FC<CoreInformationSegmentProps> = ({
  annualRevenueCatalogIdentifier,
  companySizeCatalogIdentifier,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
      {/* Legal Form and Number of Employees - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="legalFormRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('legal-form-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={LEGAL_FORM}
                  parentField="addresses.0.countryRef"
                  requireSourceForEnable
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="core-information-segment-legal-form"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companySizeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('number-of-employees-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={companySizeCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="core-information-segment-number-of-employees"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Annual Revenue and Foundation Date - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="accountAnnualRevenueBandRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('annual-revenue-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={annualRevenueCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="core-information-segment-annual-revenue"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="foundationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('foundation-date-label')}</FormLabel>
              <FormControl>
                <DateInput
                  value={field.value || ''}
                  onChange={value => field.onChange(value || '')}
                  placeholder={t('foundation-date-placeholder')}
                  data-testid="core-information-segment-foundation-date"
                  captionLayout="dropdown"
                  outputFormat="iso"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default CoreInformationSegment
