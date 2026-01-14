import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { MyTasksList } from './MyTasksList'

export type MyTasksViewProps = BusinessAppContextProps

export const MyTasksView: React.FC<MyTasksViewProps> = ({ accessToken, userInfo }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  return (
    <div className="gba:space-y-6" data-testid="my-tasks-view">
      <Card>
        <CardHeader>
          <CardTitle>My Open Tasks</CardTitle>
        </CardHeader>
      </Card>

      <MyTasksList accessToken={accessToken} userInfo={userInfo} employeeId={employeeId} />
    </div>
  )
}

export default MyTasksView
