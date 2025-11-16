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
import { Combobox } from '@newwork/nw-design-system'
import translations from './_i18n'

interface OpportunityDetailsSegmentProps {
  // Currency options
  currencies: Array<{ id: string; value: string; label?: string; name?: string }>
  currenciesLoading?: boolean
  currenciesError?: string | null
  currenciesHasMore?: boolean
  searchCurrencies?: (search: string) => void
  loadMoreCurrencies?: () => void
  // Custom fields
  customFields?: React.ReactNode
}

const OpportunityDetailsSegment: React.FC<OpportunityDetailsSegmentProps> = ({
  currencies = [],
  searchCurrencies,
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
              <FormLabel>
                {t('opportunity-estimated-amount-label')} <span>*</span>
              </FormLabel>
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
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('opportunity-currency-label')} <span>*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={currencies.map(c => ({ value: c.value, label: c.label || c.name || c.value }))}
                  onSearch={searchCurrencies}
                  placeholder={t('opportunity-currency-placeholder') || 'Please Select...'}
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
