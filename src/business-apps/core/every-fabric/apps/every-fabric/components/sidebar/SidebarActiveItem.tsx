import React from 'react'
import { ChatTeardropDotsIcon, SpinnerGapIcon, UserIcon } from '@phosphor-icons/react'
import type { ActiveSessionSnapshot } from '../../types/activeSession'

interface SidebarActiveItemProps {
  session: ActiveSessionSnapshot
  isSelected: boolean
  onSelect: (sessionId: string) => void
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Icon for the left-hand status indicator. Spinner while thinking / tool-using, user icon when awaiting human. */
function statusIconOf(session: ActiveSessionSnapshot): React.ReactNode {
  if (session.status === 'waiting_for_human') {
    return <UserIcon className="gba:h-3.5 gba:w-3.5 gba:text-blue-700 dark:gba:text-blue-300" weight="bold" />
  }
  return (
    <SpinnerGapIcon
      className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground motion-safe:gba:animate-spin"
      weight="bold"
    />
  )
}

/** Small status pill on the right (e.g. "Waiting"). Falls back to hiding when running. */
function statusChipOf(session: ActiveSessionSnapshot): React.ReactNode {
  if (session.status === 'waiting_for_human') {
    return (
      <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-blue-200 gba:bg-blue-50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-blue-700 dark:gba:border-blue-900/50 dark:gba:bg-blue-950/60 dark:gba:text-blue-200">
        Waiting
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
  return null
}

const SidebarActiveItemBase: React.FC<SidebarActiveItemProps> = ({ session, isSelected, onSelect }) => {
  const activityLabel = session.current_activity?.label?.trim() || 'Working…'
  const title = truncate(session.input || 'Untitled task', 48)

  return (
    <button
      type="button"
      onClick={() => onSelect(session.session_id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`gba:group gba:flex gba:w-full gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-2.5 gba:py-2 gba:text-left gba:transition-colors ${
        isSelected ? 'gba:bg-muted' : 'gba:hover:bg-muted/60'
      }`}
      data-testid={`sidebar-active-item-${session.session_id}`}
    >
      <span className="gba:relative gba:mt-0.5 gba:inline-flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:shrink-0 gba:rounded-md gba:bg-background gba:border gba:border-border/60">
        {statusIconOf(session)}
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

      <span className="gba:ml-1 gba:shrink-0 gba:self-start">{statusChipOf(session)}</span>
    </button>
  )
}

export const SidebarActiveItem = React.memo(SidebarActiveItemBase)
