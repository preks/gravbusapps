import { Button, Badge } from '@newwork/nw-design-system'
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react'
import type { MeshSession } from '../../types/agentMesh'

interface SessionSidebarProps {
  sessions: MeshSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
}

const formatRelativeTime = (dateStr: string): string => {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export const SessionSidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession
}: SessionSidebarProps) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:bg-card gba:border-r gba:border-border"
      data-testid="session-sidebar"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border-b gba:border-border">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground">Sessions</span>
        <Button variant="ghost" size="sm" onClick={onNewSession} data-testid="session-new-btn">
          <Plus className="gba:w-3.5 gba:h-3.5" />
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-1.5">
        {sessions.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:gap-2 gba:p-4">
            <MessageSquare className="gba:w-6 gba:h-6 gba:opacity-30" />
            <p className="gba:text-xs gba:text-center">No conversations yet</p>
          </div>
        )}

        {sessions.map(session => {
          const isActive = session.session_id === activeSessionId
          return (
            <div
              key={session.session_id}
              className={`gba:group gba:flex gba:items-start gba:gap-2 gba:p-2 gba:rounded-lg gba:cursor-pointer gba:transition-colors gba:mb-0.5 ${
                isActive ? 'gba:bg-primary/10 gba:border gba:border-primary/20' : 'gba:hover:bg-muted/50'
              }`}
              onClick={() => onSelectSession(session.session_id)}
              data-testid={`session-item-${session.session_id}`}
            >
              <MessageSquare
                className={`gba:w-3.5 gba:h-3.5 gba:mt-0.5 gba:flex-shrink-0 ${
                  isActive ? 'gba:text-primary' : 'gba:text-muted-foreground'
                }`}
              />
              <div className="gba:flex-1 gba:min-w-0">
                <p
                  className={`gba:text-xs gba:font-medium gba:truncate ${
                    isActive ? 'gba:text-primary' : 'gba:text-foreground'
                  }`}
                >
                  {session.title}
                </p>
                <div className="gba:flex gba:items-center gba:gap-1 gba:mt-0.5">
                  <Clock className="gba:w-2.5 gba:h-2.5 gba:text-muted-foreground" />
                  <span className="gba:text-[10px] gba:text-muted-foreground">
                    {formatRelativeTime(session.updated_at)}
                  </span>
                  <Badge variant="secondary" className="gba:text-[9px] gba:px-1 gba:py-0 gba:ml-1">
                    {session.messages.length}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:p-1 gba:h-auto"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteSession(session.session_id)
                }}
                data-testid={`session-delete-${session.session_id}`}
              >
                <Trash2 className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
