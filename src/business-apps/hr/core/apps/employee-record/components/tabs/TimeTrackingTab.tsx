'use client'

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import TimeHistory from '@/business-apps/hr/core/apps/my-time/components/TimeHistory'
import { useTimeTrackingData } from './hooks/useTimeTrackingData'
import TimeSummaryCards from './components/TimeSummaryCards'

interface TimeTrackingTabProps extends BusinessAppContextProps {
  employee: any
  employeeId: string
  isSelfView: boolean
  userId: string
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employee, accessToken, employeeId, userId }) => {
  const {
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes,
    monthlyRequiredMinutes,
    dailyAverageWorkedMinutesUntilYesterday,
    overtimeMinutesUntilYesterday
  } = useTimeTrackingData({
    employeeId,
    accessToken,
    workingHours: employee?.workingHours?.[0]
  })

  return (
    <div className="gba:time-tracking-tab gba:space-y-6" data-testid="time-tracking-tab-container">
      {/* Title and subtitle */}
      <div className="gba:mb-2" data-testid="time-tracking-header">
        <div className="gba:font-bold gba:text-2xl" data-testid="time-tracking-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:time_tracking.subtitle',
            'Manage attendance and monthly timesheet'
          )}
        </div>
      </div>

      {/* Summary Cards (shared with DailyLog) */}
      <TimeSummaryCards
        monthlyRequiredMinutes={monthlyRequiredMinutes}
        monthlyRequiredUntilYesterdayMinutes={monthlyRequiredUntilYesterdayMinutes}
        monthlyWorkedUntilYesterdayMinutes={monthlyWorkedUntilYesterdayMinutes}
        dailyAverageWorkedMinutesUntilYesterday={dailyAverageWorkedMinutesUntilYesterday}
        overtimeMinutesUntilYesterday={overtimeMinutesUntilYesterday}
      />

      {/* Render only History content (no sub tabs) */}
      <div className="gba:mt-4" data-testid="history-content">
        <TimeHistory
          employeeId={employeeId}
          accessToken={accessToken}
          userId={userId}
          employeeCode={employee?.code}
          workingHours={employee?.workingHours?.[0]}
        />
      </div>
    </div>
  )
}

export default TimeTrackingTab
