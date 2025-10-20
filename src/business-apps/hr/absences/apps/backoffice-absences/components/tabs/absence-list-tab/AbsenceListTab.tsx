import React from 'react'
import { TabComponentProps } from '../../../types'
import { AbsenceList } from './AbsenceList/AbsenceList'

export const AbsenceListTab: React.FC<TabComponentProps> = ({ accessToken, userInfo }) => {
  return (
    <div data-testid="absence-list-content">
      <AbsenceList accessToken={accessToken} userInfo={userInfo} />
    </div>
  )
}
