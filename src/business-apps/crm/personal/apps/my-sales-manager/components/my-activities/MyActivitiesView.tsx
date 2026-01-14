import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { MyActivitiesListTab } from './MyActivitiesListTab'
import { MyActivitiesCalendarTab } from './MyActivitiesCalendarTab'

export type MyActivitiesViewProps = BusinessAppContextProps

export const MyActivitiesView: React.FC<MyActivitiesViewProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  return (
    <div className="gba:space-y-6" data-testid="my-activities-view">
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'list' | 'calendar')}>
        <TabsList data-testid="my-activities-tabs">
          <TabsTrigger value="list" data-testid="my-activities-list-tab">
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="my-activities-calendar-tab">
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <MyActivitiesListTab accessToken={accessToken} userInfo={userInfo} employeeId={employeeId} />
        </TabsContent>

        <TabsContent value="calendar">
          <MyActivitiesCalendarTab accessToken={accessToken} userInfo={userInfo} employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MyActivitiesView
