import React, { useMemo, useState } from 'react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { DesignerMode } from '../../types/studioTypes'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { StepKindPicker } from './StepKindPicker'
import { StepKindSwitchConfirmDialog } from './StepKindSwitchConfirmDialog'
import { resolveStepKindFromStudioNode } from './resolveStepKind'
import type { StepKindId, StepKindPickerMode } from './stepKindTypes'
import type { StepKindOption } from './stepKindOptions'
import { getStepKindSwitchConfirmLevel } from './stepKindSwitchImpact'

interface StepKindPanelProps {
  designerMode: DesignerMode
  pickerMode: StepKindPickerMode
  edgeId?: string
  nodeId?: string
  studioData?: FlowStudioData
  'data-testid'?: string
}

interface PendingStepKindSwitch {
  kindId: StepKindId
  level: 'soft' | 'destructive'
}

export const StepKindPanel: React.FC<StepKindPanelProps> = ({
  designerMode,
  pickerMode,
  edgeId,
  nodeId,
  studioData,
  'data-testid': testId = 'flow-studio-step-kind-panel'
}) => {
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const insertNodeOnEdgeByKind = useFlowStudioStore(s => s.insertNodeOnEdgeByKind)
  const changeNodeStepKind = useFlowStudioStore(s => s.changeNodeStepKind)
  const closeChangeStepKind = useFlowStudioStore(s => s.closeChangeStepKind)
  const [pendingSwitch, setPendingSwitch] = useState<PendingStepKindSwitch | null>(null)

  const selectedId = useMemo(() => {
    if (pickerMode !== 'change' || !nodeId || !studioData) return undefined
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return undefined
    return resolveStepKindFromStudioNode(node, studioData.functions)
  }, [nodeId, nodes, pickerMode, studioData])

  if (pickerMode === 'insert') {
    const edge = edges.find(e => e.id === edgeId)
    if (!edge) return null
  }

  if (pickerMode === 'change' && !nodeId) return null

  const applyStepKindSwitch = (kindId: StepKindId) => {
    if (pickerMode === 'insert' && edgeId) {
      insertNodeOnEdgeByKind(edgeId, kindId)
      return
    }
    if (pickerMode === 'change' && nodeId) {
      changeNodeStepKind(nodeId, kindId)
    }
  }

  const handleSelect = (opt: StepKindOption) => {
    if (pickerMode === 'insert') {
      applyStepKindSwitch(opt.id)
      return
    }

    if (opt.id === selectedId) {
      closeChangeStepKind()
      return
    }

    const level = getStepKindSwitchConfirmLevel(selectedId, opt.id)
    if (level === 'none') return

    setPendingSwitch({ kindId: opt.id, level })
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background gba:px-5 gba:py-4" data-testid={testId}>
        <StepKindPicker
          designerMode={designerMode}
          pickerMode={pickerMode}
          selectedId={selectedId}
          onSelect={handleSelect}
          data-testid={`${testId}-picker`}
        />
      </div>

      <StepKindSwitchConfirmDialog
        open={pendingSwitch != null}
        level={pendingSwitch?.level ?? 'none'}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          if (!pendingSwitch) return
          applyStepKindSwitch(pendingSwitch.kindId)
          setPendingSwitch(null)
        }}
        data-testid={`${testId}-confirm`}
      />
    </>
  )
}
