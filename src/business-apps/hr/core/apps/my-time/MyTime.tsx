import React, { useMemo } from 'react'
import { PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import TimeTracking from './components/TimeTracking'
import { useMyTimeEmployeeData, type MyTimeEmployee } from './hooks/useMyTimeEmployeeData'
import timeTrackingTranslations from './_i18n'
import TimeHistory from './components/TimeHistory'
import SmartBooking from '../employee-record/components/tabs/components/SmartBooking'
import { InterventionsTable } from '../employee-record/components/tabs/components/InterventionsTable'

enum MyTimeTabEnum {
  TimeTracking = 'time-tracking',
  EveryAIAssistant = 'everyai-assistant',
  SmartBooking = 'smart-booking',
  History = 'history'
}

const TIME_TRACKING_TABS = new Set([MyTimeTabEnum.TimeTracking, MyTimeTabEnum.History, MyTimeTabEnum.EveryAIAssistant])

function isContractTimeRelevant(employee: MyTimeEmployee | null): boolean {
  if (!employee?.workingCondition?.length) return true

  const today = new Date().toISOString()
  const activeCondition = employee.workingCondition.find(wc => {
    const from = wc.activeFrom
    const to = wc.activeTo
    if (from && from > today) return false
    if (to && to < today) return false
    return true
  })

  const condition = activeCondition ?? employee.workingCondition[employee.workingCondition.length - 1]
  const objectValue = condition?.contractType?.objectValue
  if (!objectValue || typeof objectValue !== 'object') return true

  return objectValue.time_relevant !== false
}

export const MyTime: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || ''

  const { employee, loading } = useMyTimeEmployeeData(accessToken, employeeId)
  const { t } = useTranslation(timeTrackingTranslations)

  const timeRelevant = useMemo(() => isContractTimeRelevant(employee), [employee])
  const employeeResolved = !loading && employee !== null

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
        {!employeeResolved && (
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
                  accessToken={accessToken}
                  isSelfView={true}
                  onNavigateToEveryAI={() => setSelectedTab(MyTimeTabEnum.EveryAIAssistant)}
                />
              </div>
            )}

            {activeTab === MyTimeTabEnum.EveryAIAssistant && (
              <div data-testid="my-time-everyai-content" className="gba:mt-4">
                <InterventionsTable
                  employeeId={employeeId}
                  accessToken={accessToken}
                  workingHours={employee?.workingHours?.[0]}
                  defaultExpanded
                />
              </div>
            )}

            {activeTab === MyTimeTabEnum.SmartBooking && (
              <div data-testid="my-time-smart-booking-content" className="gba:mt-4">
                <SmartBooking employeeId={employeeId} accessToken={accessToken} />
              </div>
            )}

            {activeTab === MyTimeTabEnum.History && (
              <div data-testid="my-time-history-content" className="gba:mt-4">
                <TimeHistory
                  employeeId={employeeId}
                  accessToken={accessToken}
                  userId={userInfo?.id || ''}
                  employee={employee}
                  employeeCode={employee?.code}
                  employeeFirstName={employee?.firstName}
                  employeeLastName={employee?.lastName}
                  workingHours={employee?.workingHours?.[0]}
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
