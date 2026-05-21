import { useCallback, useMemo } from 'react'
import { GraphIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { useFabric } from '../../context/FabricContext'
import { useReplayClock } from '../../hooks/useReplayClock'
import { useTraceModel } from '../../hooks/useTraceModel'
import type { MeshDecision } from '../../utils/traceModel'
import { MESH_LAYERS, type MeshLayerKey } from './meshLayers'
import { AgentMeshCanvas } from './AgentMeshCanvas'
import { AgentMeshShell } from './AgentMeshShell'
import { DecisionLogPanel } from './DecisionLogPanel'
import { ReplayTimeline } from './ReplayTimeline'
import type { MeshScope } from './meshScopes'
import { getScopeSubtitle, getScopeTitle } from './meshScopes'
import { useAgentMeshScope } from '../../hooks/useAgentMeshScope'
import { AgentMeshAggregateView } from './AgentMeshAggregateView'

interface AgentMeshScreenProps {
  onBack: () => void
  onOpenTraceExplorer?: (positionMs: number) => void
}

const NON_LOG_FRAME_KINDS = new Set(['decision'])

export const AgentMeshScreen: React.FC<AgentMeshScreenProps> = ({ onBack, onOpenTraceExplorer }) => {
  const { session, events, isStreaming, activeSessionId } = useFabric()
  const { scope, userId, setScope } = useAgentMeshScope()

  const { model, source } = useTraceModel({ liveEvents: events, session, isStreaming })
  const isLive = isStreaming === true && (source === 'live' || source === 'merged')

  const clock = useReplayClock({
    durationMs: model.summary.durationMs,
    isLive,
    initialSpeed: 1
  })

  const countsByLayer = useMemo<Record<MeshLayerKey, number>>(() => {
    const result: Record<MeshLayerKey, number> = { agents: 0, experts: 0, skills: 0, tools: 0 }
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

  const visibleFrames = useMemo(() => {
    if (isLive) return model.frames
    return model.frames.filter(frame => frame.offsetMs <= clock.positionMs + 1)
  }, [model.frames, isLive, clock.positionMs])

  const logFrames = useMemo(() => visibleFrames.filter(f => !NON_LOG_FRAME_KINDS.has(f.kind)), [visibleFrames])

  const visibleDecisions = useMemo(() => {
    if (isLive) return model.decisions
    return model.decisions.filter(d => d.offsetMs <= clock.positionMs + 1)
  }, [model.decisions, isLive, clock.positionMs])

  const handleSeekToDecision = useCallback((decision: MeshDecision) => clock.seek(decision.offsetMs), [clock])

  const handleScopeChange = useCallback(
    (newScope: MeshScope, newUserId?: string) => setScope(newScope, newUserId),
    [setScope]
  )

  const isEmpty = scope === 'session' && !activeSessionId && !session
  const isLoading = scope === 'session' && !!activeSessionId && !session
  const sessionTask = session?.input?.trim() ?? ''
  const decisionTitle = sessionTask || 'Session decision simulation'

  const showStatus = scope === 'session' && !isEmpty && !isLoading

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

  const renderSessionView = () => {
    if (isEmpty) return renderEmptyState()
    if (isLoading) return renderLoadingState()

    return (
      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:gap-4">
        <div className="gba:grid gba:flex-1 gba:min-h-0 gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_320px] gba:xl:grid-cols-[minmax(0,1fr)_380px] gba:gap-4">
          <AgentMeshCanvas model={model} positionMs={clock.positionMs} durationMs={clock.durationMs} isLive={isLive} />
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
    )
  }

  const renderContent = () => {
    if (scope === 'session') return renderSessionView()
    return <AgentMeshAggregateView scope={scope} userId={userId} />
  }

  const disabledScopes: MeshScope[] = userId ? [] : ['user']

  return (
    <AgentMeshShell
      scope={scope}
      onScopeChange={handleScopeChange}
      disabledScopes={disabledScopes}
      title={getScopeTitle(scope, userId)}
      subtitle={getScopeSubtitle(scope)}
      agentCount={reachableAgentCount}
      toolCount={reachableToolCount}
      showStatus={showStatus}
      onBack={onBack}
      onOpenTraceExplorer={scope === 'session' ? onOpenTraceExplorer : undefined}
      traceExplorerPositionMs={clock.positionMs}
    >
      {renderContent()}
    </AgentMeshShell>
  )
}
