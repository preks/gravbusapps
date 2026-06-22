import { useTranslation } from '@newwork/nw-design-system'
import type { ActiveSessionSnapshot } from '../../types/activeSession'
import translations from '../../_i18n'
import { SidebarActiveItem } from './SidebarActiveItem'
import { SidebarSectionHeader } from './SidebarSectionHeader'
import { useSidebarSectionCollapsedState } from './useSidebarSectionCollapsedState'

interface SidebarActiveSectionProps {
  sessions: ActiveSessionSnapshot[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onStop: (sessionId: string) => void
  /** When true, render the list regardless of the stored collapse preference (e.g. active search). */
  forceExpanded?: boolean
}

const SECTION_ID = 'active'
const PANEL_ID = 'sidebar-section-active'

export const SidebarActiveSection: React.FC<SidebarActiveSectionProps> = ({
  sessions,
  activeSessionId,
  onSelect,
  onStop,
  forceExpanded = false
}) => {
  const { t } = useTranslation(translations)
  const { isCollapsed, toggleCollapsed } = useSidebarSectionCollapsedState(SECTION_ID, false)
  const showList = forceExpanded || !isCollapsed

  if (sessions.length === 0) return null

  const label = (
    <span className="gba:inline-flex gba:items-center gba:gap-1.5">
      <span aria-hidden="true" className="gba:relative gba:inline-flex gba:h-2 gba:w-2">
        <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-emerald-400 gba:opacity-75 gba:animate-ping" />
        <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-emerald-500 gba:shadow-[0_0_0_2px_rgba(16,185,129,0.15)]" />
      </span>
      <span>{t('sidebar-live-label')}</span>
    </span>
  )

  return (
    <div data-testid="sidebar-active-section">
      <SidebarSectionHeader
        label={label}
        badge={sessions.length}
        collapsible={{ isCollapsed, onToggle: toggleCollapsed, controlsId: PANEL_ID }}
      />
      {showList && (
        <ul id={PANEL_ID} className="gba:px-1.5 gba:pb-1 gba:space-y-0.5">
          {sessions.map(session => (
            <li key={session.session_id}>
              <SidebarActiveItem
                session={session}
                isSelected={session.session_id === activeSessionId}
                onSelect={onSelect}
                onStop={onStop}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
