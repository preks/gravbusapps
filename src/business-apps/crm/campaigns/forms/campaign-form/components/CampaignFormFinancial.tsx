import React from 'react'
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from '@newwork/nw-design-system'
import type { UseFormReturn } from 'react-hook-form'
import type { CampaignFormValues } from '../types'

interface CampaignFormFinancialProps {
  form: UseFormReturn<CampaignFormValues>
  t: (key: string) => string
}

const validateOptionalNonNegativeNumber = (v: unknown, invalidMsg: string): true | string => {
  if (v === undefined || v === null || v === '') return true
  const n = Number(v)
  if (Number.isNaN(n) || n < 0) return invalidMsg
  return true
}

export function CampaignFormFinancial({ form, t }: Readonly<CampaignFormFinancialProps>) {
  const invalidNumberMsg = t('campaign-field-required')

  return (
    <div className="gba:border-t gba:pt-6">
      <h2 className="gba:text-lg gba:font-medium gba:mb-4">{t('campaign-financial')}</h2>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="budgetAllocated"
          rules={{ validate: v => validateOptionalNonNegativeNumber(v, invalidNumberMsg) }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-budget')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.00"
                  data-testid="campaign-form-budget-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pipelineTarget"
          rules={{ validate: v => validateOptionalNonNegativeNumber(v, invalidNumberMsg) }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-pipelineTarget')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.00"
                  data-testid="campaign-form-pipeline-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expectedWinRate"
          rules={{ validate: v => validateOptionalNonNegativeNumber(v, invalidNumberMsg) }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-winRate')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0"
                  data-testid="campaign-form-winrate-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expectedRevenueContribution"
          rules={{ validate: v => validateOptionalNonNegativeNumber(v, invalidNumberMsg) }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('campaign-revenue')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.00"
                  data-testid="campaign-form-revenue-input"
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
