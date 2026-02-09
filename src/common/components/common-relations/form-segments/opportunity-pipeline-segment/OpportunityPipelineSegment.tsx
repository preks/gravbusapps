import React, { useEffect } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, useTranslation } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import translations from './_i18n'

interface OpportunityPipelineSegmentProps {
  // Catalog identifiers (context-specific)
  pipelineCatalogIdentifier?: string
  stageCatalogIdentifier?: string
  opportunityStatusCatalogIdentifier?: string
  // Custom fields
  customFields?: React.ReactNode
  // Control dynamic required indicator (for conditional validation scenarios)
  showDynamicStageRequired?: boolean
}

const OpportunityPipelineSegment: React.FC<OpportunityPipelineSegmentProps> = ({
  pipelineCatalogIdentifier,
  stageCatalogIdentifier,
  opportunityStatusCatalogIdentifier,
  customFields,
  showDynamicStageRequired = true
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Fixed field names
  const pipelineFieldName = 'opportunityPipelineRef'
  const stageFieldName = 'opportunityPipelineStageRef'
  const opportunityStatusFieldName = 'opportunityStatusRef'

  // Watch pipeline value
  const pipelineValue = form.watch(pipelineFieldName)

  // Keep track of previous pipeline value to detect changes
  // Initialize with undefined to ensure the effect runs on mount
  const previousPipelineValueRef = React.useRef<typeof pipelineValue>(undefined)

  // Check if stage is required (when pipeline has a value)
  const isStageRequired = Boolean(
    pipelineValue !== null &&
      pipelineValue !== undefined &&
      pipelineValue !== '' &&
      typeof pipelineValue === 'string' &&
      pipelineValue.trim() !== ''
  )

  // Clear stage when pipeline changes or is cleared
  useEffect(() => {
    const currentValue = pipelineValue
    const previousValue = previousPipelineValueRef.current

    // If pipeline changed (including being cleared)
    if (currentValue !== previousValue) {
      previousPipelineValueRef.current = currentValue

      // Clear stage whenever pipeline changes or is cleared
      if (!currentValue || (typeof currentValue === 'string' && currentValue.trim() === '')) {
        form.setValue(stageFieldName, null, { shouldValidate: true, shouldDirty: true })
      }
    }
  }, [pipelineValue, stageFieldName, form])

  return (
    <div className="gba:space-y-6">
      {/* Pipeline and Stage - Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Pipeline */}
        <FormField
          control={form.control}
          name={pipelineFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-pipeline-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={pipelineCatalogIdentifier}
                  variant="combobox"
                  value={field.value || ''}
                  onValueChange={value => field.onChange(value || null)}
                  allowClear
                  data-testid="opportunity-segment-pipeline-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pipeline Stage */}
        <FormField
          control={form.control}
          name={stageFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('opportunity-stage-label')}
                {showDynamicStageRequired && isStageRequired && <span className="gba:text-destructive"> *</span>}
              </FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={stageCatalogIdentifier}
                  parentField={pipelineFieldName}
                  requireSourceForEnable={true}
                  variant="combobox"
                  value={field.value || ''}
                  onValueChange={value => field.onChange(value || null)}
                  allowClear
                  data-testid="opportunity-segment-stage-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Opportunity Status (CRM only) */}
      {opportunityStatusCatalogIdentifier && (
        <FormField
          control={form.control}
          name={opportunityStatusFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-status-label') || 'Opportunity Status'}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={opportunityStatusCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="opportunity-segment-status-select"
                  allowClear={false}
                  autoSelectFirst
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default OpportunityPipelineSegment
