import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { Link2 } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { DesignerMode } from '../../types/studioTypes'
import { StepKindPicker } from '../step-picker/StepKindPicker'

interface EdgeConfigPanelProps {
  edgeId: string
  mode: DesignerMode
  'data-testid'?: string
}

export const EdgeConfigPanel: React.FC<EdgeConfigPanelProps> = ({
  edgeId,
  mode,
  'data-testid': testId = 'flow-studio-edge-config'
}) => {
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const insertNodeOnEdgeByKind = useFlowStudioStore(s => s.insertNodeOnEdgeByKind)
  const edge = edges.find(item => item.id === edgeId)
  if (!edge) return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-info-secondary">
            <Link2 className="gba:h-4 gba:w-4 gba:text-info-secondary-foreground" />
          </div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Edge</h3>
        </div>

        <Input
          value={edge.label ?? ''}
          onChange={event => updateEdge(edge.id, { label: event.target.value })}
          placeholder="Branch label (optional)"
          className="gba:w-52 gba:h-8 gba:text-xs gba:bg-muted"
          aria-label="Branch label"
          data-testid={`${testId}-label`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:pb-5" data-testid={`${testId}-insert-panel`}>
        <p className="gba:text-xs gba:text-muted-foreground">Choose what happens next on this path.</p>
        <StepKindPicker
          designerMode={mode}
          pickerMode="insert"
          onSelect={opt => insertNodeOnEdgeByKind(edge.id, opt.id)}
          data-testid={`${testId}-kind-picker`}
        />
      </div>
    </div>
  )
}
