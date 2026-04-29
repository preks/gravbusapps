import { UsersThreeIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import type { ActiveSessionSnapshot } from '../../types/activeSession'
import type { FabricSessionSummary } from '../../types/fabric'
import { SidebarActiveSection } from './SidebarActiveSection'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { SidebarNewChatButton } from './SidebarNewChatButton'
import { SidebarRecentsSection } from './SidebarRecentsSection'
import { SidebarSearchBar } from './SidebarSearchBar'
import { SidebarTooltip } from './SidebarTooltip'
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_EXPANDED_WIDTH_CLASS,
  SIDEBAR_ISLAND_OFFSET_CLASS,
  SIDEBAR_ISLAND_SHELL_CLASS,
  SIDEBAR_WIDTH_TRANSITION_CLASS
} from './sidebarLayout.constants'
import { filterActiveByQuery, filterRecentsByQuery, splitSessions } from './sessionGrouping'

export interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapsed: () => void
  /** Explicit expand (used by the collapsed search icon). */
  onExpand: () => void

  activeSessionId: string | null
  activeSessions: ActiveSessionSnapshot[]
  historySessions: FabricSessionSummary[]

  userInfo?: UserInfoProps
  /**
   * If false, the "New session" CTA is hidden — used on the landing screen
   * where the composer already fulfils that role.
   */
  showNewSessionCta?: boolean
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onStopSession: (id: string) => void
  onOpenSettings: () => void
  onOpenScheduled: () => void
  onOpenAgents: () => void
}

/**
 * Collapsible left "island" sidebar — visible on both the landing screen and
 * the workspace. Renders:
 *
 *   Header (brand + collapse toggle)
 *   New chat button
 *   Search
 *   Active sessions (live, with spinner + current activity)
 *   Recents (grouped by Today / Yesterday / Earlier)
 *   Footer (avatar + name + settings)
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapsed,
  onExpand,
  activeSessionId,
  activeSessions,
  historySessions,
  userInfo,
  showNewSessionCta = true,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onStopSession,
  onOpenSettings,
  onOpenScheduled,
  onOpenAgents
}) => {
  const [query, setQuery] = useState('')

  const { active, recents } = useMemo(
    () => splitSessions(historySessions, activeSessions),
    [historySessions, activeSessions]
  )

  const filteredActive = useMemo(() => filterActiveByQuery(active, query), [active, query])
  const filteredRecents = useMemo(() => filterRecentsByQuery(recents, query), [recents, query])

  const widthClass = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH_CLASS : SIDEBAR_EXPANDED_WIDTH_CLASS

  return (
    <aside
      aria-label="Enterprise agents navigation"
      className={`gba:relative gba:z-20 gba:flex gba:flex-col gba:shrink-0 ${widthClass} ${SIDEBAR_WIDTH_TRANSITION_CLASS}`}
      data-testid="sidebar"
      data-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div
        className={`gba:flex gba:flex-col gba:h-[calc(100%-1.5rem)] sm:gba:h-[calc(100%-2rem)] lg:gba:h-[calc(100%-2.5rem)] gba:overflow-hidden ${SIDEBAR_ISLAND_OFFSET_CLASS} ${SIDEBAR_ISLAND_SHELL_CLASS}`}
      >
        <SidebarHeader isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed} />
        {showNewSessionCta && <SidebarNewChatButton isCollapsed={isCollapsed} onClick={onNewSession} />}
        <SidebarSearchBar isCollapsed={isCollapsed} query={query} onChange={setQuery} onRequestExpand={onExpand} />

        {!isCollapsed && (
          <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:pb-1">
            <SidebarActiveSection
              sessions={filteredActive}
              activeSessionId={activeSessionId}
              onSelect={onSelectSession}
              onStop={onStopSession}
              forceExpanded={query.trim().length > 0}
            />
            <SidebarRecentsSection
              sessions={filteredRecents}
              activeSessionId={activeSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              emptyHint={query ? 'No sessions match your search.' : undefined}
              forceExpanded={query.trim().length > 0}
            />

            {/* Agents nav item */}
            <button
              type="button"
              onClick={onOpenAgents}
              className="gba:mx-2 gba:mt-1 gba:flex gba:items-center gba:gap-2.5 gba:rounded-lg gba:px-2.5 gba:py-2 gba:text-[13px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
              data-testid="sidebar-agents-nav"
            >
              <UsersThreeIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
              Agents
            </button>
          </div>
        )}

        {isCollapsed && (
          <>
            <div className="gba:flex-1 gba:min-h-0" />
            <SidebarTooltip disabled={false} label="Agents">
              <button
                type="button"
                onClick={onOpenAgents}
                className="gba:mx-auto gba:mb-1 gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                data-testid="sidebar-agents-nav"
                aria-label="Agents"
              >
                <UsersThreeIcon className="gba:h-4 gba:w-4" />
              </button>
            </SidebarTooltip>
          </>
        )}

        <SidebarFooter
          isCollapsed={isCollapsed}
          userInfo={userInfo}
          onOpenSettings={onOpenSettings}
          onOpenScheduled={onOpenScheduled}
        />
      </div>
    </aside>
  )
}
