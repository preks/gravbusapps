import type { FabricSessionSummary } from '../../types/fabric'
import { SidebarRecentItem } from './SidebarRecentItem'
import { SidebarSectionHeader } from './SidebarSectionHeader'
import { groupRecentsByDay } from './sessionGrouping'
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
}

const SECTION_ID = 'recents'
const PANEL_ID = 'sidebar-section-recents'

export const SidebarRecentsSection: React.FC<SidebarRecentsSectionProps> = ({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  emptyHint,
  forceExpanded = false
}) => {
  // Recents default to collapsed so the sidebar stays visually calm and
  // leaves room for future entries; users open it explicitly or via search.
  const { isCollapsed, toggleCollapsed } = useSidebarSectionCollapsedState(SECTION_ID, true)
  const showList = forceExpanded || !isCollapsed

  const groups = groupRecentsByDay(sessions)
  const badge = sessions.length > 0 ? sessions.length : undefined

  return (
    <div data-testid="sidebar-recents-section">
      <SidebarSectionHeader
        label="Recents"
        badge={badge}
        collapsible={{ isCollapsed, onToggle: toggleCollapsed, controlsId: PANEL_ID }}
      />
      {showList && (
        <div id={PANEL_ID}>
          {groups.length === 0 ? (
            <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground/70">
              {emptyHint ?? 'No sessions yet. Start one from the composer.'}
            </p>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group.label} className="gba:pb-1">
                  <p className="gba:px-3 gba:pt-2 gba:pb-1 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground/70">
                    {group.label}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
