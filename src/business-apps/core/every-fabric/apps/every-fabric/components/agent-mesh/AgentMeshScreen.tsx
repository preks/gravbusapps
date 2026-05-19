import { useCallback, useMemo, useState } from 'react'
import { ArrowLeftIcon, ArrowSquareOutIcon, GraphIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { useFabric } from '../../context/FabricContext'
import { useReplayClock } from '../../hooks/useReplayClock'
import { useTraceModel } from '../../hooks/useTraceModel'
import type { MeshDecision, MeshEdge, MeshNode } from '../../utils/traceModel'
import { ALL_LAYERS, type MeshLayerKey, MESH_LAYERS } from './meshLayers'
import { DecisionLogPanel } from './DecisionLogPanel'
import { MeshEdgeDetailModal } from './MeshEdgeDetailModal'
import { MeshGraph } from './MeshGraph'
import { MeshLayersToggle } from './MeshLayersToggle'
import { MeshNodeDetailPopover } from './MeshNodeDetailPopover'
import { MeshStatusPill } from './MeshStatusPill'
import { ReplayTimeline } from './ReplayTimeline'

interface AgentMeshScreenProps {
  onBack: () => void
  onOpenTraceExplorer?: (positionMs: number) => void
}

const NON_LOG_FRAME_KINDS = new Set(['decision'])

const HEADER_SUBTITLE = 'How your agents connect · replay the decision that produced a response'

export const AgentMeshScreen: React.FC<AgentMeshScreenProps> = ({ onBack, onOpenTraceExplorer }) => {
  const { session, events, isStreaming, activeSessionId } = useFabric()

  const { model, source } = useTraceModel({ liveEvents: events, session, isStreaming })
  // `merged` means both REST trace and live SSE contributed at least one
  // event — it's still a live session for replay-clock purposes. `rest` /
  // `empty` are not live (replay-only).
  const isLive = isStreaming === true && (source === 'live' || source === 'merged')

  const clock = useReplayClock({
    durationMs: model.summary.durationMs,
    isLive,
    initialSpeed: 1
  })

  const [activeLayers, setActiveLayers] = useState<Set<MeshLayerKey>>(() => new Set(ALL_LAYERS))
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true)
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

  const countsByLayer = useMemo<Record<MeshLayerKey, number>>(() => {
    const result: Record<MeshLayerKey, number> = {
      agents: 0,
      experts: 0,
      skills: 0,
      tools: 0
    }
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

  const reachableAgentCount = countsByLayer.agents + countsByLayer.experts
  const reachableToolCount = countsByLayer.tools + countsByLayer.skills

  const selectedNode = useMemo<MeshNode | null>(() => {
    if (!selectedNodeId) return null
    return model.nodes.find(n => n.id === selectedNodeId) ?? null
  }, [model.nodes, selectedNodeId])

  const inboundEdges = useMemo<MeshEdge[]>(() => {
    if (!selectedNode) return []
    return model.edges.filter(e => e.target === selectedNode.id)
  }, [model.edges, selectedNode])

  const outboundEdges = useMemo<MeshEdge[]>(() => {
    if (!selectedNode) return []
    return model.edges.filter(e => e.source === selectedNode.id)
  }, [model.edges, selectedNode])

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

  const selectedEdge = useMemo<MeshEdge | null>(() => {
    if (!selectedEdgeId) return null
    return model.edges.find(e => e.id === selectedEdgeId) ?? null
  }, [model.edges, selectedEdgeId])

  const selectedEdgeEndpoints = useMemo(() => {
    if (!selectedEdge) return { source: undefined, target: undefined }
    return {
      source: model.nodes.find(n => n.id === selectedEdge.source),
      target: model.nodes.find(n => n.id === selectedEdge.target)
    }
  }, [model.nodes, selectedEdge])

  // Position of the selected edge among all edges that share the same node
  // pair, so the modal can show "Call 2 of 3" when multiple tool calls /
  // delegations exist between the same agent and target.
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

  const handleSelectEdge = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId)
  }, [])
  const handleCloseEdge = useCallback(() => setSelectedEdgeId(null), [])

  const visibleFrames = useMemo(() => {
    if (isLive) return model.frames
    return model.frames.filter(frame => frame.offsetMs <= clock.positionMs + 1)
  }, [model.frames, isLive, clock.positionMs])

  const logFrames = useMemo(() => visibleFrames.filter(f => !NON_LOG_FRAME_KINDS.has(f.kind)), [visibleFrames])

  const visibleDecisions = useMemo(() => {
    if (isLive) return model.decisions
    return model.decisions.filter(d => d.offsetMs <= clock.positionMs + 1)
  }, [model.decisions, isLive, clock.positionMs])

  const handleSeekToDecision = useCallback(
    (decision: MeshDecision) => {
      clock.seek(decision.offsetMs)
    },
    [clock]
  )

  const renderEmptyState = () => (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:text-center gba:px-6"
      data-testid="agent-mesh-empty"
    >
      <span className="gba:flex gba:h-14 gba:w-14 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:mb-4">
        <GraphIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" weight="duotone" />
      </span>
      <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">No session selected</h2>
      <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground gba:mb-5">
        Open or start an Every Fabric session to see the live agent mesh — sub-agents, experts, skills and tools
        connected by the messages flowing between them.
      </p>
      <Button onClick={onBack} variant="secondary">
        Back to landing
      </Button>
    </div>
  )

  const renderLoadingState = () => (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
      data-testid="agent-mesh-loading"
    >
      <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
      <p className="gba:text-sm gba:text-muted-foreground">Loading session trace…</p>
    </div>
  )

  const isEmpty = !activeSessionId && !session
  const isLoading = !!activeSessionId && !session
  const sessionTask = session?.input?.trim() ?? ''
  const decisionTitle = sessionTask || 'Session decision simulation'

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-5 lg:gba:p-6"
      data-testid="agent-mesh-screen"
    >
      <header className="gba:flex gba:items-start gba:gap-4 gba:mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:mt-1"
          data-testid="agent-mesh-back"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <h1 className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground">Agent Mesh</h1>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground">{HEADER_SUBTITLE}</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {!isEmpty && !isLoading && <MeshStatusPill agentCount={reachableAgentCount} toolCount={reachableToolCount} />}
          {!isEmpty && !isLoading && onOpenTraceExplorer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTraceExplorer(clock.positionMs)}
              data-testid="mesh-open-trace-explorer"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
              Trace Explorer
            </Button>
          )}
        </div>
      </header>

      {isEmpty ? (
        renderEmptyState()
      ) : isLoading ? (
        renderLoadingState()
      ) : (
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:gap-4">
          {/*
           * Side-by-side layout: canvas left, Decision Simulation right.
           *
           * Tailwind v4 in this app uses prefix-FIRST variants
           * (`gba:md:foo`, not `md:gba:foo`). Anything else is silently
           * dropped, which previously left only `grid-cols-1` active and
           * forced the panel below the canvas.
           *
           * - Below `md` (≤768px): single column — panel falls below the
           *   canvas (mobile / narrow side-by-side IDE panes).
           * - `md`–`xl`: panel collapses to 320px so the canvas keeps
           *   room to render the full agent mesh.
           * - `xl` (≥1280px) and above: panel grows to its preferred 380px.
           */}
          <div className="gba:grid gba:flex-1 gba:min-h-0 gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_320px] gba:xl:grid-cols-[minmax(0,1fr)_380px] gba:gap-4">
            <div className="gba:relative gba:min-h-[360px]">
              <MeshGraph
                model={model}
                activeLayers={activeLayers}
                positionMs={clock.positionMs}
                durationMs={isLive ? 0 : clock.durationMs}
                selectedNodeId={selectedNodeId}
                showEdgeLabels={showEdgeLabels}
                hoveredNodeId={hoveredNodeId}
                onSelectNode={setSelectedNodeId}
                onSelectEdge={handleSelectEdge}
                onHoverNode={setHoveredNodeId}
                onPaneClick={handleCloseEdge}
              />
              <div className="gba:absolute gba:top-3 gba:right-3 gba:z-10">
                <MeshLayersToggle
                  activeLayers={activeLayers}
                  countsByLayer={countsByLayer}
                  showLabels={showEdgeLabels}
                  onToggleLayer={toggleLayer}
                  onToggleLabels={toggleLabels}
                />
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
                    onClose={handleCloseEdge}
                  />
                </div>
              )}
            </div>

            <DecisionLogPanel
              title={decisionTitle}
              summary={model.summary}
              decisions={visibleDecisions}
              logFrames={logFrames}
              positionMs={clock.positionMs}
              isLive={isLive}
              onSeekToDecision={handleSeekToDecision}
            />
          </div>

          <ReplayTimeline clock={clock} frames={model.frames} />
        </div>
      )}
    </div>
  )
}
