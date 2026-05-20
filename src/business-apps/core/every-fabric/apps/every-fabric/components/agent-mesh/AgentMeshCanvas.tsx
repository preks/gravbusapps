import { useCallback, useMemo, useState } from 'react'
import { SlidersHorizontalIcon } from '@phosphor-icons/react'
import type { MeshEdge, MeshNode, TraceModel } from '../../utils/traceModel'
import type { AggregateNode } from '../../utils/meshAggregateModel'
import { ALL_LAYERS, type MeshLayerKey, MESH_LAYERS } from './meshLayers'
import { MeshEdgeDetailModal } from './MeshEdgeDetailModal'
import { MeshGraph } from './MeshGraph'
import { MeshLayersToggle } from './MeshLayersToggle'
import { MeshNodeDetailPopover } from './MeshNodeDetailPopover'

function buildMergedModel(model: TraceModel): TraceModel {
  const edgesByPairKind = new Map<string, MeshEdge[]>()

  for (const edge of model.edges) {
    const key = `${edge.source}::${edge.target}::${edge.kind}`
    const group = edgesByPairKind.get(key)
    if (group) group.push(edge)
    else edgesByPairKind.set(key, [edge])
  }

  const mergedEdges: MeshEdge[] = []
  for (const [, group] of edgesByPairKind) {
    if (group.length <= 1) {
      mergedEdges.push(group[0])
      continue
    }
    const first = group[0]
    const last = group[group.length - 1]
    mergedEdges.push({
      ...first,
      id: `${first.source}::${first.target}::${first.kind}::merged`,
      label: first.label ? `${first.label} (×${group.length})` : `${first.kind} (×${group.length})`,
      timestamp: last.timestamp,
      resolvedAt: group.every(e => e.resolvedAt) ? last.resolvedAt : undefined,
      status: group.some(e => e.status === 'failed') ? 'failed' : first.status
    })
  }

  return { ...model, edges: mergedEdges }
}

interface AgentMeshCanvasProps {
  model: TraceModel
  positionMs: number
  durationMs: number
  isLive: boolean
  onDrillToUser?: (userId: string) => void
  onDrillToSession?: (sessionId: string) => void
}

export const AgentMeshCanvas: React.FC<AgentMeshCanvasProps> = ({
  model,
  positionMs,
  durationMs,
  isLive,
  onDrillToUser,
  onDrillToSession
}) => {
  const [activeLayers, setActiveLayers] = useState<Set<MeshLayerKey>>(() => new Set(ALL_LAYERS))
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true)
  const [mergeNodes, setMergeNodes] = useState<boolean>(false)
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const toggleLayer = useCallback((layer: MeshLayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const toggleLabels = useCallback(() => setShowEdgeLabels(prev => !prev), [])
  const toggleMerge = useCallback(() => {
    setMergeNodes(prev => !prev)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [])

  const effectiveModel = useMemo<TraceModel>(() => (mergeNodes ? buildMergedModel(model) : model), [model, mergeNodes])

  const countsByLayer = useMemo<Record<MeshLayerKey, number>>(() => {
    const result: Record<MeshLayerKey, number> = { agents: 0, experts: 0, skills: 0, tools: 0 }
    for (const node of effectiveModel.nodes) {
      for (const layer of MESH_LAYERS) {
        if (layer.kinds.includes(node.kind)) {
          result[layer.key] += 1
          break
        }
      }
    }
    return result
  }, [effectiveModel.nodes])

  const selectedNode = useMemo<MeshNode | null>(
    () => (selectedNodeId ? (effectiveModel.nodes.find(n => n.id === selectedNodeId) ?? null) : null),
    [effectiveModel.nodes, selectedNodeId]
  )

  const inboundEdges = useMemo<MeshEdge[]>(
    () => (selectedNode ? effectiveModel.edges.filter(e => e.target === selectedNode.id) : []),
    [effectiveModel.edges, selectedNode]
  )

  const outboundEdges = useMemo<MeshEdge[]>(
    () => (selectedNode ? effectiveModel.edges.filter(e => e.source === selectedNode.id) : []),
    [effectiveModel.edges, selectedNode]
  )

  const selectedNodeSkills = useMemo(() => {
    if (!selectedNode) return []
    const skillEdges = effectiveModel.edges.filter(e => e.source === selectedNode.id && e.kind === 'skill_load')
    return skillEdges.map(edge => {
      const skillNode = effectiveModel.nodes.find(n => n.id === edge.target)
      return {
        nodeId: edge.target,
        name: skillNode?.label ?? edge.label ?? edge.target,
        category: skillNode?.metadata?.category as string | undefined,
        description: skillNode?.description,
        wasAutoDetected: skillNode?.metadata?.was_auto_detected === true
      }
    })
  }, [effectiveModel.edges, effectiveModel.nodes, selectedNode])

  const selectedEdge = useMemo<MeshEdge | null>(
    () => (selectedEdgeId ? (effectiveModel.edges.find(e => e.id === selectedEdgeId) ?? null) : null),
    [effectiveModel.edges, selectedEdgeId]
  )

  const selectedEdgeEndpoints = useMemo(() => {
    if (!selectedEdge) return { source: undefined, target: undefined }
    return {
      source: effectiveModel.nodes.find(n => n.id === selectedEdge.source),
      target: effectiveModel.nodes.find(n => n.id === selectedEdge.target)
    }
  }, [effectiveModel.nodes, selectedEdge])

  const selectedEdgeCallInfo = useMemo(() => {
    if (!selectedEdge) return { index: 0, total: 0 }
    const pairKey = [selectedEdge.source, selectedEdge.target].sort((a, b) => a.localeCompare(b)).join('::')
    const peers = effectiveModel.edges
      .filter(e => e.kind !== 'completion')
      .filter(e => [e.source, e.target].sort((a, b) => a.localeCompare(b)).join('::') === pairKey)
      .sort((a, b) => a.seq - b.seq)
    const index = peers.findIndex(e => e.id === selectedEdge.id)
    return { index: index + 1, total: peers.length }
  }, [effectiveModel.edges, selectedEdge])

  const sessionTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of effectiveModel.nodes) {
      const sessions = (node as AggregateNode).sessions
      if (!sessions) continue
      for (const s of sessions) {
        if (s.sessionId && s.title && !map.has(s.sessionId)) {
          map.set(s.sessionId, s.title)
        }
      }
    }
    return map
  }, [effectiveModel.nodes])

  const handleSelectEdge = useCallback((edgeId: string) => setSelectedEdgeId(edgeId), [])
  const handleCloseEdge = useCallback(() => setSelectedEdgeId(null), [])

  return (
    <div className="gba:relative gba:min-h-[360px]">
      <MeshGraph
        model={effectiveModel}
        activeLayers={activeLayers}
        positionMs={positionMs}
        durationMs={isLive ? 0 : durationMs}
        selectedNodeId={selectedNodeId}
        showEdgeLabels={showEdgeLabels}
        hoveredNodeId={hoveredNodeId}
        onSelectNode={setSelectedNodeId}
        onSelectEdge={handleSelectEdge}
        onHoverNode={setHoveredNodeId}
        onPaneClick={handleCloseEdge}
      />
      <div className="gba:absolute gba:top-3 gba:right-3 gba:z-10 gba:flex gba:flex-col gba:items-end gba:gap-2">
        <button
          type="button"
          onClick={() => setShowLayersPanel(prev => !prev)}
          aria-label="Toggle layers panel"
          className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:border gba:border-border/60 gba:shadow-sm gba:transition-colors ${
            showLayersPanel
              ? 'gba:bg-primary gba:text-primary-foreground'
              : 'gba:bg-card/95 gba:backdrop-blur gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60'
          }`}
          data-testid="mesh-layers-toggle-btn"
        >
          <SlidersHorizontalIcon className="gba:h-4 gba:w-4" weight="bold" />
        </button>
        {showLayersPanel && (
          <MeshLayersToggle
            activeLayers={activeLayers}
            countsByLayer={countsByLayer}
            showLabels={showEdgeLabels}
            mergeNodes={mergeNodes}
            onToggleLayer={toggleLayer}
            onToggleLabels={toggleLabels}
            onToggleMerge={toggleMerge}
          />
        )}
      </div>
      {selectedNode && (
        <div className="gba:absolute gba:bottom-3 gba:left-3 gba:z-10">
          <MeshNodeDetailPopover
            node={selectedNode}
            inboundEdges={inboundEdges}
            outboundEdges={outboundEdges}
            skills={selectedNodeSkills}
            onClose={() => setSelectedNodeId(null)}
            onFocusSkill={nodeId => setSelectedNodeId(nodeId)}
            onDrillToUser={onDrillToUser}
            onDrillToSession={onDrillToSession}
          />
        </div>
      )}
      {selectedEdge && (
        <div className="gba:absolute gba:bottom-3 gba:right-3 gba:z-10">
          <MeshEdgeDetailModal
            edge={selectedEdge}
            source={selectedEdgeEndpoints.source}
            target={selectedEdgeEndpoints.target}
            callIndex={selectedEdgeCallInfo.index}
            callTotal={selectedEdgeCallInfo.total}
            sessionTitleMap={sessionTitleMap}
            onClose={handleCloseEdge}
            onDrillToSession={onDrillToSession}
          />
        </div>
      )}
    </div>
  )
}
