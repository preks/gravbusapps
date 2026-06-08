import React from 'react'
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { Plus, Trash } from '@phosphor-icons/react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import translations from '../../_i18n'
import { STANDARD_ENGAGEMENT_METRIC_KEYS, type StandardEngagementMetricKey } from './engagementMetricsUtils'
import type { CampaignContentFormValues } from './campaignContentFormSchema'

export function EngagementMetricsFields() {
  const { t } = useTranslation(translations)
  const form = useFormContext<CampaignContentFormValues>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'engagementMetrics.custom'
  })

  const metricLabel = (key: StandardEngagementMetricKey) => t(`campaign-content-metric-${key}`)

  return (
    <div className="gba:space-y-4" data-testid="content-form-engagement-metrics">
      <div>
        <FormLabel>{t('campaign-content-engagementMetrics')}</FormLabel>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('campaign-content-engagementMetrics-help')}</p>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4">
        {STANDARD_ENGAGEMENT_METRIC_KEYS.map(key => (
          <FormField
            key={key}
            control={form.control}
            name={`engagementMetrics.standard.${key}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{metricLabel(key)}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={field.value ?? ''}
                    onChange={e => {
                      const next = e.target.value
                      field.onChange(next === '' ? undefined : Number(next))
                    }}
                    data-testid={`content-form-metric-${key}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <FormLabel className="gba:mb-0">{t('campaign-content-customMetrics')}</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ key: '', value: undefined })}
            data-testid="content-form-add-custom-metric"
          >
            <Plus size={16} className="gba:mr-1" />
            {t('campaign-content-addMetric')}
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="gba:text-xs gba:text-muted-foreground">{t('campaign-content-customMetrics-empty')}</p>
        ) : (
          <div className="gba:space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="gba:flex gba:flex-col gba:sm:flex-row gba:gap-2 gba:items-start"
                data-testid={`content-form-custom-metric-row-${index}`}
              >
                <FormField
                  control={form.control}
                  name={`engagementMetrics.custom.${index}.key`}
                  render={({ field: keyField }) => (
                    <FormItem className="gba:flex-1 gba:w-full">
                      <FormLabel className="gba:sr-only">{t('campaign-content-metricName')}</FormLabel>
                      <FormControl>
                        <Input
                          {...keyField}
                          placeholder={t('campaign-content-metricName-placeholder')}
                          data-testid={`content-form-custom-metric-key-${index}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`engagementMetrics.custom.${index}.value`}
                  render={({ field: valueField }) => (
                    <FormItem className="gba:flex-1 gba:w-full">
                      <FormLabel className="gba:sr-only">{t('campaign-content-metricValue')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={valueField.value ?? ''}
                          onChange={e => {
                            const next = e.target.value
                            valueField.onChange(next === '' ? undefined : Number(next))
                          }}
                          data-testid={`content-form-custom-metric-value-${index}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
                  onClick={() => remove(index)}
                  aria-label={t('campaign-content-removeMetric')}
                  data-testid={`content-form-custom-metric-remove-${index}`}
                >
                  <Trash size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
