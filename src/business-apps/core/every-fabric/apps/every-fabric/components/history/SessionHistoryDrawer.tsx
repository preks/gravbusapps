import { Button } from '@newwork/nw-design-system'
import { ClockCounterClockwiseIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import type { FabricSessionSummary } from '../../types/fabric'
import { formatRelativeTime } from '../../utils/renderUtils'

interface SessionHistoryDrawerProps {
  sessions: FabricSessionSummary[]
  activeSessionId: string | null
  isOpen: boolean
  onClose: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  waiting_for_human: 'Waiting'
}

export const SessionHistoryDrawer: React.FC<SessionHistoryDrawerProps> = ({
  sessions,
  activeSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onDeleteSession
}) => {
  return (
    <div
      className={`gba:fixed gba:top-16 sm:gba:top-20 gba:left-18 sm:gba:left-6 lg:gba:left-8 gba:z-40 gba:w-[min(20rem,calc(100vw-2rem))] sm:gba:w-[24rem] gba:transition-all gba:duration-200 ${
        isOpen
          ? 'gba:opacity-100 gba:translate-y-0 gba:pointer-events-auto'
          : 'gba:opacity-0 -gba:translate-y-2 gba:pointer-events-none'
      }`}
      data-testid="fabric-session-history-drawer"
    >
      <div className="gba:rounded-[1.5rem] gba:border gba:border-border/75 gba:bg-card/98 gba:backdrop-blur-md gba:shadow-[0_8px_24px_rgba(15,23,42,0.045)]">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/60">
          <div className="gba:flex gba:items-center gba:gap-2">
            <ClockCounterClockwiseIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">Session history</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full"
            onClick={onClose}
            data-testid="fabric-session-history-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <div className="gba:max-h-[min(34rem,70vh)] gba:overflow-y-auto gba:p-2">
          {sessions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-4 gba:py-10 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">No sessions yet</p>
            </div>
          ) : (
            <div className="gba:space-y-1">
              {sessions.map(session => {
                const isActive = session.session_id === activeSessionId
                const statusLabel = STATUS_LABELS[session.status] ?? 'Saved'

                return (
                  <div
                    key={session.session_id}
                    className={`gba:flex gba:items-start gba:gap-3 gba:rounded-2xl gba:px-3 gba:py-3 gba:transition-colors ${
                      isActive ? 'gba:bg-muted/70' : 'gba:hover:bg-muted/45'
                    }`}
                    data-testid={`fabric-session-history-item-${session.session_id}`}
                  >
                    <button
                      onClick={() => onSelectSession(session.session_id)}
                      className="gba:flex-1 gba:min-w-0 gba:text-left"
                    >
                      <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                        {session.input.length > 72 ? `${session.input.slice(0, 72)}…` : session.input}
                      </p>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                        <span className="gba:text-xs gba:text-muted-foreground/75">
                          {formatRelativeTime(session.updated_at)}
                        </span>
                        <span className="gba:text-xs gba:text-muted-foreground/55">{statusLabel}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => onDeleteSession(session.session_id)}
                      className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                      data-testid={`fabric-session-history-delete-${session.session_id}`}
                      aria-label="Delete session"
                    >
                      <TrashIcon className="gba:h-3.5 gba:w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
