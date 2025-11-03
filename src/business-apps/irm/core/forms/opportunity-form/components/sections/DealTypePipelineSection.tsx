import React, { useEffect, useRef } from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { DEAL_TYPES } from '../../types'

const prefixDataTestId = 'InvestmentOpportunityForm'

const DealTypePipelineSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    pipelines,
    pipelineStages,
    pipelineStagesLoading,
    refetchStages,
    isDealTypeLocked // ✅ NEW: Get lock state
  } = useOpportunityFormContext()

  // Ref to track previous pipeline to detect changes
  const previousPipelineRef = useRef<string>(formValues.pipeline)

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormValues({ [field]: value })
  }

  // Auto-select "Standard" pipeline option if not already selected, fallback to first option
  useEffect(() => {
    if (pipelines.length > 0 && !formValues.pipeline) {
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
      setFormValues({ pipeline: selectedPipeline.value })
    }
  }, [pipelines.length, formValues.pipeline, setFormValues])

  // Handle pipeline changes: load stages for new pipeline
  useEffect(() => {
    const currentPipeline = formValues.pipeline

    if (currentPipeline && refetchStages) {
      refetchStages(currentPipeline)
    }

    // Update the ref to track current pipeline
    previousPipelineRef.current = currentPipeline
  }, [formValues.pipeline, refetchStages])

  // When stages are loaded, ALWAYS set first stage as selected
  useEffect(() => {
    if (formValues.pipeline && pipelineStages.length > 0) {
      const firstStage = pipelineStages[0]
      setFormValues({ pipelineStage: firstStage.value })
    }
  }, [formValues.pipeline, pipelineStages.length, setFormValues])

  return (
    <div className="gba:space-y-6">
      {/* Deal Type - Only show when not locked */}
      {!isDealTypeLocked && (
        <div className="gba:space-y-2">
          <Label htmlFor="dealType" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('opportunity.dealType.label', 'Deal Type')}
          </Label>
          <Select
            value={formValues.dealType || ''}
            onValueChange={value => handleInputChange('dealType', value)}
            data-testid={formatDataTestId(prefixDataTestId, 'deal-type')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'opportunity.dealType.placeholder',
                  'Please select deal type...'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {DEAL_TYPES.map(dealType => (
                <SelectItem key={dealType.id} value={dealType.value}>
                  {dealType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Pipeline and Stage - Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Pipeline */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('opportunity.pipeline.label', 'Pipeline')}{' '}
            <span className="gba:text-red-500">*</span>
          </Label>
          <Select
            value={formValues.pipeline || ''}
            onValueChange={value => handleInputChange('pipeline', value)}
            data-testid={formatDataTestId(prefixDataTestId, 'pipeline')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'opportunity.pipeline.placeholder',
                  'Please select pipeline...'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(pipeline => (
                <SelectItem key={pipeline.id} value={pipeline.value}>
                  {pipeline.label || pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline Stage */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('opportunity.stage.label', 'Stage')}{' '}
            <span className="gba:text-red-500">*</span>
          </Label>
          <Select
            value={formValues.pipelineStage || ''}
            onValueChange={value => handleInputChange('pipelineStage', value)}
            onOpenChange={() => {
              if (formValues.pipeline && refetchStages) {
                refetchStages(formValues.pipeline)
              }
            }}
            disabled={!formValues.pipeline || pipelineStagesLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'pipeline-stage')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue
                placeholder={
                  !formValues.pipeline
                    ? getTranslationFromI18nKeyAndLabel(
                        'opportunity.stage.selectPipelineFirst',
                        'Select Pipeline First...'
                      )
                    : pipelineStages.length === 0 && !pipelineStagesLoading
                      ? getTranslationFromI18nKeyAndLabel('opportunity.stage.noStagesAvailable', 'No Stages Available')
                      : getTranslationFromI18nKeyAndLabel('opportunity.stage.placeholder', 'Please select stage...')
                }
              />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {pipelineStages.length === 0 && !pipelineStagesLoading ? (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                  {!formValues.pipeline
                    ? getTranslationFromI18nKeyAndLabel(
                        'opportunity.stage.selectPipelineFirst',
                        'Please select a pipeline first'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'opportunity.stage.noStagesForPipeline',
                        'No stages available for this pipeline'
                      )}
                </div>
              ) : (
                pipelineStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.value}>
                    {stage.label || stage.name}
                  </SelectItem>
                ))
              )}
              {pipelineStagesLoading && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-600 gba:text-center">
                  {getTranslationFromI18nKeyAndLabel('opportunity.stage.loading', 'Loading stages...')}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default DealTypePipelineSection
