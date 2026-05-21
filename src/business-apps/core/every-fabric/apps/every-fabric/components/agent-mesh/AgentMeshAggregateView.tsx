import { useCallback, useMemo } from 'react'
import { GraphIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { MeshScope } from './meshScopes'
import { useAgentMeshAggregateData } from '../../hooks/useAgentMeshAggregateData'
import { useAgentMeshScope } from '../../hooks/useAgentMeshScope'
import { useMeshTelemetry } from '../../hooks/useMeshTelemetry'
import { AgentMeshCanvas } from './AgentMeshCanvas'
import { AggregateOverviewPanel } from './AggregateOverviewPanel'

interface AgentMeshAggregateViewProps {
  scope: Exclude<MeshScope, 'session'>
  userId?: string
}

export const AgentMeshAggregateView: React.FC<AgentMeshAggregateViewProps> = ({ scope, userId }) => {
  const { model, isLoading, error, stats, sessions, userNameMap, sessionTitleMap } = useAgentMeshAggregateData(
    scope,
    userId
  )
  const { pushSnapshot, isFullscreen } = useAgentMeshScope()
  const { emit, hashIdentifier } = useMeshTelemetry()

  // Map sessionId → userId so Company→Session drills can insert a User breadcrumb.
  const sessionUserMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sessions) {
      if (s.session_id && s.user_id) map.set(s.session_id, s.user_id)
    }
    return map
  }, [sessions])

  const drillToUser = useCallback(
    (selectedUserId: string, source: 'canvas' | 'panel') => {
      const label = userNameMap?.get(selectedUserId)
      emit({ type: 'mesh.scope_changed', from: scope, to: 'user', source })
      pushSnapshot({ scope: 'user', userId: selectedUserId, label, fullscreen: isFullscreen })
    },
    [emit, isFullscreen, pushSnapshot, scope, userNameMap]
  )

  const drillToSession = useCallback(
    (sessionId: string) => {
      const sessionLabel = sessionTitleMap?.get(sessionId)
      emit({ type: 'mesh.drill_to_session', origin: scope, sessionIdHash: hashIdentifier(sessionId) })

      // When drilling from company scope, insert an intermediate User breadcrumb
      // so the trail reads Company > UserName > SessionTitle.
      if (scope === 'company') {
        const ownerUserId = sessionUserMap.get(sessionId)
        if (ownerUserId) {
          const userLabel = userNameMap?.get(ownerUserId)
          pushSnapshot({ scope: 'user', userId: ownerUserId, label: userLabel, fullscreen: isFullscreen })
        }
      }

      pushSnapshot({ scope: 'session', sessionId, label: sessionLabel, fullscreen: isFullscreen })
    },
    [emit, hashIdentifier, isFullscreen, pushSnapshot, scope, sessionTitleMap, sessionUserMap, userNameMap]
  )

  const handleCanvasDrillUser = useCallback((id: string) => drillToUser(id, 'canvas'), [drillToUser])
  const handleCanvasDrillSession = useCallback((id: string) => drillToSession(id), [drillToSession])
  const handlePanelDrillUser = useCallback((id: string) => drillToUser(id, 'panel'), [drillToUser])
  const handlePanelDrillSession = useCallback((id: string) => drillToSession(id), [drillToSession])

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
        data-testid="mesh-aggregate-loading"
      >
        <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">Loading mesh data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
        data-testid="mesh-aggregate-error"
      >
        <p className="gba:text-sm gba:text-destructive">Failed to load mesh data</p>
        <p className="gba:text-xs gba:text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!model || model.nodes.length === 0) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:text-center gba:px-6"
        data-testid="mesh-aggregate-empty"
      >
        <span className="gba:flex gba:h-14 gba:w-14 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:mb-4">
          <GraphIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" weight="duotone" />
        </span>
        <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">No activity yet</h2>
        <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">
          {scope === 'company'
            ? 'No sessions have been recorded across the workspace.'
            : 'No sessions found for this scope.'}
        </p>
      </div>
    )
  }

  if (isFullscreen) {
    return (
      <AgentMeshCanvas
        model={model}
        positionMs={0}
        durationMs={0}
        isLive={true}
        dense
        onDrillToUser={scope === 'company' ? handleCanvasDrillUser : undefined}
        onDrillToSession={handleCanvasDrillSession}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-1 gba:min-h-0 gba:gap-4">
      <div className="gba:grid gba:flex-1 gba:min-h-0 gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_320px] gba:xl:grid-cols-[minmax(0,1fr)_380px] gba:gap-4">
        <AgentMeshCanvas
          model={model}
          positionMs={0}
          durationMs={0}
          isLive={true}
          onDrillToUser={scope === 'company' ? handleCanvasDrillUser : undefined}
          onDrillToSession={handleCanvasDrillSession}
        />
        <AggregateOverviewPanel
          scope={scope}
          stats={stats}
          onSelectUser={scope === 'company' ? handlePanelDrillUser : undefined}
          onSelectSession={handlePanelDrillSession}
        />
      </div>
    </div>
  )
}
