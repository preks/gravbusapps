import React, { useMemo } from 'react'
import { Card, CardContent, PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import TimeTracking from './components/TimeTracking'
import { useMyTimeEmployeeData } from './hooks/useMyTimeEmployeeData'
import timeTrackingTranslations from './_i18n'
import TimeHistory from './components/TimeHistory'
import SmartBooking from '../employee-record/components/tabs/components/SmartBooking'
import { InterventionsTable } from '../employee-record/components/tabs/components/InterventionsTable'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'
import { isContractTimeRelevant } from '@/business-apps/hr/core/utils/timeRelevantUtils'

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

enum MyTimeTabEnum {
  TimeTracking = 'time-tracking',
  EveryAIAssistant = 'everyai-assistant',
  SmartBooking = 'smart-booking',
  History = 'history'
}

const TIME_TRACKING_TABS = new Set([MyTimeTabEnum.TimeTracking, MyTimeTabEnum.History, MyTimeTabEnum.EveryAIAssistant])

export const MyTime: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || ''
  const effectiveAccessToken = accessToken

  const { employee, loading } = useMyTimeEmployeeData(effectiveAccessToken, employeeId)
  const activeWorkingHours = React.useMemo(
    () => getActiveWorkingHours<WeeklyWorkingHours>(employee?.workingHours),
    [employee?.workingHours]
  )
  const { t } = useTranslation(timeTrackingTranslations)

  const timeRelevant = useMemo(() => isContractTimeRelevant(employee), [employee])
  const employeeResolved = !loading && employee !== null
  const employeeLoadError = !loading && (!effectiveAccessToken || !employeeId || employee === null)

  const allTabs = useMemo(
    () => [
      { value: MyTimeTabEnum.TimeTracking, label: t('tab_timesheet') },
      { value: MyTimeTabEnum.SmartBooking, label: t('tab_project_time') },
      { value: MyTimeTabEnum.History, label: t('tab_history') },
      { value: MyTimeTabEnum.EveryAIAssistant, label: t('tab_everyai_assistant') }
    ],
    [t]
  )

  const visibleTabs = useMemo(
    () => (timeRelevant ? allTabs : allTabs.filter(tab => !TIME_TRACKING_TABS.has(tab.value))),
    [allTabs, timeRelevant]
  )

  const [selectedTab, setSelectedTab] = React.useState<MyTimeTabEnum>(MyTimeTabEnum.TimeTracking)

  const activeTab =
    employeeResolved && !timeRelevant && TIME_TRACKING_TABS.has(selectedTab) ? MyTimeTabEnum.SmartBooking : selectedTab

  const handleTabChange = (value: string) => {
    switch (value) {
      case MyTimeTabEnum.TimeTracking:
      case MyTimeTabEnum.EveryAIAssistant:
      case MyTimeTabEnum.SmartBooking:
      case MyTimeTabEnum.History:
        setSelectedTab(value)
        break
    }
  }

  return (
    <div data-testid="my-time-container">
      <PageLayout
        headerIcon={ClockIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.subtitle',
          'Manage attendance and monthly timesheet'
        )}
        headerSubViews={
          employeeResolved
            ? {
                value: activeTab,
                onValueChange: handleTabChange,
                items: visibleTabs
              }
            : undefined
        }
        variant={MODULE_COLORS.HR}
        className="gba:min-h-screen"
      >
        {employeeLoadError && (
          <Card>
            <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
              <p className="gba:text-sm gba:text-destructive">{t('error_loading_my_time')}</p>
            </CardContent>
          </Card>
        )}

        {!employeeLoadError && !employeeResolved && (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner />
          </div>
        )}

        {employeeResolved && (
          <>
            {activeTab === MyTimeTabEnum.TimeTracking && (
              <div data-testid="my-time-timesheet-content" className="gba:mt-4">
                <TimeTracking
                  employee={employee}
                  employeeId={employeeId}
                  accessToken={effectiveAccessToken}
                  isSelfView={true}
                  onNavigateToEveryAI={() => setSelectedTab(MyTimeTabEnum.EveryAIAssistant)}
                />
              </div>
            )}

            {activeTab === MyTimeTabEnum.EveryAIAssistant && (
              <div data-testid="my-time-everyai-content" className="gba:mt-4">
                <InterventionsTable
                  employeeId={employeeId}
                  accessToken={effectiveAccessToken}
                  workingHours={activeWorkingHours}
                  defaultExpanded
                />
              </div>
            )}

            {activeTab === MyTimeTabEnum.SmartBooking && (
              <div data-testid="my-time-smart-booking-content" className="gba:mt-4">
                <SmartBooking employeeId={employeeId} accessToken={effectiveAccessToken} />
              </div>
            )}

            {activeTab === MyTimeTabEnum.History && (
              <div data-testid="my-time-history-content" className="gba:mt-4">
                <TimeHistory
                  employeeId={employeeId}
                  accessToken={effectiveAccessToken}
                  userId={userInfo?.id || ''}
                  employee={employee}
                  employeeCode={employee?.code}
                  employeeFirstName={employee?.firstName}
                  employeeLastName={employee?.lastName}
                  workingHours={employee?.workingHours}
                />
              </div>
            )}
          </>
        )}
      </PageLayout>
    </div>
  )
}

export default MyTime
