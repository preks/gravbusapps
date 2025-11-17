import React, { useEffect } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, useTranslation } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import translations from './_i18n'

interface OpportunityPipelineSegmentProps {
  // Field names (for context-specific differences)
  pipelineFieldName?: string // Default: 'pipeline'
  stageFieldName?: string // Default: 'pipelineStage' (IRM) or 'salesPipelineStage' (CRM)
  opportunityStatusFieldName?: string // Default: 'opportunityStatus' (CRM only)
  // Catalog identifiers (context-specific)
  pipelineCatalogIdentifier?: string // Default: 'SalesPipeline:v1' (CRM) or 'InvestmentOpportunityPipeline:v1' (IRM)
  stageCatalogIdentifier?: string // Default: 'SalesPipelineStage:v1' (CRM) or 'InvestmentOpportunityPipelineStage:v1' (IRM)
  opportunityStatusCatalogIdentifier?: string // Default: 'SalesOpportunityStatus:v1' (CRM only)
  // Custom fields
  customFields?: React.ReactNode
}

const OpportunityPipelineSegment: React.FC<OpportunityPipelineSegmentProps> = ({
  pipelineFieldName = 'pipeline',
  stageFieldName = 'salesPipelineStage',
  opportunityStatusFieldName = 'opportunityStatus',
  pipelineCatalogIdentifier = 'SalesPipeline:v1',
  stageCatalogIdentifier = 'SalesPipelineStage:v1',
  opportunityStatusCatalogIdentifier = 'SalesOpportunityStatus:v1',
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

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
              <FormLabel>
                {t('opportunity-pipeline-label')} <span>*</span>
              </FormLabel>
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
              <FormLabel>
                {t('opportunity-stage-label')} <span>*</span>
              </FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={stageCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  filterField={[{ from: pipelineFieldName, on: 'parentEntryId' }]}
                  requireSourceForEnable={true}
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
