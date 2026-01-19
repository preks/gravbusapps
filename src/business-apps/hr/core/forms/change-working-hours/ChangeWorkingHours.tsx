import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { ChangeWorkingHoursProvider } from './context/ChangeWorkingHoursContext'
import ChangeWorkingHoursForm from './components/ChangeWorkingHoursForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const ChangeWorkingHours: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, additionalData, userInfo } = props
  const employeeId = useMemo(() => {
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId ||
      ''
    )
  }, [additionalData, userInfo])

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:working_hours_form.update_working_hours_title',
        'Update Working Hours'
      ),
    []
  )

  return (
    <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[600px] gba:p-0">
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
      <ChangeWorkingHoursProvider accessToken={accessToken} userInfo={userInfo} employeeId={employeeId}>
        <ChangeWorkingHoursForm />
      </ChangeWorkingHoursProvider>
    </div>
  )
}

export default ChangeWorkingHours
