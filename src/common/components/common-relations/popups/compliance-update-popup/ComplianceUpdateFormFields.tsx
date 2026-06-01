import React from 'react'
import { MARKETING_OPT_IN_SOURCE, MARKETING_OPT_IN_STATUS } from '@/common/data/customer/constants/customerCatalogs'
import { CatalogSelect } from '@/components/catalog-select'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DateInput, FormControl, FormField, FormItem, FormLabel, FormMessage, Switch } from '@newwork/nw-design-system'

export interface ComplianceFormValues {
  singleOptIn?: 'true' | 'false'
  singleOptInDate?: string
  doubleOptIn?: 'true' | 'false'
  doubleOptInDate?: string
  optInSourceRef?: string
  optInStatusRef?: string
}

interface ComplianceUpdateFormFieldsProps {
  control: any
}

export const ComplianceUpdateFormFields: React.FC<ComplianceUpdateFormFieldsProps> = ({ control }) => {
  return (
    <div className="gba:space-y-4">
      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
        <FormField
          control={control}
          name="singleOptIn"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm.compliance.singleOptIn', 'Single opt-in')}</FormLabel>
              <FormControl>
                <div className="gba:flex gba:items-center gba:h-10">
                  <Switch
                    checked={field.value === 'true'}
                    onCheckedChange={checked => field.onChange(checked ? 'true' : 'false')}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="singleOptInDate"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('crm.compliance.singleOptInDate', 'Single opt-in date')}
              </FormLabel>
              <FormControl className="gba:min-w-0 gba:w-full">
                <DateInput
                  value={field.value || ''}
                  onChange={value => field.onChange(value || '')}
                  outputFormat="iso"
                  className="gba:w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
        <FormField
          control={control}
          name="doubleOptIn"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm.compliance.doubleOptIn', 'Double opt-in')}</FormLabel>
              <FormControl>
                <div className="gba:flex gba:items-center gba:h-10">
                  <Switch
                    checked={field.value === 'true'}
                    onCheckedChange={checked => field.onChange(checked ? 'true' : 'false')}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="doubleOptInDate"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('crm.compliance.doubleOptInDate', 'Double opt-in date')}
              </FormLabel>
              <FormControl className="gba:min-w-0 gba:w-full">
                <DateInput
                  value={field.value || ''}
                  onChange={value => field.onChange(value || '')}
                  outputFormat="iso"
                  className="gba:w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
        <FormField
          control={control}
          name="optInSourceRef"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm.compliance.optInSource', 'Opt-in source')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={MARKETING_OPT_IN_SOURCE}
                  prefetch
                  className="gba:w-full"
                  value={field.value || ''}
                  onValueChange={value => field.onChange(typeof value === 'string' ? value : '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="optInStatusRef"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm.compliance.optInStatus', 'Opt-in status')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={MARKETING_OPT_IN_STATUS}
                  prefetch
                  className="gba:w-full"
                  value={field.value || ''}
                  onValueChange={value => field.onChange(typeof value === 'string' ? value : '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

export default ComplianceUpdateFormFields
