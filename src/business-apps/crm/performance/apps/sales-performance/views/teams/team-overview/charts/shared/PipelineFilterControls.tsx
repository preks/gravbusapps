import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { FunnelIcon } from '@phosphor-icons/react'
import type { Pipeline } from '../../../../../hooks/usePipelines'

interface PipelineFilterControlsProps {
  pipelines: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string) => void
  isLoading?: boolean
  testIdPrefix: string
  includeAllOption?: boolean
}

export const PipelineFilterControls: React.FC<PipelineFilterControlsProps> = ({
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  isLoading = false,
  testIdPrefix,
  includeAllOption = false
}) => {
  if (pipelines.length === 0) {
    return null
  }

  const selectValue = includeAllOption ? selectedPipelineId || 'all' : selectedPipelineId || pipelines[0]?.id

  return (
    <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
      <FunnelIcon size={16} className="gba:shrink-0 gba:text-muted-foreground" />
      <Select value={selectValue} onValueChange={onPipelineChange} disabled={isLoading}>
        <SelectTrigger className="gba:w-36" data-testid={`${testIdPrefix}-pipeline-selector`}>
          <SelectValue placeholder="Pipeline" />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption ? (
            <SelectItem value="all" data-testid={`${testIdPrefix}-pipeline-all`}>
              All
            </SelectItem>
          ) : null}
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
