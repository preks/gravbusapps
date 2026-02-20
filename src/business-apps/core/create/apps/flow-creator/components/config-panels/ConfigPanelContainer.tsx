/**
 * ConfigPanelContainer - Renders the correct config panel based on selected node type.
 * Slides in from the right when a node is selected, disappears when deselected.
 */

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { StartConfigPanel } from './StartConfigPanel'
import { TaskConfigPanel } from './TaskConfigPanel'
import { DecisionConfigPanel } from './DecisionConfigPanel'
import { ForkConfigPanel, JoinConfigPanel } from './ForkJoinConfigPanel'
import { EndConfigPanel } from './EndConfigPanel'
import { EdgeDetailsPanel } from './EdgeDetailsPanel'
import { AddStepPanel } from './AddStepPanel'
import type {
  DesignerMode,
  StartNodeConfig,
  TaskNodeConfig,
  DecisionNodeConfig,
  EndNodeConfig,
  ForkNodeConfig,
  JoinNodeConfig
} from '../../types/studioTypes'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'

interface ConfigPanelContainerProps {
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  'data-testid'?: string
}

export const ConfigPanelContainer: React.FC<ConfigPanelContainerProps> = ({
  mode,
  accessToken,
  studioData,
  'data-testid': testId = 'flow-studio-config-panel'
}) => {
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const selectedEdgePanel = useFlowStudioStore(s => s.selectedEdgePanel)
  const nodes = useFlowStudioStore(s => s.nodes)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  if (!selectedNode && !selectedEdgeId) return null

  const renderPanel = () => {
    if (!selectedNode) {
      if (!selectedEdgeId) return null
      return selectedEdgePanel === 'insert' ? (
        <AddStepPanel edgeId={selectedEdgeId} mode={mode} />
      ) : (
        <EdgeDetailsPanel edgeId={selectedEdgeId} mode={mode} />
      )
    }
    const config = selectedNode.config

    switch (config.nodeType) {
      case 'start':
        return <StartConfigPanel nodeId={selectedNode.id} config={config as StartNodeConfig} mode={mode} />
      case 'task':
        return (
          <TaskConfigPanel
            nodeId={selectedNode.id}
            config={config as TaskNodeConfig}
            mode={mode}
            accessToken={accessToken}
            studioData={studioData}
          />
        )
      case 'end':
        return <EndConfigPanel nodeId={selectedNode.id} config={config as EndNodeConfig} mode={mode} />
      case 'decision':
        return (
          <DecisionConfigPanel
            nodeId={selectedNode.id}
            config={config as DecisionNodeConfig}
            mode={mode}
            accessToken={accessToken}
            studioData={studioData}
          />
        )
      case 'fork':
        return <ForkConfigPanel nodeId={selectedNode.id} config={config as ForkNodeConfig} mode={mode} />
      case 'join':
        return <JoinConfigPanel nodeId={selectedNode.id} config={config as JoinNodeConfig} mode={mode} />
      default:
        return null
    }
  }

  return (
    <div
      className="gba:w-[520px] gba:min-w-[520px] gba:h-full gba:border-l gba:border-border gba:bg-background gba:flex gba:flex-col gba:animate-in gba:slide-in-from-right gba:shadow-sm"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border gba:bg-background">
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">
          {selectedNode?.label ?? (selectedEdgePanel === 'insert' ? 'Add step' : 'Edge')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            selectNode(null)
            selectEdge(null)
          }}
          data-testid={`${testId}-close`}
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-hidden gba:bg-background">{renderPanel()}</div>
    </div>
  )
}
