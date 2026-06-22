import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { FabricSessionSummary } from '../../types/fabric'
import translations from '../../_i18n'
import { SidebarRecentItem } from './SidebarRecentItem'
import { SidebarSectionHeader } from './SidebarSectionHeader'
import { groupRecentsByDay, type RecentsGroup } from './sessionGrouping'
import { useSidebarSectionCollapsedState } from './useSidebarSectionCollapsedState'

interface SidebarRecentsSectionProps {
  sessions: FabricSessionSummary[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  /** Shown when the filtered list is empty so the user knows why it's empty. */
  emptyHint?: string
  /** When true, render the list regardless of the stored collapse preference (e.g. active search). */
  forceExpanded?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => Promise<void>
  searchActive?: boolean
}

const SECTION_ID = 'recents'
const PANEL_ID = 'sidebar-section-recents'

const GROUP_LABEL_KEYS: Record<RecentsGroup['label'], string> = {
  Today: 'sidebar-group-today',
  Yesterday: 'sidebar-group-yesterday',
  Earlier: 'sidebar-group-earlier'
}

export const SidebarRecentsSection: React.FC<SidebarRecentsSectionProps> = ({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  emptyHint,
  forceExpanded = false,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  searchActive = false
}) => {
  const { t } = useTranslation(translations)
  // Recents default open so history search and older-session paging are discoverable.
  const { isCollapsed, toggleCollapsed } = useSidebarSectionCollapsedState(SECTION_ID, false)
  const showList = forceExpanded || !isCollapsed

  const groups = groupRecentsByDay(sessions)
  const badge = sessions.length > 0 ? sessions.length : undefined

  const getLoadMoreLabel = () => {
    if (isLoadingMore) return t('sidebar-recents-load-more-loading')
    if (searchActive) return t('sidebar-recents-load-more-search')
    return t('sidebar-recents-load-more')
  }

  const handleLoadMoreClick = () => {
    if (onLoadMore) {
      onLoadMore()
    }
  }

  const loadMoreButton =
    onLoadMore && (hasMore || isLoadingMore) ? (
      <div className="gba:px-2 gba:pt-2 gba:pb-1">
        <button
          type="button"
          onClick={handleLoadMoreClick}
          disabled={isLoadingMore}
          className="gba:w-full gba:h-8 gba:rounded-lg gba:border gba:border-border/60 gba:bg-background/60 gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 disabled:gba:cursor-not-allowed disabled:gba:opacity-60 gba:transition-colors"
          data-testid="sidebar-recents-load-more"
        >
          {getLoadMoreLabel()}
        </button>
      </div>
    ) : null

  const renderRecentsContent = () => {
    if (isLoading) {
      return (
        <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground/70">{t('sidebar-recents-loading')}</p>
      )
    }

    if (groups.length === 0) {
      return (
        <>
          <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground/70">
            {emptyHint ?? t('sidebar-recents-empty')}
          </p>
          {loadMoreButton}
        </>
      )
    }

    return (
      <div>
        {groups.map(group => (
          <div key={group.label} className="gba:pb-1">
            <p className="gba:px-3 gba:pt-2 gba:pb-1 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground/70">
              {t(GROUP_LABEL_KEYS[group.label])}
            </p>
            <ul className="gba:px-1.5 gba:space-y-0.5">
              {group.sessions.map(session => (
                <li key={session.session_id}>
                  <SidebarRecentItem
                    session={session}
                    isSelected={session.session_id === activeSessionId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {loadMoreButton}
      </div>
    )
  }

  return (
    <div data-testid="sidebar-recents-section">
      <SidebarSectionHeader
        label={t('sidebar-recents-label')}
        badge={badge}
        collapsible={{ isCollapsed, onToggle: toggleCollapsed, controlsId: PANEL_ID }}
      />
      {showList && <div id={PANEL_ID}>{renderRecentsContent()}</div>}
    </div>
  )
}
