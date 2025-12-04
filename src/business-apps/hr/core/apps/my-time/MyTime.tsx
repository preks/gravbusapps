import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import TimeTracking from './components/TimeTracking'
import { useEmployeeData } from '../employee-record/hooks/useEmployeeData'

enum MyTimeTabEnum {
  TimeTracking = 'time-tracking',
  Activity = 'activity'
}

export const MyTime: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = React.useState<MyTimeTabEnum>(MyTimeTabEnum.TimeTracking)
  const activeStructureId = getCurrentActiveStructureId()
  const employeeId = userInfo?.employeeDetails?.employeeId || ''

  const handleTabChange = (value: string) => setActiveTab(value as MyTimeTabEnum)

  const { employee } = useEmployeeData(accessToken, activeStructureId, employeeId)

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
            }
            // {
            //   value: MyTimeTabEnum.Activity,
            //   label: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.activity_log', 'Activity log')
            // }
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

        {/* {activeTab === MyTimeTabEnum.Activity && (
          <div data-testid="my-time-activity-content" className="gba:mt-4">
            <History employeeId={employeeId} accessToken={accessToken} />
          </div>
        )} */}
      </PageLayout>
    </div>
  )
}

export default MyTime
