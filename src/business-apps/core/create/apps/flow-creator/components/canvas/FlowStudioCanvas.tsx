import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DesignerMode } from '../../types/studioTypes'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { CanvasToolbar } from './CanvasToolbar'
import { ConfigPanelContainer } from '../config-panels/ConfigPanelContainer'
import { useFlowValidation } from '../../hooks/useFlowValidation'
import { useFlowStudioData } from '../../hooks/useFlowStudioData'
import { FlowCanvasProvider, FlowCanvas } from '@/common/components/flow'
import type { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { FunctionVersionMeta } from '@/common/network/functions/FunctionsServiceClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface FlowStudioCanvasProps extends BusinessAppContextProps {
  mode: DesignerMode
  onModeChange?: (mode: DesignerMode) => void
  onSave?: () => Promise<void> | void
  showValidationIssues?: boolean
  'data-testid'?: string
}

export const FlowStudioCanvas: React.FC<FlowStudioCanvasProps> = ({
  accessToken,
  mode,
  onModeChange,
  onSave,
  showValidationIssues = false,
  'data-testid': testId = 'flow-studio-canvas'
}) => {
  const storeNodes = useFlowStudioStore(s => s.nodes)
  const storeEdges = useFlowStudioStore(s => s.edges)
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const addEdgeAction = useFlowStudioStore(s => s.addEdge)
  const insertNodeOnEdge = useFlowStudioStore(s => s.insertNodeOnEdge)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)
  const openEdgeDetails = useFlowStudioStore(s => s.openEdgeDetails)
  const openEdgeInsert = useFlowStudioStore(s => s.openEdgeInsert)
  const toGraphDefinition = useFlowStudioStore(s => s.toGraphDefinition)
  const studioData = useFlowStudioData(accessToken)
  const { issues, errors, warnings } = useFlowValidation()
  const prevContentKeyRef = useRef<string>('')
  const prevDefinitionRef = useRef<ReturnType<typeof toGraphDefinition>>({
    nodes: [],
    edges: []
  })
  const functionVersionsCacheRef = useRef<Map<string, FunctionVersionMeta[]>>(new Map())
  const agentVersionsCacheRef = useRef<Map<string, PromptODM[]>>(new Map())

  const definition = useMemo(() => {
    const next = toGraphDefinition()
    const contentKey = JSON.stringify({
      nodes: next.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, metadata: n.metadata })),
      edges: next.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        direction: e.direction,
        label: e.label,
        metadata: e.metadata
      }))
    })
    if (contentKey === prevContentKeyRef.current) {
      return prevDefinitionRef.current
    }
    prevContentKeyRef.current = contentKey
    prevDefinitionRef.current = next
    return next
  }, [toGraphDefinition, storeNodes, storeEdges])

  useEffect(() => {
    let cancelled = false

    const schemasEqual = (left: unknown, right: unknown): boolean =>
      JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

    const run = async () => {
      const functionsById = new Map(studioData.functions.map(fn => [fn.id, fn]))
      const agentsById = new Map(
        studioData.agents.map(agent => [String(agent._id || '').trim(), agent] as const).filter(([id]) => Boolean(id))
      )

      const functionNodesNeedingVersions = storeNodes.filter(node => {
        if (node.type !== 'task' || node.config.nodeType !== 'task') return false
        if (node.config.stepType !== 'FUNCTION') return false
        const functionId = String(node.config.functionConfig?.functionId || '').trim()
        if (!functionId) return false
        const version = Number(node.config.functionConfig?.version)
        if (!Number.isFinite(version)) return false
        const latest = functionsById.get(functionId)?.latestVersion?.version
        return latest !== version && !functionVersionsCacheRef.current.has(functionId)
      })

      const uniqueFunctionIds = Array.from(
        new Set(
          functionNodesNeedingVersions
            .map(node => String(node.config.functionConfig?.functionId || '').trim())
            .filter(Boolean)
        )
      )
      const taskExpertNodesNeedingVersions = storeNodes.filter(node => {
        if (node.type !== 'task' || node.config.nodeType !== 'task') return false
        if (node.config.stepType !== 'AI_TASK_EXPERT') return false
        const promptId = String(node.config.agentConfig?.promptId || '').trim()
        if (!promptId) return false
        const version = Number(node.config.agentConfig?.version)
        if (!Number.isFinite(version)) return false
        const latest = Number(agentsById.get(promptId)?.version)
        if (!Number.isFinite(latest)) return false
        return latest !== version && !agentVersionsCacheRef.current.has(promptId)
      })
      const uniquePromptIds = Array.from(
        new Set(
          taskExpertNodesNeedingVersions
            .map(node => String(node.config.agentConfig?.promptId || '').trim())
            .filter(Boolean)
        )
      )

      if (uniqueFunctionIds.length > 0) {
        await Promise.all(
          uniqueFunctionIds.map(async functionId => {
            try {
              const versions = await studioData.loadFunctionVersions(functionId)
              if (!cancelled) {
                functionVersionsCacheRef.current.set(functionId, versions)
              }
            } catch {
              if (!cancelled) {
                functionVersionsCacheRef.current.set(functionId, [])
              }
            }
          })
        )
      }
      if (uniquePromptIds.length > 0) {
        await Promise.all(
          uniquePromptIds.map(async promptId => {
            try {
              const versions = await studioData.loadAgentVersions(promptId)
              if (!cancelled) {
                agentVersionsCacheRef.current.set(promptId, versions)
              }
            } catch {
              if (!cancelled) {
                agentVersionsCacheRef.current.set(promptId, [])
              }
            }
          })
        )
      }

      if (cancelled) return

      let changed = false
      const nextNodes = storeNodes.map(node => {
        if (node.type !== 'task' || node.config.nodeType !== 'task') return node

        if (node.config.stepType === 'FUNCTION') {
          const functionId = String(node.config.functionConfig?.functionId || '').trim()
          if (!functionId) return node

          const latestFunction = functionsById.get(functionId)
          const latestVersionRaw = Number(latestFunction?.latestVersion?.version)
          const selectedVersion = Number(node.config.functionConfig?.version)
          const desiredVersion = Number.isFinite(selectedVersion)
            ? selectedVersion
            : Number.isFinite(latestVersionRaw)
              ? latestVersionRaw
              : undefined
          const desiredSchema =
            typeof desiredVersion === 'number' && latestVersionRaw !== desiredVersion
              ? functionVersionsCacheRef.current.get(functionId)?.find(version => version.version === desiredVersion)
                  ?.outputSchema
              : latestFunction?.latestVersion?.outputSchema

          if (
            node.config.functionConfig?.version === desiredVersion &&
            schemasEqual(node.config.functionConfig?.outputSchema, desiredSchema)
          ) {
            return node
          }

          changed = true
          return {
            ...node,
            config: {
              ...node.config,
              functionConfig: {
                ...node.config.functionConfig,
                version: desiredVersion,
                outputSchema: desiredSchema
              }
            }
          }
        }

        if (node.config.stepType === 'AI_TASK_EXPERT') {
          const promptId = String(node.config.agentConfig?.promptId || '').trim()
          if (!promptId) return node

          const latestPrompt = agentsById.get(promptId)
          const latestVersionRaw = Number(latestPrompt?.version)
          const selectedVersion = Number(node.config.agentConfig?.version)
          const desiredVersion = Number.isFinite(selectedVersion)
            ? selectedVersion
            : Number.isFinite(latestVersionRaw)
              ? latestVersionRaw
              : undefined
          const desiredSchema =
            typeof desiredVersion === 'number' && latestVersionRaw !== desiredVersion
              ? agentVersionsCacheRef.current.get(promptId)?.find(version => Number(version.version) === desiredVersion)
                  ?.response_schema
              : latestPrompt?.response_schema

          if (
            node.config.agentConfig?.version === desiredVersion &&
            schemasEqual(node.config.agentConfig?.outputSchema, desiredSchema)
          ) {
            return node
          }

          changed = true
          return {
            ...node,
            config: {
              ...node.config,
              agentConfig: {
                ...node.config.agentConfig,
                version: desiredVersion,
                outputSchema: desiredSchema
              }
            }
          }
        }

        return node
      })

      if (changed && !cancelled) {
        useFlowStudioStore.setState({ nodes: nextNodes })
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [
    storeNodes,
    studioData.agents,
    studioData.functions,
    studioData.loadAgentVersions,
    studioData.loadFunctionVersions
  ])

  const onConnect = useCallback(
    (connection: { source: string; target: string }) => {
      if (connection.source && connection.target) {
        addEdgeAction(connection.source, connection.target)
      }
    },
    [addEdgeAction]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      const plus = document.querySelector(`[data-testid="flow-studio-edge-add-${edge.id}"]`)
      if (plus && typeof document !== 'undefined') {
        const rect = plus.getBoundingClientRect()
        const pad = 6
        const x = event.clientX
        const y = event.clientY
        const inside = x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad
        if (inside) {
          openEdgeInsert(edge.id)
          return
        }
      }
      openEdgeDetails(edge.id)
    },
    [openEdgeDetails, openEdgeInsert]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectEdge, selectNode])

  const getEdgeActions = useCallback(
    (edgeId: string) => {
      const edge = storeEdges.find(e => e.id === edgeId)
      const dir =
        edge && String((edge as { direction?: string }).direction ?? 'forward').toLowerCase() === 'backward'
          ? 'backward'
          : 'forward'
      if (dir !== 'forward') return {}
      return {
        onOpenInsertPanel: () => openEdgeInsert(edgeId),
        onInsert: (type: 'task' | 'decision' | 'fork', taskStepType?: unknown) => {
          insertNodeOnEdge(edgeId, type, taskStepType as FlowStepType | undefined)
        }
      }
    },
    [storeEdges, openEdgeInsert, insertNodeOnEdge]
  )

  const rightPanel =
    selectedNodeId || selectedEdgeId ? (
      <ConfigPanelContainer
        mode={mode}
        accessToken={accessToken}
        studioData={studioData}
        data-testid={`${testId}-config-panel`}
      />
    ) : null
  const visibleIssues = issues.slice(0, 6)

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <CanvasToolbar onSave={onSave} mode={mode} onModeChange={onModeChange} data-testid={`${testId}-toolbar`} />
      {showValidationIssues && (errors.length > 0 || warnings.length > 0) && (
        <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:text-xs">
          <div className="gba:font-medium">
            {errors.length > 0 ? `${errors.length} errors` : 'No errors'} · {warnings.length} warnings
          </div>
          <div className="gba:mt-1.5 gba:flex gba:flex-col gba:gap-1" data-testid={`${testId}-validation-issues`}>
            {visibleIssues.map(issue => (
              <div key={issue.id} className="gba:truncate" title={issue.message}>
                {issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.message}
              </div>
            ))}
            {issues.length > visibleIssues.length ? (
              <div className="gba:text-[11px] gba:opacity-80">+ {issues.length - visibleIssues.length} more issues</div>
            ) : null}
          </div>
        </div>
      )}
      <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col" data-testid={`${testId}-surface`}>
        <FlowCanvasProvider
          isInteractive={true}
          selectedNodeId={selectedNodeId}
          onNodeSelect={selectNode}
          selectedEdgeId={selectedEdgeId}
          onEdgeSelect={selectEdge}
        >
          <FlowCanvas
            definition={definition}
            rightPanel={rightPanel}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            getEdgeActions={getEdgeActions}
            nodesConnectable={true}
            useForwardEdgesOnlyForRanking={true}
            fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
            data-testid={`${testId}-canvas`}
          />
        </FlowCanvasProvider>
      </div>
    </div>
  )
}
