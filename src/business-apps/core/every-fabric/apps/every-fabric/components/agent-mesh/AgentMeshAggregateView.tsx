import { useCallback } from 'react'
import { GraphIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { MeshScope } from './meshScopes'
import { useAgentMeshAggregateData } from '../../hooks/useAgentMeshAggregateData'
import { useAgentMeshScope } from '../../hooks/useAgentMeshScope'
import { AgentMeshCanvas } from './AgentMeshCanvas'
import { AggregateOverviewPanel } from './AggregateOverviewPanel'
import { useFabric } from '../../context/FabricContext'

interface AgentMeshAggregateViewProps {
  scope: Exclude<MeshScope, 'session'>
  userId?: string
}

export const AgentMeshAggregateView: React.FC<AgentMeshAggregateViewProps> = ({ scope, userId }) => {
  const { model, isLoading, error, stats } = useAgentMeshAggregateData(scope, userId)
  const { setScope } = useAgentMeshScope()
  const { selectSession } = useFabric()

  const handleSelectUser = useCallback((selectedUserId: string) => setScope('user', selectedUserId), [setScope])

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId)
      setScope('session')
    },
    [selectSession, setScope]
  )

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

  return (
    <div className="gba:flex gba:flex-1 gba:min-h-0 gba:gap-4">
      <div className="gba:grid gba:flex-1 gba:min-h-0 gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_320px] gba:xl:grid-cols-[minmax(0,1fr)_380px] gba:gap-4">
        <AgentMeshCanvas
          model={model}
          positionMs={0}
          durationMs={0}
          isLive={true}
          onDrillToUser={scope === 'company' ? handleSelectUser : undefined}
          onDrillToSession={handleSelectSession}
        />
        <AggregateOverviewPanel
          scope={scope}
          stats={stats}
          onSelectUser={scope === 'company' ? handleSelectUser : undefined}
          onSelectSession={handleSelectSession}
        />
      </div>
    </div>
  )
}
