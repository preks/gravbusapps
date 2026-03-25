/**
 * AgentMeshPreview - Compact preview of the Agent Mesh for orchestrator-built agents.
 * Shows mesh graph (nodes = built + added agents, edges = connections).
 * Supports drag-to-reposition (saved to layout), connect agents (createConnection + refetch),
 * Add agent (from registry), and Create agent (navigate to prompt-manager).
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNodesState, type Node, type NodeChange } from '@xyflow/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { Network, ExternalLink, UserPlus, Plus } from 'lucide-react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useAgentMeshClient } from '@/business-apps/platform/apps/agent-mesh/hooks/useAgentMeshClient'
import { useMeshPreviewData } from './hooks/useMeshPreviewData'
import { MeshPreviewCanvas } from './components/MeshPreviewCanvas'
import { AddAgentToMeshModal } from './components/AddAgentToMeshModal'

const SAVE_LAYOUT_DEBOUNCE_MS = 800

export interface AgentMeshPreviewProps {
  accessToken: string
  /** Built agent IDs (createdId or existingId) from the plan. Tab is shown when at least one agent exists. */
  agentIds: string[]
  'data-testid'?: string
}

function openInAgentMesh() {
  navigateTo(buildPlatformUrl('/platform/apps/agent-mesh'))
}

function openCreateAgent() {
  navigateTo(buildPlatformUrl('/platform/create/prompt-manager'))
}

export const AgentMeshPreview: React.FC<AgentMeshPreviewProps> = ({
  accessToken,
  agentIds,
  'data-testid': testId = 'agent-mesh-preview'
}) => {
  const [addedAgentIds, setAddedAgentIds] = useState<string[]>([])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const combinedAgentIds = useMemo(() => [...agentIds, ...addedAgentIds], [agentIds, addedAgentIds])
  const {
    nodes: dataNodes,
    edges,
    agents,
    loading,
    error,
    loadData
  } = useMeshPreviewData(accessToken, combinedAgentIds)
  const api = useAgentMeshClient(accessToken)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const saveLayoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const nodeIdsKey = useMemo(
    () =>
      dataNodes
        .map(n => n.id)
        .sort((a, b) => a.localeCompare(b))
        .join(','),
    [dataNodes]
  )
  const prevNodeIdsKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (nodeIdsKey !== prevNodeIdsKeyRef.current) {
      prevNodeIdsKeyRef.current = nodeIdsKey
      setNodes(dataNodes as Node[])
    }
  }, [nodeIdsKey, dataNodes, setNodes])

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes)
      const hasPosition = (changes as Array<{ type?: string }>).some(c => c.type === 'position')
      if (!hasPosition) return
      if (saveLayoutTimeoutRef.current) clearTimeout(saveLayoutTimeoutRef.current)
      saveLayoutTimeoutRef.current = setTimeout(() => {
        saveLayoutTimeoutRef.current = null
        const current = nodesRef.current
        if (current.length > 0) {
          const positions = current.map(n => ({
            agent_id: n.id,
            x: n.position.x,
            y: n.position.y
          }))
          api.saveMeshLayout(positions).catch(() => {})
        }
      }, SAVE_LAYOUT_DEBOUNCE_MS)
    },
    [onNodesChange, api]
  )

  const handleConnect = useCallback(
    async (params: { source: string | null; target: string | null }) => {
      if (!params.source || !params.target || params.source === params.target) return
      const alreadyExists = edges.some(e => e.source === params.source && e.target === params.target)
      if (alreadyExists) return
      const sourceAgent = agents.find(a => a.id === params.source)
      const targetAgent = agents.find(a => a.id === params.target)
      if (!sourceAgent || !targetAgent) return
      try {
        await api.createConnection({
          caller_id: sourceAgent.id,
          caller_name: sourceAgent.name,
          callee_id: targetAgent.id,
          callee_name: targetAgent.name
        })
        await loadData()
      } catch (err) {
        console.error('Failed to create connection:', err)
      }
    },
    [agents, edges, api, loadData]
  )

  if (!agentIds.length && !addedAgentIds.length) {
    return (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-6" data-testid={testId}>
        <Card className="gba:max-w-md gba:w-full">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
              <Network className="gba:w-4 gba:h-4" />
              Agent Mesh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-muted-foreground">
              No agents in this build. Add existing agents from the registry or create a new Task Expert.
            </p>
            <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                data-testid={`${testId}-add-agent`}
              >
                <UserPlus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
                Add agent
              </Button>
              <Button variant="outline" size="sm" onClick={openCreateAgent} data-testid={`${testId}-create-agent`}>
                <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
                Create agent
              </Button>
              <Button variant="default" size="sm" onClick={openInAgentMesh}>
                <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
                Open Agent Mesh
              </Button>
            </div>
            <AddAgentToMeshModal
              open={addModalOpen}
              onOpenChange={setAddModalOpen}
              accessToken={accessToken}
              excludeAgentIds={addedAgentIds}
              onAdded={id => setAddedAgentIds(prev => [...prev, id])}
              data-testid={`${testId}-add-modal`}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-6" data-testid={testId}>
        <Spinner />
      </div>
    )
  }

  if (!error) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col gba:min-h-0 gba:p-4" data-testid={testId}>
        <div className="gba:shrink-0 gba:mb-3">
          <Card>
            <CardHeader className="gba:py-3 gba:px-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <Network className="gba:w-4 gba:h-4" />
                Agent Mesh
              </CardTitle>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {agents.length} agent{agents.length !== 1 ? 's' : ''} from this build. Open the full app for Steering
                Console and analytics.
              </p>
            </CardHeader>
          </Card>
        </div>
        <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:bg-card">
          <MeshPreviewCanvas
            nodes={nodes as Array<{ id: string; type: string; position: { x: number; y: number }; data: unknown }>}
            edges={edges}
            onNodesChange={changes => handleNodesChange(changes as NodeChange<Node>[])}
            onConnect={handleConnect}
            data-testid={`${testId}-graph`}
          />
        </div>
        <div className="gba:shrink-0 gba:mt-3 gba:flex gba:flex-wrap gba:gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddModalOpen(true)} data-testid={`${testId}-add-agent`}>
            <UserPlus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
            Add agent
          </Button>
          <Button variant="outline" size="sm" onClick={openCreateAgent} data-testid={`${testId}-create-agent`}>
            <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
            Create agent
          </Button>
          <Button variant="default" size="sm" onClick={openInAgentMesh}>
            <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
            Open in Agent Mesh
          </Button>
        </div>
        <AddAgentToMeshModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          accessToken={accessToken}
          excludeAgentIds={combinedAgentIds}
          onAdded={id => setAddedAgentIds(prev => [...prev, id])}
          data-testid={`${testId}-add-modal`}
        />
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:overflow-y-auto gba:p-4" data-testid={testId}>
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button variant="outline" size="sm" className="gba:mt-4" onClick={openInAgentMesh}>
        <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
        Open Agent Mesh
      </Button>
    </div>
  )
}
