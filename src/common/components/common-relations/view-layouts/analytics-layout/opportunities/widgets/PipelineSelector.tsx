import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { Pipeline } from './types'

export interface PipelineSelectorProps {
  pipelines: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
  dataTestId?: string
}

export const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  dataTestId = 'pipeline-selector'
}) => {
  // Use first pipeline as default if no selection
  const effectivePipelineId = selectedPipelineId || (pipelines.length > 0 ? pipelines[0].id : undefined)

  const handlePipelineChange = (value: string) => {
    onPipelineChange?.(value)
  }

  if (pipelines.length === 0 || !onPipelineChange) {
    return null
  }

  return (
    <div className="gba:min-w-48">
      <Select value={effectivePipelineId} onValueChange={handlePipelineChange}>
        <SelectTrigger data-testid={dataTestId}>
          <SelectValue placeholder="Select pipeline" />
        </SelectTrigger>
        <SelectContent>
          {pipelines.map(pipeline => (
            <SelectItem key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
