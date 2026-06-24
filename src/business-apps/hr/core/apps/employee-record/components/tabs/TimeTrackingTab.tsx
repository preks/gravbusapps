'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import TimeHistory from '@/business-apps/hr/core/apps/my-time/components/TimeHistory'
import timeTrackingTranslations from '@/business-apps/hr/core/apps/my-time/_i18n'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'
import { isContractTimeRelevant } from '@/business-apps/hr/core/utils/timeRelevantUtils'
import SmartBooking from './components/SmartBooking'

interface TimeTrackingTabProps extends BusinessAppContextProps {
  employee: any
  employeeId: string
  userId: string
}

type WeeklyWorkingHours = {
  activeFrom?: string | null
  activeTo?: string | null
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

const TIME_TRACKING_SUBVIEW_VALUES = ['timesheet', 'projectTime'] as const
type TimeTrackingSubView = (typeof TIME_TRACKING_SUBVIEW_VALUES)[number]

const getInitialTimeTrackingSubView = (): TimeTrackingSubView => {
  if (typeof globalThis.window === 'undefined') return 'timesheet'

  const urlParams = new URLSearchParams(globalThis.window.location.search)
  const subViewFromUrl = urlParams.get('subView')

  if (subViewFromUrl === 'myTime') {
    return 'timesheet'
  }

  if (subViewFromUrl && TIME_TRACKING_SUBVIEW_VALUES.includes(subViewFromUrl as TimeTrackingSubView)) {
    return subViewFromUrl as TimeTrackingSubView
  }

  return 'timesheet'
}

const updateTimeTrackingSubViewUrl = (subView: TimeTrackingSubView) => {
  if (typeof globalThis.window === 'undefined') return

  const searchParams = new URLSearchParams(globalThis.window.location.search)
  searchParams.set('tab', 'timeTracking')
  searchParams.set('subView', subView)

  const newUrl = `${globalThis.window.location.pathname}?${searchParams.toString()}`
  globalThis.window.history.replaceState({}, '', newUrl)
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employee, accessToken, employeeId, userId }) => {
  const [activeSubView, setActiveSubView] = React.useState<TimeTrackingSubView>(getInitialTimeTrackingSubView())
  const { t } = useTranslation(timeTrackingTranslations)
  const timeRelevant = React.useMemo(() => isContractTimeRelevant(employee), [employee])
  const activeSubViewValue = !timeRelevant && activeSubView === 'timesheet' ? 'projectTime' : activeSubView
  const activeWorkingHours = React.useMemo(
    () => getActiveWorkingHours<WeeklyWorkingHours>(employee?.workingHours),
    [employee?.workingHours]
  )

  const handleSubViewChange = (value: string) => {
    const nextSubView = value as TimeTrackingSubView
    setActiveSubView(nextSubView)
    updateTimeTrackingSubViewUrl(nextSubView)
  }

  const renderHeader = (title: string, subtitle: string) => (
    <div data-testid="time-tracking-header">
      <div className="gba:font-bold gba:text-2xl" data-testid="time-tracking-title">
        {title}
      </div>
      <div className="gba:text-muted-foreground gba:text-lg gba:mb-4">{subtitle}</div>
    </div>
  )

  const timesheetHeader = renderHeader(
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.subtitle', 'Manage attendance and monthly timesheet')
  )
  const projectTimeHeader = renderHeader(
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.time_booking', 'Time Booking'),
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:time_tracking.smart_booking.manage_project_allocation',
      'Manage project allocation'
    )
  )

  React.useEffect(() => {
    if (timeRelevant || activeSubView !== 'timesheet') return

    setActiveSubView('projectTime')
    updateTimeTrackingSubViewUrl('projectTime')
  }, [activeSubView, timeRelevant])

  return (
    <div className="gba:w-full" data-testid="time-tracking-tab-container">
      <Tabs value={activeSubViewValue} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full gba:justify-start" data-testid="time-tracking-tabs-list">
          {timeRelevant && (
            <TabsTrigger value="timesheet" data-testid="time-tracking-timesheet-subtab" className="gba:flex-1">
              {t('tab_history')}
            </TabsTrigger>
          )}
          <TabsTrigger value="projectTime" data-testid="time-tracking-project-time-subtab" className="gba:flex-1">
            {t('tab_project_time')}
          </TabsTrigger>
        </TabsList>

        {timeRelevant && (
          <TabsContent value="timesheet" data-testid="time-tracking-timesheet-content" className="gba:mt-4">
            <div className="gba:time-tracking-tab gba:space-y-6">
              {timesheetHeader}

              <TimeHistory
                employeeId={employeeId}
                accessToken={accessToken}
                userId={userId}
                employee={employee}
                employeeCode={employee?.code}
                employeeFirstName={employee?.firstName}
                employeeLastName={employee?.lastName}
                workingHours={activeWorkingHours}
                viewOnly
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="projectTime" data-testid="time-tracking-project-time-content" className="gba:mt-4">
          <div className="gba:time-tracking-tab gba:space-y-6">
            {projectTimeHeader}
            <SmartBooking employeeId={employeeId} accessToken={accessToken} viewOnly />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TimeTrackingTab
