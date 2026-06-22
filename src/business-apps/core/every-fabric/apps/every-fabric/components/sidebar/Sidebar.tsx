import { useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  BrainIcon,
  BuildingsIcon,
  GraphIcon,
  ListMagnifyingGlassIcon,
  TreeStructureIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import type { ActiveSessionSnapshot } from '../../types/activeSession'
import type { FabricSessionSummary } from '../../types/fabric'
import { SidebarActiveSection } from './SidebarActiveSection'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarNewChatButton } from './SidebarNewChatButton'
import { SidebarRecentsSection } from './SidebarRecentsSection'
import { SidebarSearchBar } from './SidebarSearchBar'
import { SidebarSectionLabel } from './SidebarSectionLabel'
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_EXPANDED_WIDTH_CLASS,
  SIDEBAR_ISLAND_OFFSET_CLASS,
  SIDEBAR_ISLAND_SHELL_CLASS,
  SIDEBAR_SESSIONS_SCROLL_REGION_CLASS,
  SIDEBAR_WIDTH_TRANSITION_CLASS
} from './sidebarLayout.constants'
import { SidebarFilterBar } from './SidebarFilterBar'
import {
  filterActiveByQuery,
  filterRecentsByQuery,
  filterRecentsByStatus,
  splitSessions,
  type RecentsStatusFilter
} from './sessionGrouping'
import translations from '../../_i18n'

export interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapsed: () => void
  /** Explicit expand (used by the collapsed search icon). */
  onExpand: () => void

  activeSessionId: string | null
  activeSessions: ActiveSessionSnapshot[]
  historySessions: FabricSessionSummary[]
  historySessionsLoading?: boolean
  historySessionsLoadingMore?: boolean
  historySessionsSearching?: boolean
  hasMoreHistorySessions?: boolean
  historySearchQuery: string
  onHistorySearchQueryChange: (query: string) => void
  onLoadMoreHistorySessions: () => Promise<void>

  userInfo?: UserInfoProps
  accessToken?: string
  /**
   * If false, the "New session" CTA is hidden on the landing screen where the
   * composer already fulfils that role. Shown when a session is open or an
   * overlay (settings, scheduled, etc.) replaces the landing composer.
   */
  showNewSessionCta?: boolean
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onStopSession: (id: string) => void
  onOpenSettings: () => void
  onOpenScheduled: () => void

  /**
   * Company-wide destinations under the "Workspace" header. These are
   * always shown and are not bound to any session.
   */
  onOpenEnterpriseWorkforce: () => void
  isEnterpriseWorkforceActive?: boolean
  onOpenCompanyMesh: () => void
  isCompanyMeshActive?: boolean
  /** Trace Lens — a global LangSmith-style run debugger (dev-mode only). */
  onOpenTraceLens: () => void
  isTraceLensActive?: boolean
  /** Memory Lens — overview of what the agent remembers about the user (dev-mode only). */
  onOpenMemoryLens: () => void
  isMemoryLensActive?: boolean

  /**
   * Session-scoped destinations under the "Active session" header. These
   * only appear when an active session is selected.
   */
  onOpenSessionMesh: () => void
  isSessionMeshActive?: boolean
  onOpenTraceExplorer: () => void
  isTraceExplorerActive?: boolean
  /** When false, hides Trace Explorer nav item. */
  devModeEnabled?: boolean
}

/**
 * Collapsible left "island" sidebar — visible on both the landing screen and
 * the workspace. Renders three logical groups:
 *
 *   WORKSPACE          → company-wide destinations (Enterprise Workforce,
 *                        Company Mesh) — always visible.
 *   ACTIVE SESSION     → session-scoped destinations (Session Mesh, Trace
 *                        Explorer) — only when a session is open.
 *   SESSIONS           → new chat + search + Live + Recents.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapsed,
  onExpand,
  activeSessionId,
  activeSessions,
  historySessions,
  historySessionsLoading = false,
  historySessionsLoadingMore = false,
  historySessionsSearching = false,
  hasMoreHistorySessions = false,
  historySearchQuery,
  onHistorySearchQueryChange,
  onLoadMoreHistorySessions,
  userInfo,
  accessToken = '',
  showNewSessionCta = true,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onStopSession,
  onOpenSettings,
  onOpenScheduled,
  onOpenEnterpriseWorkforce,
  isEnterpriseWorkforceActive = false,
  onOpenCompanyMesh,
  isCompanyMeshActive = false,
  onOpenTraceLens,
  isTraceLensActive = false,
  onOpenMemoryLens,
  isMemoryLensActive = false,
  onOpenSessionMesh,
  isSessionMeshActive = false,
  onOpenTraceExplorer,
  isTraceExplorerActive = false,
  devModeEnabled = false
}) => {
  const { t } = useTranslation(translations)
  const [statusFilter, setStatusFilter] = useState<Set<RecentsStatusFilter> | null>(null)
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)

  const { active, recents } = useMemo(
    () => splitSessions(historySessions, activeSessions),
    [historySessions, activeSessions]
  )

  const filteredActive = useMemo(() => filterActiveByQuery(active, historySearchQuery), [active, historySearchQuery])
  const filteredRecents = useMemo(() => {
    const byQuery = filterRecentsByQuery(recents, historySearchQuery)
    return filterRecentsByStatus(byQuery, statusFilter)
  }, [recents, historySearchQuery, statusFilter])

  const widthClass = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH_CLASS : SIDEBAR_EXPANDED_WIDTH_CLASS
  const hasActiveSession = Boolean(activeSessionId)
  const hasActiveHistorySearch = historySearchQuery.trim().length > 0
  const forceSessionsExpanded = hasActiveHistorySearch || statusFilter !== null
  const handleSearchRequestExpand = () => {
    setSearchFocusRequest(value => value + 1)
    onExpand()
  }

  return (
    <aside
      aria-label={t('sidebar-nav-aria')}
      className={`gba:relative gba:z-20 gba:flex gba:flex-col gba:shrink-0 ${widthClass} ${SIDEBAR_WIDTH_TRANSITION_CLASS}`}
      data-testid="sidebar"
      data-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div
        className={`gba:flex gba:flex-col gba:h-[calc(100%-1.5rem)] sm:gba:h-[calc(100%-2rem)] lg:gba:h-[calc(100%-2.5rem)] gba:overflow-hidden ${SIDEBAR_ISLAND_OFFSET_CLASS} ${SIDEBAR_ISLAND_SHELL_CLASS}`}
      >
        <SidebarHeader isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed} />
        {showNewSessionCta && <SidebarNewChatButton isCollapsed={isCollapsed} onClick={onNewSession} />}

        {/* WORKSPACE — always visible, never bound to a session. */}
        <SidebarSectionLabel
          label={t('sidebar-section-workspace')}
          isCollapsed={isCollapsed}
          testId="sidebar-section-workspace"
        />
        <SidebarNavItem
          icon={UsersThreeIcon}
          label={t('nav-digital-workforce')}
          badge={t('sidebar-badge-new')}
          isActive={isEnterpriseWorkforceActive}
          isCollapsed={isCollapsed}
          onClick={onOpenEnterpriseWorkforce}
          testId="sidebar-nav-enterprise-workforce"
        />
        <SidebarNavItem
          icon={BuildingsIcon}
          label={t('agent-mesh-scope-title-company')}
          isActive={isCompanyMeshActive}
          isCollapsed={isCollapsed}
          onClick={onOpenCompanyMesh}
          testId="sidebar-nav-company-mesh"
        />
        {devModeEnabled && (
          <SidebarNavItem
            icon={TreeStructureIcon}
            label={t('trace-lens-title')}
            isActive={isTraceLensActive}
            isCollapsed={isCollapsed}
            onClick={onOpenTraceLens}
            testId="sidebar-nav-trace-lens"
          />
        )}
        {devModeEnabled && (
          <SidebarNavItem
            icon={BrainIcon}
            label={t('memory-lens-title')}
            isActive={isMemoryLensActive}
            isCollapsed={isCollapsed}
            onClick={onOpenMemoryLens}
            testId="sidebar-nav-memory-lens"
          />
        )}

        {/* ACTIVE SESSION — only when a session is selected. */}
        {hasActiveSession && (
          <>
            <SidebarSectionLabel
              label={t('sidebar-section-active-session')}
              isCollapsed={isCollapsed}
              testId="sidebar-section-active-session"
            />
            <SidebarNavItem
              icon={GraphIcon}
              label={t('trace-explorer-agent-mesh')}
              isActive={isSessionMeshActive}
              isCollapsed={isCollapsed}
              onClick={onOpenSessionMesh}
              testId="sidebar-nav-agent-mesh"
            />
            {devModeEnabled && (
              <SidebarNavItem
                icon={ListMagnifyingGlassIcon}
                label={t('agent-mesh-trace-explorer')}
                isActive={isTraceExplorerActive}
                isCollapsed={isCollapsed}
                onClick={onOpenTraceExplorer}
                testId="sidebar-nav-trace-explorer"
              />
            )}
          </>
        )}

        <div className="gba:mx-3 gba:my-1.5 gba:border-t gba:border-border/40" />

        <SidebarSearchBar
          isCollapsed={isCollapsed}
          query={historySearchQuery}
          onChange={onHistorySearchQueryChange}
          onRequestExpand={handleSearchRequestExpand}
          isSearching={historySessionsSearching}
          resultCount={hasActiveHistorySearch ? filteredActive.length + filteredRecents.length : undefined}
          focusRequestId={searchFocusRequest}
        />
        {!isCollapsed && <SidebarFilterBar activeFilters={statusFilter} onChange={setStatusFilter} />}

        {!isCollapsed && (
          <div className={SIDEBAR_SESSIONS_SCROLL_REGION_CLASS}>
            <SidebarActiveSection
              sessions={filteredActive}
              activeSessionId={activeSessionId}
              onSelect={onSelectSession}
              onStop={onStopSession}
              forceExpanded={forceSessionsExpanded}
            />
            <SidebarRecentsSection
              sessions={filteredRecents}
              activeSessionId={activeSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              emptyHint={hasActiveHistorySearch || statusFilter ? t('sidebar-recents-empty-search') : undefined}
              forceExpanded={forceSessionsExpanded}
              isLoading={historySessionsLoading}
              isLoadingMore={historySessionsLoadingMore}
              hasMore={hasMoreHistorySessions}
              onLoadMore={onLoadMoreHistorySessions}
              searchActive={hasActiveHistorySearch}
            />
          </div>
        )}

        {isCollapsed && <div className="gba:flex-1 gba:min-h-0" />}

        <SidebarFooter
          isCollapsed={isCollapsed}
          userInfo={userInfo}
          accessToken={accessToken}
          onOpenSettings={onOpenSettings}
          onOpenScheduled={onOpenScheduled}
        />
      </div>
    </aside>
  )
}
