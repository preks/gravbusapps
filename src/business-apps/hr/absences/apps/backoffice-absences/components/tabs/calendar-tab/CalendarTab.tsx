import React from 'react'
import { TabComponentProps } from '../../../types'
import CalendarList from './CalendarList/CalendarList'

export const CalendarTab: React.FC<TabComponentProps> = ({ accessToken, userInfo }) => {
  return (
    <div data-testid="calendar-content">
      <CalendarList accessToken={accessToken} userInfo={userInfo} />
    </div>
  )
}
