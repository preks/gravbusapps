import { Button } from '@newwork/nw-design-system'
import { Plus, Trash2, MessageSquare, X } from 'lucide-react'
import type { NexusSession } from '../../types/nexus.types'

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

interface NexusSidebarProps {
  sessions: NexusSession[]
  currentSessionId?: string
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onClose: () => void
  testId?: string
}

export const NexusSidebar = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose,
  testId = 'nexus-sidebar'
}: NexusSidebarProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b gba:border-border">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Session History</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid={`${testId}-close`}>
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* New Session */}
      <div className="gba:p-3">
        <Button
          variant="outline"
          className="gba:w-full gba:justify-start gba:gap-2"
          onClick={onNewSession}
          data-testid={`${testId}-new-session`}
        >
          <Plus className="gba:h-4 gba:w-4" />
          New Session
        </Button>
      </div>

      {/* Sessions List */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:pb-3 gba:space-y-1">
        {sessions.length === 0 && (
          <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">No sessions yet</p>
        )}

        {sessions.map(session => (
          <div
            key={session.id}
            className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-lg gba:px-3 gba:py-2.5 gba:cursor-pointer gba:group gba:transition-colors ${
              session.id === currentSessionId ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted'
            }`}
            onClick={() => onSelectSession(session.id)}
            data-testid={`${testId}-session-${session.id}`}
          >
            <MessageSquare className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1 gba:min-w-0">
              <span className="gba:text-sm gba:truncate gba:block gba:font-medium">{session.title || 'Untitled'}</span>
              <span className="gba:text-[11px] gba:text-muted-foreground">
                {formatRelativeTime(session.updatedAt || session.createdAt)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:flex-shrink-0"
              onClick={e => {
                e.stopPropagation()
                onDeleteSession(session.id)
              }}
              data-testid={`${testId}-delete-${session.id}`}
            >
              <Trash2 className="gba:h-3 gba:w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
