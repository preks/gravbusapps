import React from 'react'
import { TabComponentProps } from '../../../types'
import { AbsenceReports } from './AbsenceReports/AbsenceReports'

export const ReportsTab: React.FC<TabComponentProps> = ({ accessToken, userInfo }) => {
  return (
    <div data-testid="reports-content">
      <AbsenceReports accessToken={accessToken} userInfo={userInfo} />
    </div>
  )
}
