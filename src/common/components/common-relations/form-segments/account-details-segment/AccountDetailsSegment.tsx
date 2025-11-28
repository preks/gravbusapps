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
import translations from './_i18n'

interface AccountDetailsSegmentProps {
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)
  customFields?: React.ReactNode
}

const AccountDetailsSegment: React.FC<AccountDetailsSegmentProps> = ({
  annualRevenueCatalogIdentifier,
  companySizeCatalogIdentifier,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
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
                  data-testid="account-details-segment-annual-revenue"
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
                  data-testid="account-details-segment-foundation-date"
                  captionLayout="dropdown"
                  outputFormat="iso"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Company Size */}
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
                data-testid="account-details-segment-number-of-employees"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default AccountDetailsSegment
