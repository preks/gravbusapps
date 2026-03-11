/**
 * AddAgentToMeshModal - Pick an existing agent from the registry to add to the mesh.
 * Excludes agents already in the preview (built + added). On select, saves layout and notifies parent.
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { useAgentMeshClient } from '@/business-apps/platform/apps/agent-mesh/hooks/useAgentMeshClient'
import type { AgentRegistryEntry } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'

const NODE_OFFSET_X = 280

export interface AddAgentToMeshModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  /** Agent IDs already in the mesh (built + added). These are excluded from the list. */
  excludeAgentIds: string[]
  /** Called after the agent was added to the mesh layout and should appear in the preview. */
  onAdded: (agentId: string) => void
  'data-testid'?: string
}

export const AddAgentToMeshModal: React.FC<AddAgentToMeshModalProps> = ({
  open,
  onOpenChange,
  accessToken,
  excludeAgentIds,
  onAdded,
  'data-testid': testId = 'add-agent-to-mesh-modal'
}) => {
  const api = useAgentMeshClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const loadRegistry = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const registry = await api.getAgentRegistry({})
      const exclude = new Set(excludeAgentIds)
      const available = registry.filter((a: AgentRegistryEntry) => !exclude.has(a.id))
      setAgents(available)
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [api, excludeAgentIds.join(',')])

  useEffect(() => {
    if (open) loadRegistry()
  }, [open, loadRegistry])

  const handleSelect = useCallback(
    async (agentId: string) => {
      setAddingId(agentId)
      try {
        const layout = await api.getMeshLayout()
        const positions = layout?.positions ?? []
        if (positions.some((p: { agent_id: string }) => p.agent_id === agentId)) {
          onAdded(agentId)
          onOpenChange(false)
          return
        }
        const maxX = positions.reduce((max: number, p: { x: number }) => Math.max(max, p.x), 0)
        const newPositions = [...positions, { agent_id: agentId, x: maxX + NODE_OFFSET_X, y: 100 }]
        await api.saveMeshLayout(newPositions)
        onAdded(agentId)
        onOpenChange(false)
      } catch (err) {
        setError((err as Error)?.message ?? 'Failed to add agent to mesh')
      } finally {
        setAddingId(null)
      }
    },
    [api, onAdded, onOpenChange]
  )

  function renderModalContent() {
    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Spinner />
        </div>
      )
    }
    if (error) {
      return <p className="gba:text-sm gba:text-destructive">{error}</p>
    }
    if (agents.length === 0) {
      return (
        <p className="gba:text-sm gba:text-muted-foreground">
          No other agents in the registry. Create a new Task Expert to add more.
        </p>
      )
    }
    return (
      <ul className="gba:space-y-1 gba:max-h-[280px] gba:overflow-y-auto">
        {agents.map(a => (
          <li key={a.id}>
            <Button
              variant="ghost"
              size="sm"
              className="gba:w-full gba:justify-start gba:normal-case"
              onClick={() => handleSelect(a.id)}
              disabled={addingId !== null}
              data-testid={`${testId}-agent-${a.id}`}
            >
              {addingId === a.id ? <Spinner className="gba:mr-2 gba:h-3 gba:w-3" /> : null}
              <span className="gba:truncate">{a.name || a.id}</span>
            </Button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>Add agent to mesh</DialogTitle>
          <DialogDescription>
            Choose an agent from the registry to add to this mesh. It will appear in the graph.
          </DialogDescription>
        </DialogHeader>
        <div className="gba:mt-4 gba:min-h-[200px]">{renderModalContent()}</div>
      </DialogContent>
    </Dialog>
  )
}
