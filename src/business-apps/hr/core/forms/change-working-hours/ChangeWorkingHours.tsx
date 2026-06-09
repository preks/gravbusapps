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
    const externalContextData = additionalData?.externalContextData
    return (
      externalContextData?.employeeId ||
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
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]">
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-working-hours-form']]:!pt-0">
        <ChangeWorkingHoursProvider
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          employeeId={employeeId}
        >
          <ChangeWorkingHoursForm />
        </ChangeWorkingHoursProvider>
      </div>
    </div>
  )
}

export default ChangeWorkingHours
