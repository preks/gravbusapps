import React from 'react'
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from '@newwork/nw-design-system'
import type { UseFormReturn } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { CAMPAIGN_STATUS, CAMPAIGN_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import type { CampaignFormValues } from '../types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import EmployeeSelect from '@/components/employee-select/EmployeeSelect'

interface CampaignFormBasicInfoProps {
  form: UseFormReturn<CampaignFormValues>
  t: (key: string) => string
  businessAppContext: BusinessAppContextProps
  prefetchedOwnerEmployee: { id: string; displayName: string } | null
  isUpdateMode: boolean
}

export function CampaignFormBasicInfo({
  form,
  t,
  businessAppContext,
  prefetchedOwnerEmployee,
  isUpdateMode
}: Readonly<CampaignFormBasicInfoProps>) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('campaign-name')}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t('campaign-name-placeholder')} data-testid="campaign-form-name-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('campaign-owner-form-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={prefetchedOwnerEmployee}
                autoSelect={isUpdateMode ? undefined : 'current-user'}
                placeholder={t('campaign-owner-placeholder')}
                data-testid="campaign-form-owner-select"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="typeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-type')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CAMPAIGN_TYPE}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-type-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerCampaignStatusRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-status')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CAMPAIGN_STATUS}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="campaign-form-status-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-startDate')}</FormLabel>
              <FormControl>
                <Input {...field} type="date" data-testid="campaign-form-start-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-endDate')}</FormLabel>
              <FormControl>
                <Input {...field} type="date" data-testid="campaign-form-end-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
