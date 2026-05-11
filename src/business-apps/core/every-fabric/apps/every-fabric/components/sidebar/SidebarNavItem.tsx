import type { Icon } from '@phosphor-icons/react'
import { Badge } from '@newwork/nw-design-system'
import { SidebarTooltip } from './SidebarTooltip'

export interface SidebarNavItemProps {
  /** Phosphor icon component (e.g. `GraphIcon`). */
  icon: Icon
  /** Visible label in expanded mode; tooltip text in collapsed mode. */
  label: string
  /** True when the linked view is currently displayed. */
  isActive?: boolean
  /** Compact rail layout: hides the label and right-side meta. */
  isCollapsed: boolean
  /**
   * Right-aligned count (e.g. number of items in the linked view). Hidden
   * in collapsed mode. Pass `undefined` to hide entirely.
   */
  count?: number
  /**
   * Right-aligned pill ("NEW", "BETA", …). Hidden in collapsed mode.
   * Use `Badge` underneath so colour stays in sync with design tokens.
   */
  badge?: string
  onClick: () => void
  testId?: string
}

/**
 * Single nav row in the left rail (Enterprise Agent, The Fabric, Agent Mesh, …).
 * Mirrors the look-and-feel of the recents list: icon left, label centre,
 * optional count or badge on the right. Collapses cleanly to a 36×36 rail
 * icon with a tooltip when the sidebar is folded.
 */
export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  icon: IconComponent,
  label,
  isActive = false,
  isCollapsed,
  count,
  badge,
  onClick,
  testId
}) => {
  const baseClasses =
    'gba:group gba:inline-flex gba:items-center gba:rounded-xl gba:transition-colors focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-foreground/20'
  const stateClasses = isActive
    ? 'gba:bg-muted gba:text-foreground'
    : 'gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground'
  const layoutClasses = isCollapsed ? 'gba:h-9 gba:w-9 gba:justify-center' : 'gba:h-9 gba:w-full gba:gap-2.5 gba:px-2.5'

  return (
    <div className={isCollapsed ? 'gba:flex gba:justify-center gba:px-2 gba:py-0.5' : 'gba:px-2 gba:py-0.5'}>
      <SidebarTooltip disabled={!isCollapsed} label={label}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={isActive}
          className={`${baseClasses} ${stateClasses} ${layoutClasses}`}
          data-testid={testId}
        >
          <IconComponent className="gba:h-4 gba:w-4 gba:shrink-0" />
          {!isCollapsed && (
            <>
              <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-left gba:text-[13px] gba:font-medium">
                {label}
              </span>
              {badge && (
                <Badge variant="default" size="xs" className="gba:tracking-wider">
                  {badge}
                </Badge>
              )}
              {count !== undefined && (
                <span className="gba:text-[12px] gba:font-medium gba:text-muted-foreground/80 gba:tabular-nums">
                  {count}
                </span>
              )}
            </>
          )}
        </button>
      </SidebarTooltip>
    </div>
  )
}
