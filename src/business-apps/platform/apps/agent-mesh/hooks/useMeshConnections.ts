import { useCallback, useMemo } from 'react'
import type { AgentRegistryEntry, Connection } from '../types/agentMesh'
import { useAgentMeshClient } from './useAgentMeshClient'
import type { MergedEdge } from '../utils/meshGraphUtils'

interface UseMeshConnectionsParams {
  accessToken: string
  agents: AgentRegistryEntry[]
  connections: Connection[]
  mergedEdges: MergedEdge[]
  editMode: boolean
  selectedEdgeId: string | null
  setSelectedEdgeId: (id: string | null) => void
  connectSource: string | null
  setConnectSource: (id: string | null) => void
  loadData: () => Promise<void>
}

export function useMeshConnections({
  accessToken,
  agents,
  connections,
  mergedEdges,
  editMode,
  selectedEdgeId,
  setSelectedEdgeId,
  connectSource,
  setConnectSource,
  loadData
}: UseMeshConnectionsParams) {
  const api = useAgentMeshClient(accessToken)

  const onConnect = useCallback(
    async (params: { source: string | null; target: string | null }) => {
      if (!params.source || !params.target || params.source === params.target) return
      const sourceAgent = agents.find(a => a.id === params.source)
      const targetAgent = agents.find(a => a.id === params.target)
      if (!sourceAgent || !targetAgent) return
      const alreadyExists = connections.some(c => c.caller_id === sourceAgent.id && c.callee_id === targetAgent.id)
      if (alreadyExists) return

      try {
        await api.createConnection({
          caller_id: sourceAgent.id,
          caller_name: sourceAgent.name,
          callee_id: targetAgent.id,
          callee_name: targetAgent.name
        })
        loadData()
      } catch (err) {
        console.error('Failed to create connection:', err)
      }
    },
    [agents, connections, api, loadData]
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      if (editMode) {
        setSelectedEdgeId(selectedEdgeId === edge.id ? null : edge.id)
      }
    },
    [editMode, selectedEdgeId, setSelectedEdgeId]
  )

  const selectedEdgeInfo = useMemo(() => {
    if (!selectedEdgeId) return null
    return mergedEdges.find(me => me.edgeId === selectedEdgeId) ?? null
  }, [selectedEdgeId, mergedEdges])

  const handleDeleteConnection = useCallback(async () => {
    if (!selectedEdgeInfo) return
    try {
      await Promise.allSettled(selectedEdgeInfo.connectionIds.map(id => api.deleteConnection(id)))
      setSelectedEdgeId(null)
      loadData()
    } catch (err) {
      console.error('Failed to delete connection:', err)
    }
  }, [selectedEdgeInfo, api, setSelectedEdgeId, loadData])

  const handleNodeClick = useCallback(
    async (_: React.MouseEvent, node: { id: string }) => {
      setSelectedEdgeId(null)
      if (!editMode) return

      if (!connectSource) {
        setConnectSource(node.id)
        return
      }

      if (connectSource === node.id) {
        setConnectSource(null)
        return
      }

      const sourceAgent = agents.find(a => a.id === connectSource)
      const targetAgent = agents.find(a => a.id === node.id)
      if (!sourceAgent || !targetAgent) {
        setConnectSource(null)
        return
      }

      const alreadyExists = connections.some(c => c.caller_id === sourceAgent.id && c.callee_id === targetAgent.id)
      if (!alreadyExists) {
        try {
          await api.createConnection({
            caller_id: sourceAgent.id,
            caller_name: sourceAgent.name,
            callee_id: targetAgent.id,
            callee_name: targetAgent.name
          })
          loadData()
        } catch (err) {
          console.error('Failed to create connection:', err)
        }
      }
      setConnectSource(null)
    },
    [editMode, connectSource, agents, connections, api, loadData, setSelectedEdgeId, setConnectSource]
  )

  return {
    onConnect,
    handleEdgeClick,
    handleNodeClick,
    selectedEdgeInfo,
    handleDeleteConnection
  }
}
