import { Button, useTranslation } from '@newwork/nw-design-system'
import { Plus, Trash2, MessageSquare, X } from 'lucide-react'
import type { NexusSession } from '../../types/nexus.types'
import translations from '../../_i18n'

const formatRelativeTime = (
  dateStr: string,
  t: (key: string, args?: Record<string, number | string>) => string,
  locale: string
): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('sidebar-time-just-now')
  if (minutes < 60) return t('sidebar-time-minutes-ago', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('sidebar-time-hours-ago', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('sidebar-time-days-ago', { count: days })
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
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
  const { t, locale } = useTranslation(translations)

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
        <h2 className="gba:text-sm gba:font-bold gba:text-foreground gba:tracking-tight">
          {t('sidebar-session-history')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:rounded-lg"
          onClick={onClose}
          data-testid={`${testId}-close`}
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* New Session */}
      <div className="gba:p-3">
        <Button
          variant="outline"
          className="gba:w-full gba:justify-start gba:gap-2.5 gba:rounded-xl gba:h-10"
          onClick={onNewSession}
          data-testid={`${testId}-new-session`}
        >
          <Plus className="gba:h-4 gba:w-4" />
          <span className="gba:text-sm gba:font-medium">{t('sidebar-new-session')}</span>
        </Button>
      </div>

      {/* Sessions List */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:pb-3 gba:space-y-0.5">
        {sessions.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-2">
            <MessageSquare className="gba:h-6 gba:w-6 gba:text-muted-foreground/40" />
            <p className="gba:text-sm gba:text-muted-foreground">{t('sidebar-empty')}</p>
          </div>
        )}

        {sessions.map(session => (
          <div
            key={session.id}
            className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-3 gba:py-2.5 gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
              session.id === currentSessionId ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/70'
            }`}
            onClick={() => onSelectSession(session.id)}
            data-testid={`${testId}-session-${session.id}`}
          >
            <MessageSquare className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0 gba:text-muted-foreground gba:mt-1" />
            <div className="gba:flex-1 gba:min-w-0">
              <span className="gba:text-sm gba:truncate gba:block gba:font-medium">
                {session.title || t('sidebar-untitled')}
              </span>
              <span className="gba:text-[10px] gba:text-muted-foreground/70">
                {formatRelativeTime(session.updatedAt || session.createdAt, t, locale)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-6 gba:w-6 gba:rounded-md gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:flex-shrink-0"
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
