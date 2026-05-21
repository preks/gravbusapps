import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { MeshStatusPill } from './MeshStatusPill'
import type { MeshScope } from './meshScopes'
import { MeshScopeSwitch } from './MeshScopeSwitch'

interface AgentMeshShellProps {
  scope: MeshScope
  onScopeChange: (scope: MeshScope, userId?: string) => void
  disabledScopes?: MeshScope[]
  title: string
  subtitle: string
  agentCount: number
  toolCount: number
  showStatus: boolean
  onBack: () => void
  onOpenTraceExplorer?: (positionMs: number) => void
  traceExplorerPositionMs?: number
  children: React.ReactNode
}

export const AgentMeshShell: React.FC<AgentMeshShellProps> = ({
  scope,
  onScopeChange,
  disabledScopes = [],
  title,
  subtitle,
  agentCount,
  toolCount,
  showStatus,
  onBack,
  onOpenTraceExplorer,
  traceExplorerPositionMs = 0,
  children
}) => {
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
          <h1 className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground">{title}</h1>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground">{subtitle}</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {showStatus && <MeshStatusPill agentCount={agentCount} toolCount={toolCount} />}
          {showStatus && onOpenTraceExplorer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTraceExplorer(traceExplorerPositionMs)}
              data-testid="mesh-open-trace-explorer"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
              Trace Explorer
            </Button>
          )}
        </div>
      </header>

      <div className="gba:mb-4">
        <MeshScopeSwitch activeScope={scope} onChange={onScopeChange} disabledScopes={disabledScopes} />
      </div>

      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">{children}</div>
    </div>
  )
}
