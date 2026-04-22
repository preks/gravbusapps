import { SidebarSimpleIcon } from '@phosphor-icons/react'
import { SidebarTooltip } from './SidebarTooltip'

interface SidebarHeaderProps {
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * Collapse toggle + brand. The brand text hides when collapsed; the toggle
 * stays visible so the user can always expand again.
 */
export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isCollapsed, onToggleCollapsed }) => {
  return (
    <div
      className={`gba:flex gba:items-center ${
        isCollapsed ? 'gba:justify-center' : 'gba:justify-between'
      } gba:px-2 gba:pt-3 gba:pb-2`}
    >
      {!isCollapsed && (
        <span className="gba:inline-flex gba:items-center gba:pl-2 gba:text-[13px] gba:font-extrabold gba:tracking-[0.01em] gba:text-foreground">
          NEWWORK <span className="gba:ml-1 gba:font-semibold gba:text-muted-foreground">Enterprise Agents</span>
        </span>
      )}

      <SidebarTooltip disabled={!isCollapsed} label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="sidebar-toggle"
        >
          <SidebarSimpleIcon className="gba:h-4 gba:w-4" />
        </button>
      </SidebarTooltip>
    </div>
  )
}
