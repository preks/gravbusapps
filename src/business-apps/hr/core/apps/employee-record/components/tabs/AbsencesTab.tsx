import React from 'react'
import { AbsencesTabProps } from '../../queries/types'
import { PersonalAbsences } from '@/business-apps/hr/absences/apps/personal-absences/PersonalAbsences'

const AbsencesTab: React.FC<AbsencesTabProps> = ({ employee, accessToken, userInfo }) => {
  return (
    <div className="gba:absences-tab">
      <PersonalAbsences accessToken={accessToken} userInfo={userInfo} employeeIdOverride={employee?.id} embedded />
    </div>
  )
}

export default AbsencesTab
