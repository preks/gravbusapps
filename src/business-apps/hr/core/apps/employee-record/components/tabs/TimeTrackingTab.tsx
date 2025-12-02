'use client'

import React, { useState } from 'react'
import { TabsTrigger, TabsContent, Tabs, TabsList } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import MonthlySummary from './components/MonthlySummary'
import SmartBooking from './components/SmartBooking'
import History from './components/History'

interface TimeTrackingTabProps extends BusinessAppContextProps {
  employee: any
  employeeId: string
  isSelfView: boolean
}

enum TimeTrackingTabEnum {
  MonthlySummary = 'monthly-summary',
  SmartBooking = 'smart-booking',
  History = 'history'
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  const [activeTab, setActiveTab] = useState<TimeTrackingTabEnum>(TimeTrackingTabEnum.MonthlySummary)

  const handleTabChange = (value: string) => {
    setActiveTab(value as TimeTrackingTabEnum)
  }

  return (
    <div className="gba:time-tracking-tab gba:space-y-6" data-testid="time-tracking-tab-container">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full" data-testid="tabs-list">
          <TabsTrigger value="monthly-summary" data-testid="monthly-summary-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <span>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.title', 'Timesheet')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="history-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <span>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.activity_log', 'Activity log')}</span>
            </div>
          </TabsTrigger>
          {/* Disable smart booking tab for now until it is implemented on BE */}
          {/* <TabsTrigger value="smart-booking" data-testid="smart-booking-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.title', 'Project time booking')}
              </span>
            </div>
          </TabsTrigger> */}
        </TabsList>
        {/* Title and subtitle under subtabs selector */}
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
        <TabsContent value="monthly-summary" data-testid="monthly-summary-content" className="gba:mt-4">
          <MonthlySummary
            employee={employee}
            employeeId={employeeId}
            accessToken={accessToken}
            isSelfView={isSelfView}
          />
        </TabsContent>
        <TabsContent value="history" data-testid="history-content" className="gba:mt-4">
          <History employeeId={employeeId} accessToken={accessToken} />
        </TabsContent>
        <TabsContent value="smart-booking" data-testid="smart-booking-content" className="gba:mt-4">
          <SmartBooking prefixDataTestId="smart-booking" accessToken={accessToken} employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TimeTrackingTab
