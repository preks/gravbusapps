import React, { useEffect, useRef } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import translations from './_i18n'

interface OpportunityPipelineSegmentProps {
  // Pipeline options
  pipelines: Array<{ id: string; value: string; label?: string; name?: string }>
  // Stage options (dependent on selected pipeline)
  stages: Array<{ id: string; value: string; label?: string; name?: string }>
  stagesLoading?: boolean
  // Callback to refetch stages when pipeline changes
  onPipelineChange?: (pipelineId: string) => void
  // Opportunity Status options (CRM only)
  opportunityStatuses?: Array<{ id: string; value: string; label?: string }>
  // Field names (for context-specific differences)
  pipelineFieldName?: string // Default: 'pipeline'
  stageFieldName?: string // Default: 'pipelineStage' (IRM) or 'salesPipelineStage' (CRM)
  opportunityStatusFieldName?: string // Default: 'opportunityStatus' (CRM only)
  // Custom fields
  customFields?: React.ReactNode
}

const OpportunityPipelineSegment: React.FC<OpportunityPipelineSegmentProps> = ({
  pipelines,
  stages,
  stagesLoading = false,
  onPipelineChange,
  opportunityStatuses = [],
  pipelineFieldName = 'pipeline',
  stageFieldName = 'pipelineStage',
  opportunityStatusFieldName = 'opportunityStatus',
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const previousPipelineRef = useRef<string>('')

  // Watch pipeline value
  const pipelineValue = form.watch(pipelineFieldName)
  const stageValue = form.watch(stageFieldName)

  // Auto-select "Standard" pipeline option if not already selected, fallback to first option
  useEffect(() => {
    if (pipelines.length > 0 && !pipelineValue) {
      // First try to find "Standard" pipeline (case-insensitive)
      const standardPipeline = pipelines.find(
        pipeline =>
          pipeline.label?.toLowerCase().includes('standard') ||
          pipeline.name?.toLowerCase().includes('standard') ||
          pipeline.value?.toLowerCase().includes('standard') ||
          pipeline.id?.toLowerCase().includes('standard')
      )

      // Select Standard if found, otherwise select first option
      const selectedPipeline = standardPipeline || pipelines[0]
      form.setValue(pipelineFieldName, selectedPipeline.value)
    }
  }, [pipelines.length, pipelineValue, form, pipelineFieldName])

  // Handle pipeline changes: load stages for new pipeline
  useEffect(() => {
    const currentPipeline = pipelineValue

    if (currentPipeline && currentPipeline !== previousPipelineRef.current && onPipelineChange) {
      onPipelineChange(currentPipeline)
    }

    // Update the ref to track current pipeline
    previousPipelineRef.current = currentPipeline
  }, [pipelineValue, onPipelineChange])

  // When stages are loaded, ALWAYS set first stage as selected (if no stage is selected)
  useEffect(() => {
    if (pipelineValue && stages.length > 0 && !stageValue) {
      const firstStage = stages[0]
      form.setValue(stageFieldName, firstStage.value)
    }
  }, [pipelineValue, stages.length, stageValue, form, stageFieldName])

  // Helper: Get placeholder text for stage select based on pipeline selection state
  const getStagePlaceholder = (): string => {
    if (!pipelineValue) {
      return t('opportunity-stage-select-pipeline-first') || 'Select Pipeline First...'
    }
    if (!stages.length && !stagesLoading) {
      return t('opportunity-stage-no-stages-available') || 'No Stages Available'
    }
    return t('opportunity-stage-placeholder') || 'Please select stage...'
  }

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
                <Select
                  value={field.value || ''}
                  onValueChange={value => {
                    field.onChange(value)
                    // Clear stage when pipeline changes
                    form.setValue(stageFieldName, '')
                  }}
                  data-testid="opportunity-segment-pipeline-select"
                >
                  <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                    <SelectValue placeholder={t('opportunity-pipeline-placeholder') || 'Please select pipeline...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map(pipeline => (
                      <SelectItem key={pipeline.id} value={pipeline.value}>
                        {pipeline.label || pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onOpenChange={() => {
                    if (pipelineValue && onPipelineChange) {
                      onPipelineChange(pipelineValue)
                    }
                  }}
                  disabled={!pipelineValue || stagesLoading}
                  data-testid="opportunity-segment-stage-select"
                >
                  <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                    <SelectValue placeholder={getStagePlaceholder()} />
                  </SelectTrigger>
                  <SelectContent
                    className="gba:max-h-[200px] gba:overflow-y-auto"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {stages.length === 0 && !stagesLoading ? (
                      <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                        {!pipelineValue
                          ? t('opportunity-stage-select-pipeline-first') || 'Please select a pipeline first'
                          : t('opportunity-stage-no-stages-for-pipeline') || 'No stages available for this pipeline'}
                      </div>
                    ) : (
                      stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.value}>
                          {stage.label || stage.name}
                        </SelectItem>
                      ))
                    )}
                    {stagesLoading && (
                      <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-600 gba:text-center">
                        {t('opportunity-stage-loading') || 'Loading stages...'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Opportunity Status (CRM only) */}
      {opportunityStatuses.length > 0 && (
        <FormField
          control={form.control}
          name={opportunityStatusFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('opportunity-status-label') || 'Opportunity Status'}</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid="opportunity-segment-status-select"
                >
                  <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                    <SelectValue placeholder={t('opportunity-status-placeholder') || 'Please Select...'} />
                  </SelectTrigger>
                  <SelectContent
                    className="gba:max-h-[200px] gba:overflow-y-auto"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {opportunityStatuses.map(option => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
