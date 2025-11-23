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
import { DateInput } from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { CURRENCY } from '@/common/data/relations/constants/catalogConstants'
import translations from './_i18n'

interface OpportunityDetailsSegmentProps {
  // Currency catalog identifier
  currencyCatalogIdentifier?: string // Default: 'Currency:v1'
  // Custom fields
  customFields?: React.ReactNode
}

const OpportunityDetailsSegment: React.FC<OpportunityDetailsSegmentProps> = ({
  currencyCatalogIdentifier = CURRENCY,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
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
                  outputFormat="utc"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Empty div to take up the other 50% */}
        <div></div>
      </div>

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default OpportunityDetailsSegment
