import React from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import TimeTracking from './components/TimeTracking'
import { useEmployeeData } from '../employee-record/hooks/useEmployeeData'
import timeTrackingTranslations from './_i18n'
import DailyLog from './components/DailyLog'
import TimeHistory from './components/TimeHistory'
import SmartBooking from '../employee-record/components/tabs/components/SmartBooking'

enum MyTimeTabEnum {
  TimeTracking = 'time-tracking',
  SmartBooking = 'smart-booking',
  DailyLog = 'daily-log',
  History = 'history'
}

export const MyTime: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = React.useState<MyTimeTabEnum>(MyTimeTabEnum.TimeTracking)
  const activeStructureId = getCurrentActiveStructureId()
  const employeeId = userInfo?.employeeDetails?.employeeId || ''

  const handleTabChange = (value: string) => setActiveTab(value as MyTimeTabEnum)

  const { employee } = useEmployeeData(accessToken, activeStructureId, employeeId)
  const { t } = useTranslation(timeTrackingTranslations)

  return (
    <div data-testid="my-time-container">
      <PageLayout
        headerIcon={ClockIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.subtitle',
          'Manage attendance and monthly timesheet'
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: [
            {
              value: MyTimeTabEnum.TimeTracking,
              label: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.title', 'Time Tracking')
            },
            {
              value: MyTimeTabEnum.SmartBooking,
              label: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.title', 'Smart Booking')
            },
            {
              value: MyTimeTabEnum.DailyLog,
              label: t('daily_log')
            },
            {
              value: MyTimeTabEnum.History,
              label: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.history.title', 'History')
            }
          ]
        }}
        variant={MODULE_COLORS.HR}
        className="gba:min-h-screen"
      >
        {activeTab === MyTimeTabEnum.TimeTracking && (
          <div data-testid="my-time-timesheet-content" className="gba:mt-4">
            <TimeTracking employee={employee} employeeId={employeeId} accessToken={accessToken} isSelfView={true} />
          </div>
        )}

        {activeTab === MyTimeTabEnum.SmartBooking && (
          <div data-testid="my-time-smart-booking-content" className="gba:mt-4">
            <SmartBooking employeeId={employeeId} accessToken={accessToken} />
          </div>
        )}

        {activeTab === MyTimeTabEnum.DailyLog && (
          <div data-testid="my-time-activity-content" className="gba:mt-4">
            <DailyLog employee={employee} employeeId={employeeId} accessToken={accessToken} />
          </div>
        )}

        {activeTab === MyTimeTabEnum.History && (
          <div data-testid="my-time-history-content" className="gba:mt-4">
            <TimeHistory
              employeeId={employeeId}
              accessToken={accessToken}
              userId={userInfo?.id || ''}
              employeeFirstName={employee?.firstName}
              employeeLastName={employee?.lastName}
            />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default MyTime
