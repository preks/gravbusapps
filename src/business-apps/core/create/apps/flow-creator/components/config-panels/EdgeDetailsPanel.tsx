import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
interface EdgeDetailsPanelProps {
  edgeId: string
  'data-testid'?: string
}

export const EdgeDetailsPanel: React.FC<EdgeDetailsPanelProps> = ({
  edgeId,
  'data-testid': testId = 'flow-studio-edge-details'
}) => {
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const edge = edges.find(item => item.id === edgeId)
  if (!edge) return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background gba:px-5 gba:py-4" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Branch label</Label>
        <Input
          value={edge.label ?? ''}
          onChange={event => updateEdge(edge.id, { label: event.target.value })}
          placeholder="Branch label (optional)"
          className="gba:h-9 gba:text-xs gba:bg-muted"
          aria-label="Branch label"
          data-testid={`${testId}-label`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          Use a short label to explain why this path exists (e.g. “Approve”, “Reject”).
        </p>
      </div>
    </div>
  )
}
