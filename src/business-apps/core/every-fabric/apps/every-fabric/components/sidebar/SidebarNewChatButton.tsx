import { PlusIcon } from '@phosphor-icons/react'
import { SidebarTooltip } from './SidebarTooltip'

interface SidebarNewChatButtonProps {
  isCollapsed: boolean
  onClick: () => void
}

/**
 * Primary "New session" CTA. In expanded mode it's a full-width pill; in
 * collapsed mode it shrinks to a square icon button with a tooltip.
 * Only rendered from an active session — on the landing screen the composer
 * already serves this purpose, so the parent omits it there.
 */
export const SidebarNewChatButton: React.FC<SidebarNewChatButtonProps> = ({ isCollapsed, onClick }) => {
  const base =
    'gba:inline-flex gba:items-center gba:justify-center gba:gap-2 gba:rounded-full gba:bg-foreground gba:text-background gba:text-sm gba:font-semibold gba:transition-colors gba:hover:bg-foreground/90 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-foreground/30'

  const layout = isCollapsed ? 'gba:h-9 gba:w-9' : 'gba:h-9 gba:w-full gba:px-3'

  return (
    <div className={`${isCollapsed ? 'gba:flex gba:justify-center' : ''} gba:px-2 gba:pt-1 gba:pb-2`}>
      <SidebarTooltip disabled={!isCollapsed} label="New session" shortcut="⌘N">
        <button
          type="button"
          onClick={onClick}
          aria-label="New session"
          className={`${base} ${layout}`}
          data-testid="sidebar-new-session"
        >
          <PlusIcon className="gba:h-4 gba:w-4" weight="bold" />
          {!isCollapsed && <span>New session</span>}
        </button>
      </SidebarTooltip>
    </div>
  )
}
