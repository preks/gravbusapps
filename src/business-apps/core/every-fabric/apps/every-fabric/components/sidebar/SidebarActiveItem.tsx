import React from 'react'
import { ChatTeardropDotsIcon, SpinnerGapIcon, StopCircleIcon, UserIcon } from '@phosphor-icons/react'
import type { ActiveSessionSnapshot } from '../../types/activeSession'

interface SidebarActiveItemProps {
  session: ActiveSessionSnapshot
  isSelected: boolean
  onSelect: (sessionId: string) => void
  onStop: (sessionId: string) => void
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Status indicator rendered in the left-hand square.
 *
 * - `waiting_for_human` → user glyph inside a softly pulsing blue halo
 * - `running` / anything else → a spinning gap (neutral, never flashy)
 */
function statusIconOf(session: ActiveSessionSnapshot): React.ReactNode {
  if (session.status === 'waiting_for_human') {
    return <UserIcon className="gba:h-3.5 gba:w-3.5 gba:text-blue-600 dark:gba:text-blue-300" weight="bold" />
  }
  return <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground/70 gba:animate-spin" weight="bold" />
}

/** Small status pill on the right. Subtly pulsing for waiting, static for pending, hidden for running. */
function statusChipOf(session: ActiveSessionSnapshot): React.ReactNode {
  if (session.status === 'waiting_for_human') {
    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-blue-200 gba:bg-blue-50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-blue-700 dark:gba:border-blue-900/50 dark:gba:bg-blue-950/60 dark:gba:text-blue-200">
        <span aria-hidden="true" className="gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5">
          <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-blue-400 gba:opacity-75 gba:animate-ping" />
          <span className="gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-blue-500" />
        </span>
        {'Waiting'}
      </span>
    )
  }
  if (session.status === 'pending') {
    return (
      <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border/50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
        Pending
      </span>
    )
  }
  // running — compact "Running" pill, no pulse (the left spinner already carries motion).
  return (
    <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border/50 gba:bg-background gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
      Running
    </span>
  )
}

const SidebarActiveItemBase: React.FC<SidebarActiveItemProps> = ({ session, isSelected, onSelect, onStop }) => {
  const activityLabel = session.current_activity?.label?.trim() || 'Working…'
  const title = truncate(session.input || 'Untitled task', 48)
  const isWaiting = session.status === 'waiting_for_human'
  const iconWrapClass = isWaiting
    ? 'gba:border-blue-200 gba:bg-blue-50/60 dark:gba:border-blue-900/60 dark:gba:bg-blue-950/40'
    : 'gba:border-border/60 gba:bg-background'

  return (
    <div
      className={`gba:group gba:relative gba:flex gba:w-full gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-2.5 gba:py-2 gba:text-left gba:transition-colors ${
        isSelected ? 'gba:bg-muted' : 'gba:hover:bg-muted/60'
      }`}
      data-testid={`sidebar-active-item-${session.session_id}`}
    >
      <button
        type="button"
        onClick={() => onSelect(session.session_id)}
        aria-current={isSelected ? 'true' : undefined}
        className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-2.5 gba:text-left"
      >
        <span
          className={`gba:relative gba:mt-0.5 gba:inline-flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:shrink-0 gba:rounded-md gba:border ${iconWrapClass}`}
        >
          {isWaiting && (
            <span
              aria-hidden="true"
              className="gba:absolute gba:inset-0 gba:rounded-md gba:bg-blue-400/30 gba:animate-ping"
            />
          )}
          <span className="gba:relative gba:inline-flex gba:items-center gba:justify-center">
            {statusIconOf(session)}
          </span>
        </span>

        <span className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col">
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:truncate gba:text-[13px] gba:font-medium gba:text-foreground">{title}</span>
          </span>
          <span className="gba:mt-0.5 gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
            <ChatTeardropDotsIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-foreground/70" />
            <span className="gba:truncate gba:text-[11px] gba:text-muted-foreground">{activityLabel}</span>
          </span>
        </span>
      </button>

      <span className="gba:ml-1 gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:self-start">
        <span className="gba:group-hover:hidden">{statusChipOf(session)}</span>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onStop(session.session_id)
          }}
          aria-label="Stop session"
          title="Stop session"
          className="gba:opacity-0 gba:group-hover:opacity-100 focus-visible:gba:opacity-100 gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:text-muted-foreground gba:hover:text-red-600 gba:hover:bg-muted/60 gba:transition-all"
          data-testid={`sidebar-active-stop-${session.session_id}`}
        >
          <StopCircleIcon className="gba:h-4 gba:w-4" weight="fill" />
        </button>
      </span>
    </div>
  )
}

export const SidebarActiveItem = React.memo(SidebarActiveItemBase)
