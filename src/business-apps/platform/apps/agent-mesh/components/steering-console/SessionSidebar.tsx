import { Button } from '@newwork/nw-design-system'
import { Plus, MessageSquare, Trash2, X } from 'lucide-react'
import type { MeshSession } from '../../types/agentMesh'

interface SessionSidebarProps {
  sessions: MeshSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onClose?: () => void
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const SessionSidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose
}: SessionSidebarProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="session-sidebar">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:h-11 gba:flex-shrink-0 gba:border-b gba:border-border">
        <h2 className="gba:text-sm gba:font-bold gba:text-foreground gba:tracking-tight">Session History</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-xl"
            onClick={onClose}
            data-testid="session-sidebar-close"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        )}
      </div>

      {/* New Session button */}
      <div className="gba:p-3">
        <Button
          variant="outline"
          className="gba:w-full gba:justify-start gba:gap-2.5 gba:rounded-xl gba:h-10"
          onClick={onNewSession}
          data-testid="session-new-btn"
        >
          <Plus className="gba:h-4 gba:w-4" />
          <span className="gba:text-sm gba:font-medium">New Session</span>
        </Button>
      </div>

      {/* Sessions list */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:pb-3 gba:space-y-0.5">
        {sessions.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-2">
            <MessageSquare className="gba:h-6 gba:w-6 gba:text-muted-foreground/40" />
            <p className="gba:text-sm gba:text-muted-foreground">No sessions yet</p>
          </div>
        )}

        {sessions.map(session => {
          const isActive = session.session_id === activeSessionId
          return (
            <div
              key={session.session_id}
              className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-3 gba:py-2.5 gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
                isActive ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/70'
              }`}
              onClick={() => onSelectSession(session.session_id)}
              data-testid={`session-item-${session.session_id}`}
            >
              <MessageSquare className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0 gba:text-muted-foreground gba:mt-1" />
              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-sm gba:truncate gba:block gba:font-medium">{session.title}</span>
                <span className="gba:text-[10px] gba:text-muted-foreground/70">
                  {formatRelativeTime(session.updated_at)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-6 gba:w-6 gba:rounded-md gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:flex-shrink-0"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteSession(session.session_id)
                }}
                data-testid={`session-delete-${session.session_id}`}
              >
                <Trash2 className="gba:h-3 gba:w-3" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
