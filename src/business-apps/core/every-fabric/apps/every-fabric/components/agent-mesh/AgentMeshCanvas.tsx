import { useCallback, useEffect, useMemo, useState } from 'react'
import { CubeIcon, SlidersHorizontalIcon, SquareIcon } from '@phosphor-icons/react'
import type { MeshEdge, MeshNode, TraceModel } from '../../utils/traceModel'
import type { AggregateNode } from '../../utils/meshAggregateModel'
import { ALL_LAYERS, type MeshLayerKey, MESH_LAYERS } from './meshLayers'
import { Mesh3DGraph } from './Mesh3DGraph'
import { MeshEdgeDetailModal } from './MeshEdgeDetailModal'
import { MeshGraph } from './MeshGraph'
import { MeshLayersToggle } from './MeshLayersToggle'
import { MeshNodeDetailPopover } from './MeshNodeDetailPopover'

// Direct import (not React.lazy) — the remote-component-loader used to mount
// screens does not resolve split chunks, see `components/artifacts/renderers/index.ts`.

type MeshViewMode = '2d' | '3d'
const VIEW_MODE_STORAGE_KEY = 'every-fabric.mesh.viewMode'

function readInitialViewMode(): MeshViewMode {
  if (globalThis.window === undefined) return '2d'
  try {
    const stored = globalThis.window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return stored === '3d' ? '3d' : '2d'
  } catch {
    return '2d'
  }
}

interface AgentMeshCanvasProps {
  model: TraceModel
  positionMs: number
  durationMs: number
  isLive: boolean
  /** Edge-to-edge mode: no border / rounded corners, used inside fullscreen. */
  dense?: boolean
  onDrillToUser?: (userId: string) => void
  onDrillToSession?: (sessionId: string) => void
}

export const AgentMeshCanvas: React.FC<AgentMeshCanvasProps> = ({
  model,
  positionMs,
  durationMs,
  isLive,
  dense = false,
  onDrillToUser,
  onDrillToSession
}) => {
  const [activeLayers, setActiveLayers] = useState<Set<MeshLayerKey>>(() => new Set(ALL_LAYERS))
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true)
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<MeshViewMode>(() => readInitialViewMode())

  useEffect(() => {
    if (globalThis.window === undefined) return
    try {
      globalThis.window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    } catch {
      // Storage may be blocked (private mode, embedded contexts); fall back silently.
    }
  }, [viewMode])

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => (prev === '3d' ? '2d' : '3d'))
  }, [])

  const toggleLayer = useCallback((layer: MeshLayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const toggleLabels = useCallback(() => setShowEdgeLabels(prev => !prev), [])

  const countsByLayer = useMemo<Record<MeshLayerKey, number>>(() => {
    const result: Record<MeshLayerKey, number> = { agents: 0, skills: 0, tools: 0 }
    for (const node of model.nodes) {
      for (const layer of MESH_LAYERS) {
        if (layer.kinds.includes(node.kind)) {
          result[layer.key] += 1
          break
        }
      }
    }
    return result
  }, [model.nodes])

  const selectedNode = useMemo<MeshNode | null>(
    () => (selectedNodeId ? (model.nodes.find(n => n.id === selectedNodeId) ?? null) : null),
    [model.nodes, selectedNodeId]
  )

  const inboundEdges = useMemo<MeshEdge[]>(
    () => (selectedNode ? model.edges.filter(e => e.target === selectedNode.id) : []),
    [model.edges, selectedNode]
  )

  const outboundEdges = useMemo<MeshEdge[]>(
    () => (selectedNode ? model.edges.filter(e => e.source === selectedNode.id) : []),
    [model.edges, selectedNode]
  )

  const selectedNodeSkills = useMemo(() => {
    if (!selectedNode) return []
    const skillEdges = model.edges.filter(e => e.source === selectedNode.id && e.kind === 'skill_load')
    return skillEdges.map(edge => {
      const skillNode = model.nodes.find(n => n.id === edge.target)
      return {
        nodeId: edge.target,
        name: skillNode?.label ?? edge.label ?? edge.target,
        category: skillNode?.metadata?.category as string | undefined,
        description: skillNode?.description,
        wasAutoDetected: skillNode?.metadata?.was_auto_detected === true
      }
    })
  }, [model.edges, model.nodes, selectedNode])

  const selectedEdge = useMemo<MeshEdge | null>(
    () => (selectedEdgeId ? (model.edges.find(e => e.id === selectedEdgeId) ?? null) : null),
    [model.edges, selectedEdgeId]
  )

  const selectedEdgeEndpoints = useMemo(() => {
    if (!selectedEdge) return { source: undefined, target: undefined }
    return {
      source: model.nodes.find(n => n.id === selectedEdge.source),
      target: model.nodes.find(n => n.id === selectedEdge.target)
    }
  }, [model.nodes, selectedEdge])

  const selectedEdgeCallInfo = useMemo(() => {
    if (!selectedEdge) return { index: 0, total: 0 }
    const pairKey = [selectedEdge.source, selectedEdge.target].sort((a, b) => a.localeCompare(b)).join('::')
    const peers = model.edges
      .filter(e => e.kind !== 'completion')
      .filter(e => [e.source, e.target].sort((a, b) => a.localeCompare(b)).join('::') === pairKey)
      .sort((a, b) => a.seq - b.seq)
    const index = peers.findIndex(e => e.id === selectedEdge.id)
    return { index: index + 1, total: peers.length }
  }, [model.edges, selectedEdge])

  const sessionTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of model.nodes) {
      const sessions = (node as AggregateNode).sessions
      if (!sessions) continue
      for (const s of sessions) {
        if (s.sessionId && s.title && !map.has(s.sessionId)) {
          map.set(s.sessionId, s.title)
        }
      }
    }
    return map
  }, [model.nodes])

  const handleSelectEdge = useCallback((edgeId: string) => setSelectedEdgeId(edgeId), [])
  const handleCloseEdge = useCallback(() => setSelectedEdgeId(null), [])

  const wrapperClass = dense ? 'gba:relative gba:h-full gba:w-full gba:min-h-0' : 'gba:relative gba:min-h-[360px]'

  const fallback2D = (
    <MeshGraph
      model={model}
      activeLayers={activeLayers}
      positionMs={positionMs}
      durationMs={isLive ? 0 : durationMs}
      selectedNodeId={selectedNodeId}
      showEdgeLabels={showEdgeLabels}
      hoveredNodeId={hoveredNodeId}
      dense={dense}
      onSelectNode={setSelectedNodeId}
      onSelectEdge={handleSelectEdge}
      onHoverNode={setHoveredNodeId}
      onPaneClick={handleCloseEdge}
    />
  )

  return (
    <div className={wrapperClass}>
      {viewMode === '3d' ? (
        <Mesh3DGraph
          model={model}
          activeLayers={activeLayers}
          positionMs={positionMs}
          durationMs={isLive ? 0 : durationMs}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          dense={dense}
          onSelectNode={setSelectedNodeId}
          onSelectEdge={handleSelectEdge}
          onHoverNode={setHoveredNodeId}
          onPaneClick={handleCloseEdge}
          fallback={fallback2D}
        />
      ) : (
        fallback2D
      )}
      <div className="gba:absolute gba:top-3 gba:right-3 gba:z-10 gba:flex gba:flex-col gba:items-end gba:gap-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <button
            type="button"
            onClick={toggleViewMode}
            aria-label={viewMode === '3d' ? 'Switch to 2D view' : 'Switch to 3D view'}
            aria-pressed={viewMode === '3d'}
            title={viewMode === '3d' ? 'Switch to 2D view' : 'Switch to 3D view'}
            className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:border gba:border-border/60 gba:shadow-sm gba:transition-colors ${
              viewMode === '3d'
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:bg-card/95 gba:backdrop-blur gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60'
            }`}
            data-testid="mesh-view-mode-toggle"
          >
            {viewMode === '3d' ? (
              <CubeIcon className="gba:h-4 gba:w-4" weight="bold" />
            ) : (
              <SquareIcon className="gba:h-4 gba:w-4" weight="bold" />
            )}
          </button>
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
        </div>
        {showLayersPanel && (
          <MeshLayersToggle
            activeLayers={activeLayers}
            countsByLayer={countsByLayer}
            showLabels={showEdgeLabels}
            onToggleLayer={toggleLayer}
            onToggleLabels={toggleLabels}
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
