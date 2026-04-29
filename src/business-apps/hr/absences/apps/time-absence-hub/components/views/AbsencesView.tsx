import React from 'react'
import { ListBulletsIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AbsenceList } from '../tabs/absence-list-tab/AbsenceList/AbsenceList'
import { CalendarTab } from '../tabs/calendar-tab/CalendarTab'
import { ABSENCES_SUB_TABS, AbsencesSubTab, isAbsencesSubTab } from '../../constants/routes'
import { openEmployeeTimeTracking } from '../../utils/hubNavigation'

interface AbsencesViewProps extends BusinessAppContextProps {
  activeSubTab?: string
  onSubTabChange?: (subTab: string) => void
  dashboardData?: any
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.absences.${key}`, fallback)

const buildSubTabLabel = (subTab: AbsencesSubTab): string => {
  if (subTab === 'list') {
    return tt('subtab_list', 'List')
  }
  return tt('subtab_calendar', 'Calendar')
}

const SUB_TAB_ICONS: Record<AbsencesSubTab, React.ReactElement> = {
  list: <ListBulletsIcon size={16} />,
  calendar: <CalendarBlankIcon size={16} />
}

export const AbsencesView: React.FC<AbsencesViewProps> = ({
  accessToken,
  userInfo,
  activeSubTab,
  onSubTabChange,
  dashboardData,
  filterAction
}) => {
  const currentSubTab: AbsencesSubTab = isAbsencesSubTab(activeSubTab) ? activeSubTab : 'list'

  const handleSubTabChange = (next: AbsencesSubTab) => {
    onSubTabChange?.(next)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-absences-view">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2" role="tablist">
          {ABSENCES_SUB_TABS.map(subTab => (
            <Button
              key={subTab}
              variant={currentSubTab === subTab ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSubTabChange(subTab)}
              data-testid={`time-absence-hub-absences-subtab-${subTab}`}
            >
              {SUB_TAB_ICONS[subTab]}
              {buildSubTabLabel(subTab)}
            </Button>
          ))}
        </div>
        {filterAction}
      </div>

      {currentSubTab === 'list' && (
        <AbsenceList accessToken={accessToken} userInfo={userInfo} onOpenEmployeeRecord={openEmployeeTimeTracking} />
      )}

      {currentSubTab === 'calendar' && (
        <CalendarTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
      )}
    </div>
  )
}

export default AbsencesView
