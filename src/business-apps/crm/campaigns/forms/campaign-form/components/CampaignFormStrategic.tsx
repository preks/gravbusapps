import React from 'react'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@newwork/nw-design-system'
import type { UseFormReturn } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import type { CampaignFormValues } from '../types'
import {
  CAMPAIGN_SEGMENT,
  COUNTRY,
  CUSTOMER_PERSONA,
  INDUSTRY_CLASS,
  VALUE_PACK_FOCUS
} from '@/common/data/customer/constants/customerCatalogs'

interface CampaignFormStrategicProps {
  form: UseFormReturn<CampaignFormValues>
  t: (key: string) => string
}

export function CampaignFormStrategic({ form, t }: Readonly<CampaignFormStrategicProps>) {
  return (
    <div className="gba:border-t gba:pt-6">
      <h2 className="gba:text-lg gba:font-medium gba:mb-4">{t('campaign-strategic')}</h2>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="customerCampaignSegmentRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-segment')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CAMPAIGN_SEGMENT}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-segment-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerPersonaRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-persona')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CUSTOMER_PERSONA}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-persona-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerValuePackFocusRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-valuePack')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={VALUE_PACK_FOCUS}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-valuepack-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerIndustryFocusRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-industryFocus')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={INDUSTRY_CLASS}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-industry-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="countryRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-geography')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={COUNTRY}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-geography-select"
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
