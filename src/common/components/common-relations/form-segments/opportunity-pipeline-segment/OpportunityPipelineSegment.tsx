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
}

const OpportunityPipelineSegment: React.FC<OpportunityPipelineSegmentProps> = ({
  pipelineCatalogIdentifier,
  stageCatalogIdentifier,
  opportunityStatusCatalogIdentifier,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Fixed field names
  const pipelineFieldName = 'opportunityPipelineRef'
  const stageFieldName = 'opportunityPipelineStageRef'
  const opportunityStatusFieldName = 'opportunityStatusRef'

  // Watch pipeline value
  const pipelineValue = form.watch(pipelineFieldName)

  // Clear stage when pipeline changes
  useEffect(() => {
    if (pipelineValue) {
      // Stage will be automatically filtered by CatalogSelect via filterField
      // No need to manually clear here as CatalogSelect handles it
    } else {
      form.setValue(stageFieldName, '')
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
                  value={field.value || ''}
                  onValueChange={value => {
                    field.onChange(value)
                    // Clear stage when pipeline changes
                    form.setValue(stageFieldName, '')
                  }}
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
              <FormLabel>{t('opportunity-stage-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={stageCatalogIdentifier}
                  parentField={pipelineFieldName}
                  requireSourceForEnable={true}
                  value={field.value || ''}
                  onValueChange={field.onChange}
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
