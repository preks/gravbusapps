import React, { useEffect, useRef } from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'

const prefixDataTestId = 'OpportunityForm'

/**
 * Helper: Get placeholder text for stage select based on pipeline selection state
 */
const getStagePlaceholder = (hasPipeline: boolean, hasStages: boolean): string => {
  if (!hasPipeline) {
    return 'Select Pipeline First...'
  }
  if (!hasStages) {
    return 'No Stages Available'
  }
  return 'Please select stage...'
}

const PipelineStageSection: React.FC = () => {
  const { formValues, setFormValues, pipelines, salesPipelineStages, opportunityStatuses, refetchStages } =
    useOpportunityFormContext()

  // Ref to track previous pipeline to detect changes
  const previousPipelineRef = useRef<string>(formValues.pipeline)

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
    if (formValues.pipeline && salesPipelineStages.length > 0) {
      const firstStage = salesPipelineStages[0]
      setFormValues({ salesPipelineStage: firstStage.value })
    }
  }, [formValues.pipeline, salesPipelineStages.length, setFormValues])

  return (
    <div className="gba:space-y-6">
      {/* Pipeline and Stage - Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Pipeline */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            Pipeline <span className="gba:text-red-500">*</span>
          </Label>
          <Select
            value={formValues.pipeline || ''}
            onValueChange={value => setFormValues({ pipeline: value })}
            data-testid={formatDataTestId(prefixDataTestId, 'pipeline-select')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue placeholder="Please select pipeline..." />
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
            Sales Pipeline Stage <span className="gba:text-red-500">*</span>
          </Label>
          <Select
            value={formValues.salesPipelineStage || ''}
            onValueChange={value => setFormValues({ salesPipelineStage: value })}
            onOpenChange={() => {
              if (formValues.pipeline && refetchStages) {
                refetchStages(formValues.pipeline)
              }
            }}
            disabled={!formValues.pipeline}
            data-testid={formatDataTestId(prefixDataTestId, 'sales-pipeline-stage-select')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue
                placeholder={getStagePlaceholder(Boolean(formValues.pipeline), salesPipelineStages.length > 0)}
              />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {salesPipelineStages.length === 0 ? (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                  {formValues.pipeline ? 'No stages available for this pipeline' : 'Please select a pipeline first'}
                </div>
              ) : (
                salesPipelineStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.value}>
                    {stage.label || stage.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Opportunity Status */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">Opportunity Status</Label>
        <Select
          value={formValues.opportunityStatus || ''}
          onValueChange={value => setFormValues({ opportunityStatus: value })}
          data-testid={formatDataTestId(prefixDataTestId, 'opportunity-status-select')}
        >
          <SelectTrigger className="gba:border-gray-300 gba:bg-white">
            <SelectValue placeholder="Please Select..." />
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
      </div>
    </div>
  )
}

export default PipelineStageSection
