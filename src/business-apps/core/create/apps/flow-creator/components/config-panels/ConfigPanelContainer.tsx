/**
 * ConfigPanelContainer - Renders the correct config panel based on selected node type.
 * Slides in from the right when a node is selected, disappears when deselected.
 */

import React, { useRef } from 'react'
import { X } from 'lucide-react'
import { useRightPanelExiting } from '@/common/components/flow'
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

const DEFAULT_PANEL_WIDTH = 520

interface ConfigPanelContainerProps {
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  /** Panel width in px; consumer-defined. Default 520. */
  width?: number
  'data-testid'?: string
}

export const ConfigPanelContainer: React.FC<ConfigPanelContainerProps> = ({
  mode,
  accessToken,
  studioData,
  width = DEFAULT_PANEL_WIDTH,
  'data-testid': testId = 'flow-studio-config-panel'
}) => {
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const selectedEdgePanel = useFlowStudioStore(s => s.selectedEdgePanel)
  const nodes = useFlowStudioStore(s => s.nodes)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
  const isExiting = useRightPanelExiting()
  const lastContentRef = useRef<React.ReactNode>(null)

  const hasSelection = !!selectedNode || !!selectedEdgeId
  if (!hasSelection && !isExiting) return null
  if (!hasSelection && isExiting && lastContentRef.current != null) {
    return lastContentRef.current
  }

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

  const content = (
    <div
      className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:border-l gba:border-border gba:shadow-sm"
      style={{ width, minWidth: width }}
      data-testid={testId}
    >
      <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
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

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">{renderPanel()}</div>
    </div>
  )
  lastContentRef.current = content
  return content
}
