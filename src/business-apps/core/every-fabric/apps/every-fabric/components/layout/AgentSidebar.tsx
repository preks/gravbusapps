import { Button } from '@newwork/nw-design-system'
import { Brain, Plus, Trash, X } from '@phosphor-icons/react'
import type { DeepAgentSession } from '../../types/enterpriseAgent'
import { formatRelativeTime, formatCost } from '../../utils/renderUtils'

interface AgentSidebarProps {
  sessions: DeepAgentSession[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onClose?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending: { label: 'Pending', dot: 'gba:bg-primary gba:animate-pulse' },
  running: { label: 'Running', dot: 'gba:bg-primary gba:animate-pulse' },
  completed: { label: 'Done', dot: 'gba:bg-muted-foreground/40' },
  failed: { label: 'Failed', dot: 'gba:bg-destructive' },
  cancelled: { label: 'Cancelled', dot: 'gba:bg-muted-foreground/30' },
  waiting_for_human: { label: 'Waiting', dot: 'gba:bg-primary gba:animate-pulse' }
}

export const AgentSidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose
}: AgentSidebarProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="enterprise-agent-sidebar">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:h-11 gba:flex-shrink-0 gba:border-b gba:border-border">
        <h2 className="gba:text-sm gba:font-bold gba:text-foreground gba:tracking-tight">Sessions</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-xl"
            onClick={onClose}
            data-testid="enterprise-agent-sidebar-close"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        )}
      </div>

      {/* New Task button */}
      <div className="gba:p-3 gba:flex-shrink-0">
        <Button
          variant="outline"
          className="gba:w-full gba:justify-start gba:gap-2.5 gba:rounded-xl gba:h-10"
          onClick={onNewSession}
          data-testid="enterprise-agent-new-session"
        >
          <Plus className="gba:h-4 gba:w-4" weight="bold" />
          <span className="gba:text-sm gba:font-medium">New Task</span>
        </Button>
      </div>

      {/* Sessions list */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:pb-3 gba:space-y-0.5">
        {sessions.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-2">
            <Brain className="gba:h-6 gba:w-6 gba:text-muted-foreground/40" />
            <p className="gba:text-sm gba:text-muted-foreground">No sessions yet</p>
          </div>
        )}

        {sessions.map(session => {
          const isActive = session.session_id === activeSessionId
          const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.completed
          const cost = session.cost_summary?.estimated_cost_usd

          return (
            <div
              key={session.session_id}
              className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-3 gba:py-2.5 gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
                isActive ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/70'
              } ${session.status === 'running' ? 'gba:ring-1 gba:ring-primary/30' : ''}`}
              onClick={() => onSelectSession(session.session_id)}
              data-testid={`enterprise-agent-session-${session.session_id}`}
            >
              <div className="gba:flex-shrink-0 gba:mt-1.5">
                <span className={`gba:inline-block gba:w-1.5 gba:h-1.5 gba:rounded-full ${statusCfg.dot}`} />
              </div>

              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-sm gba:truncate gba:block gba:font-medium gba:leading-snug">
                  {session.input.length > 60 ? `${session.input.slice(0, 60)}…` : session.input}
                </span>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                  <span className="gba:text-xs gba:text-muted-foreground/70">
                    {formatRelativeTime(session.updated_at)}
                  </span>
                  {cost !== undefined && (
                    <span className="gba:text-xs gba:text-muted-foreground/60">{formatCost(cost)}</span>
                  )}
                  <span className="gba:text-xs gba:text-muted-foreground/50">{statusCfg.label}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="gba:h-6 gba:w-6 gba:rounded-md gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:flex-shrink-0"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteSession(session.session_id)
                }}
                data-testid={`enterprise-agent-session-delete-${session.session_id}`}
              >
                <Trash className="gba:h-3 gba:w-3" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
