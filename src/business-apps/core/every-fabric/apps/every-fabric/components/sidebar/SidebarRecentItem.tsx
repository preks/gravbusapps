import React from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import type { FabricSessionSummary } from '../../types/fabric'
import { formatRelativeTime } from '../../utils/renderUtils'

interface SidebarRecentItemProps {
  session: FabricSessionSummary
  isSelected: boolean
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

const SidebarRecentItemBase: React.FC<SidebarRecentItemProps> = ({ session, isSelected, onSelect, onDelete }) => {
  const title = truncate(session.input || 'Untitled session', 54)
  const meta = STATUS_LABELS[session.status] ?? ''

  return (
    <div
      className={`gba:group gba:relative gba:flex gba:w-full gba:items-start gba:gap-2 gba:rounded-lg gba:px-2 gba:py-1.5 gba:transition-colors ${
        isSelected ? 'gba:bg-muted' : 'gba:hover:bg-muted/60'
      }`}
      data-testid={`sidebar-recent-item-${session.session_id}`}
    >
      <button
        type="button"
        onClick={() => onSelect(session.session_id)}
        aria-current={isSelected ? 'true' : undefined}
        className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:text-left"
      >
        <span className="gba:truncate gba:text-[13px] gba:text-foreground">{title}</span>
        <span className="gba:mt-0.5 gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground/80">
          <span>{formatRelativeTime(session.updated_at)}</span>
          {meta ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{meta}</span>
            </>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          onDelete(session.session_id)
        }}
        aria-label="Delete session"
        className="gba:opacity-0 gba:group-hover:opacity-100 focus-visible:gba:opacity-100 gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-all"
        data-testid={`sidebar-recent-delete-${session.session_id}`}
      >
        <TrashIcon className="gba:h-3 gba:w-3" />
      </button>
    </div>
  )
}

export const SidebarRecentItem = React.memo(SidebarRecentItemBase)
