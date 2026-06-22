import { useCallback, useMemo, useState } from 'react'
import { GraphIcon, SpinnerGapIcon, SquaresFourIcon } from '@phosphor-icons/react'
import type { MeshScope } from './meshScopes'
import { useAgentMeshI18n } from './useAgentMeshI18n'
import { useAgentMeshAggregateData } from '../../hooks/useAgentMeshAggregateData'
import { useAgentMeshScope } from '../../hooks/useAgentMeshScope'
import { useMeshTelemetry } from '../../hooks/useMeshTelemetry'
import { AgentMeshCanvas } from './AgentMeshCanvas'
import { AgentMeshGlassSphere } from './AgentMeshGlassSphere'
import { AggregateOverviewPanel } from './AggregateOverviewPanel'
import type { ActiveSessionSnapshot } from '../../types/activeSession'
import { buildLiveMeshActivity, buildModelLiveActivity } from './liveMeshActivity'

type CompanyView = 'graph' | 'cards'

function CompanyViewToggle({ view, onChange }: { view: CompanyView; onChange: (view: CompanyView) => void }) {
  const { t } = useAgentMeshI18n()
  const buttonClass = (active: boolean) =>
    `gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:px-2.5 gba:py-1.5 gba:text-xs gba:font-medium gba:transition-colors ${
      active
        ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
        : 'gba:text-muted-foreground gba:hover:text-foreground'
    }`
  return (
    <div
      className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/40 gba:p-1 gba:backdrop-blur"
      data-testid="company-view-toggle"
    >
      <button
        type="button"
        onClick={() => onChange('graph')}
        className={buttonClass(view === 'graph')}
        aria-pressed={view === 'graph'}
        data-testid="company-view-graph"
      >
        <GraphIcon className="gba:h-3.5 gba:w-3.5" weight="duotone" />
        {t('agent-mesh-view-graph')}
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={buttonClass(view === 'cards')}
        aria-pressed={view === 'cards'}
        data-testid="company-view-cards"
      >
        <SquaresFourIcon className="gba:h-3.5 gba:w-3.5" weight="duotone" />
        {t('agent-mesh-view-cards')}
      </button>
    </div>
  )
}

interface AgentMeshAggregateViewProps {
  scope: Exclude<MeshScope, 'session'>
  userId?: string
  activeSessions?: readonly ActiveSessionSnapshot[]
}

export const AgentMeshAggregateView: React.FC<AgentMeshAggregateViewProps> = ({ scope, userId, activeSessions }) => {
  const { t } = useAgentMeshI18n()
  const { model, isLoading, error, stats, sessions, userNameMap, sessionTitleMap } = useAgentMeshAggregateData(
    scope,
    userId
  )
  const { pushSnapshot, isFullscreen } = useAgentMeshScope()
  const { emit, hashIdentifier } = useMeshTelemetry()
  const [companyView, setCompanyView] = useState<CompanyView>('graph')
  const liveActivity = useMemo(() => {
    const activeFeedActivity = buildLiveMeshActivity(activeSessions)
    // If an active-session feed was provided, trust it. An empty or stale feed
    // means no live activity right now; falling back to aggregate model status
    // would resurrect old stuck "running" sessions and make the company mesh
    // pulse even when nothing is currently happening.
    return activeSessions ? activeFeedActivity : buildModelLiveActivity(model)
  }, [activeSessions, model])

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
        <p className="gba:text-sm gba:text-muted-foreground">{t('agent-mesh-loading-data')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
        data-testid="mesh-aggregate-error"
      >
        <p className="gba:text-sm gba:text-destructive">{t('agent-mesh-error-load')}</p>
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
        <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">
          {t('agent-mesh-empty-activity-title')}
        </h2>
        <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">
          {scope === 'company' ? t('agent-mesh-empty-activity-company') : t('agent-mesh-empty-activity-scope')}
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
        liveActivity={liveActivity}
        showLiveHud
        dense
        onDrillToUser={scope === 'company' ? handleCanvasDrillUser : undefined}
        onDrillToSession={handleCanvasDrillSession}
      />
    )
  }

  const showGlassCards = scope === 'company' && companyView === 'cards'

  return (
    <div className="gba:flex gba:flex-1 gba:min-h-0 gba:gap-4">
      <div className="gba:grid gba:flex-1 gba:min-h-0 gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_320px] gba:xl:grid-cols-[minmax(0,1fr)_380px] gba:gap-4">
        <div className="gba:relative gba:grid gba:min-h-0">
          {scope === 'company' && (
            <div className="gba:absolute gba:right-3 gba:top-3 gba:z-20">
              <CompanyViewToggle view={companyView} onChange={setCompanyView} />
            </div>
          )}
          {showGlassCards ? (
            <AgentMeshGlassSphere stats={stats} liveActivity={liveActivity} />
          ) : (
            <AgentMeshCanvas
              model={model}
              positionMs={0}
              durationMs={0}
              isLive={true}
              liveActivity={liveActivity}
              showLiveHud
              onDrillToUser={scope === 'company' ? handleCanvasDrillUser : undefined}
              onDrillToSession={handleCanvasDrillSession}
            />
          )}
        </div>
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
