import type { ActiveSessionSnapshot } from '../../types/activeSession'
import { SidebarActiveItem } from './SidebarActiveItem'
import { SidebarSectionHeader } from './SidebarSectionHeader'
import { SIDEBAR_LIST_MAX_HEIGHT_CLASS } from './sidebarLayout.constants'
import { useSidebarSectionCollapsedState } from './useSidebarSectionCollapsedState'

interface SidebarActiveSectionProps {
  sessions: ActiveSessionSnapshot[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  /** When true, render the list regardless of the stored collapse preference (e.g. active search). */
  forceExpanded?: boolean
}

const SECTION_ID = 'active'
const PANEL_ID = 'sidebar-section-active'

export const SidebarActiveSection: React.FC<SidebarActiveSectionProps> = ({
  sessions,
  activeSessionId,
  onSelect,
  forceExpanded = false
}) => {
  const { isCollapsed, toggleCollapsed } = useSidebarSectionCollapsedState(SECTION_ID, false)
  const showList = forceExpanded || !isCollapsed

  if (sessions.length === 0) return null

  return (
    <div data-testid="sidebar-active-section">
      <SidebarSectionHeader
        label="Active"
        badge={sessions.length}
        collapsible={{ isCollapsed, onToggle: toggleCollapsed, controlsId: PANEL_ID }}
      />
      {showList && (
        <ul
          id={PANEL_ID}
          className={`gba:px-1.5 gba:pb-1 gba:space-y-0.5 ${SIDEBAR_LIST_MAX_HEIGHT_CLASS} gba:overflow-y-auto gba:overscroll-contain`}
        >
          {sessions.map(session => (
            <li key={session.session_id}>
              <SidebarActiveItem
                session={session}
                isSelected={session.session_id === activeSessionId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
