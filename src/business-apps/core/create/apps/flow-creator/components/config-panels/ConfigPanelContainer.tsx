/**
 * ConfigPanelContainer - Renders the correct config panel based on selected node type.
 * Slides in from the right when a node is selected, disappears when deselected.
 */

import React, { useMemo, useRef, useState } from 'react'
import { Ban, ChevronLeft, ChevronRight, FlaskConical, RotateCcw, X } from 'lucide-react'
import { useRightPanelExiting } from '@/common/components/flow'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { StartConfigPanel } from './StartConfigPanel'
import { TaskConfigPanel } from './TaskConfigPanel'
import { DecisionConfigPanel } from './DecisionConfigPanel'
import { ForkConfigPanel, JoinConfigPanel } from './ForkJoinConfigPanel'
import { EndConfigPanel } from './EndConfigPanel'
import { EdgeDetailsPanel } from './EdgeDetailsPanel'
import { AddStepPanel } from './AddStepPanel'
import {
  getNearestDownstreamTaskCandidates,
  getNearestUpstreamTaskCandidates,
  type TaskNavigationCandidate
} from '../../utils/downstreamTaskNavigation'
import type { DesignerMode } from '../../types/studioTypes'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'

const DEFAULT_PANEL_WIDTH = 520

interface ConfigPanelContainerProps {
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  onTestStep?: (stepKey: string) => void
  readOnly?: boolean
  /** Panel width in px; consumer-defined. Default 520. */
  width?: number
  'data-testid'?: string
}

function isReadonlyNavigationTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  // Tabs are navigation inside the read-only panel, not edits. Keep them usable
  // so users can inspect General / Assignment / Form / Automation in test mode.
  return Boolean(target.closest('[role="tab"]'))
}

export const ConfigPanelContainer: React.FC<ConfigPanelContainerProps> = ({
  mode,
  accessToken,
  studioData,
  onTestStep,
  readOnly = false,
  width = DEFAULT_PANEL_WIDTH,
  'data-testid': testId = 'flow-studio-config-panel'
}) => {
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const selectedEdgePanel = useFlowStudioStore(s => s.selectedEdgePanel)
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const [navigationPicker, setNavigationPicker] = useState<'previous' | 'next' | null>(null)

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
  const previousTaskCandidates = useMemo(() => {
    if (!selectedNode || selectedNode.config.nodeType !== 'task') return []
    return getNearestUpstreamTaskCandidates(nodes, edges, selectedNode.id)
  }, [edges, nodes, selectedNode])
  const nextTaskCandidates = useMemo(() => {
    if (!selectedNode || selectedNode.config.nodeType !== 'task') return []
    return getNearestDownstreamTaskCandidates(nodes, edges, selectedNode.id)
  }, [edges, nodes, selectedNode])
  const canTestSelectedNode = Boolean(
    !readOnly &&
      selectedNode &&
      selectedNode.config.nodeType !== 'start' &&
      selectedNode.config.nodeType !== 'end' &&
      !(selectedNode.config.nodeType === 'task' && selectedNode.config.enabled === false) &&
      onTestStep
  )
  const canToggleTaskActive = Boolean(!readOnly && selectedNode?.config.nodeType === 'task')
  const selectedTaskDeactivated =
    selectedNode?.config.nodeType === 'task' ? selectedNode.config.enabled === false : false
  const isExiting = useRightPanelExiting()
  const lastContentRef = useRef<React.ReactNode>(null)

  const navigateToTask = (taskId: string) => {
    setNavigationPicker(null)
    selectEdge(null)
    selectNode(taskId)
  }

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
        <EdgeDetailsPanel edgeId={selectedEdgeId} />
      )
    }
    const config = selectedNode.config

    switch (config.nodeType) {
      case 'start':
        return (
          <StartConfigPanel
            nodeId={selectedNode.id}
            config={config}
            mode={mode}
            accessToken={accessToken}
            studioData={studioData}
          />
        )
      case 'task':
        return (
          <TaskConfigPanel
            key={selectedNode.id}
            nodeId={selectedNode.id}
            config={config}
            mode={mode}
            accessToken={accessToken}
            studioData={studioData}
          />
        )
      case 'end':
        return <EndConfigPanel nodeId={selectedNode.id} config={config} mode={mode} studioData={studioData} />
      case 'decision':
        return (
          <DecisionConfigPanel
            nodeId={selectedNode.id}
            config={config}
            mode={mode}
            accessToken={accessToken}
            studioData={studioData}
          />
        )
      case 'fork':
        return <ForkConfigPanel nodeId={selectedNode.id} />
      case 'join':
        return <JoinConfigPanel nodeId={selectedNode.id} config={config} />
      default:
        return null
    }
  }

  const renderTaskNavigationButton = (
    direction: 'previous' | 'next',
    candidates: TaskNavigationCandidate[],
    Icon: typeof ChevronLeft
  ) => {
    if (candidates.length === 0) return null

    const label = direction === 'previous' ? 'Previous task' : 'Next task'
    const isOpen = navigationPicker === direction
    const button = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (candidates.length === 1) navigateToTask(candidates[0].taskId)
        }}
        aria-label={label}
        title={label}
        data-testid={`${testId}-${direction}-task`}
      >
        <Icon className="gba:h-4 gba:w-4" />
      </Button>
    )

    if (candidates.length === 1) return button

    return (
      <Popover open={isOpen} onOpenChange={open => setNavigationPicker(open ? direction : null)}>
        <PopoverTrigger asChild>{button}</PopoverTrigger>
        <PopoverContent className="gba:w-72 gba:p-2" align="end">
          <div className="gba:mb-2 gba:px-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
            Choose {direction === 'previous' ? 'previous' : 'next'} task
          </div>
          <div className="gba:flex gba:flex-col gba:gap-1">
            {candidates.map(candidate => (
              <Button
                key={`${candidate.taskId}-${candidate.pathLabel ?? ''}`}
                type="button"
                variant="ghost"
                className="gba:h-auto gba:justify-start gba:px-2 gba:py-2 gba:text-left"
                onClick={() => navigateToTask(candidate.taskId)}
                data-testid={`${testId}-${direction}-task-option`}
              >
                <span className="gba:flex gba:min-w-0 gba:flex-col gba:items-start">
                  <span className="gba:max-w-full gba:truncate gba:text-sm gba:font-medium">{candidate.label}</span>
                  {candidate.pathLabel ? (
                    <span className="gba:max-w-full gba:truncate gba:text-xs gba:text-muted-foreground">
                      Via {candidate.pathLabel}
                    </span>
                  ) : null}
                </span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const content = (
    <div
      className="gba:relative gba:z-[60] gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:border-l gba:border-border gba:shadow-sm"
      style={{ width, minWidth: width }}
      data-testid={testId}
    >
      <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">
          {selectedNode?.label ?? (selectedEdgePanel === 'insert' ? 'Add step' : 'Edge')}
        </span>
        <div className="gba:flex gba:items-center gba:gap-2">
          {renderTaskNavigationButton('previous', previousTaskCandidates, ChevronLeft)}
          {renderTaskNavigationButton('next', nextTaskCandidates, ChevronRight)}
          {canTestSelectedNode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectedNode && onTestStep?.(selectedNode.id)}
              data-testid={`${testId}-test-step`}
            >
              <FlaskConical className="gba:h-4 gba:w-4 gba:mr-1" />
              Test step
            </Button>
          ) : null}
          {canToggleTaskActive ? (
            <Button
              type="button"
              variant={selectedTaskDeactivated ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!selectedNode || selectedNode.config.nodeType !== 'task') return
                updateNodeConfig(selectedNode.id, { enabled: selectedNode.config.enabled === false } as any)
              }}
              data-testid={`${testId}-${selectedTaskDeactivated ? 'activate' : 'deactivate'}-task`}
            >
              {selectedTaskDeactivated ? (
                <RotateCcw className="gba:h-4 gba:w-4 gba:mr-1" />
              ) : (
                <Ban className="gba:h-4 gba:w-4 gba:mr-1" />
              )}
              {selectedTaskDeactivated ? 'Activate' : 'Deactivate'}
            </Button>
          ) : null}
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
      </div>

      <div
        className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto"
        aria-readonly={readOnly || undefined}
        onClickCapture={event => {
          if (!readOnly || isReadonlyNavigationTarget(event.target)) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDownCapture={event => {
          if (!readOnly || isReadonlyNavigationTarget(event.target)) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onKeyDownCapture={event => {
          if (!readOnly || isReadonlyNavigationTarget(event.target)) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {renderPanel()}
      </div>
    </div>
  )
  lastContentRef.current = content
  return content
}
