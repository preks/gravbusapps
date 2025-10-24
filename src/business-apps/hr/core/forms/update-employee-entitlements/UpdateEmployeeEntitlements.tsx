import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UpdateEmployeeEntitlementsProvider } from './context/UpdateEmployeeEntitlementsContext'
import UpdateEmployeeEntitlementsForm from './components/UpdateEmployeeEntitlementsForm'

export const UpdateEmployeeEntitlements: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, additionalData, userInfo } = props
  const employeeId = useMemo(() => {
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId ||
      ''
    )
  }, [additionalData, userInfo])
  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.update_entitlements', 'Update Entitlements'),
    []
  )

  return (
    <div
      className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[400px] gba:p-0"
      data-testid="mileageRuleModal_containerCreateMileageRule"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
      <UpdateEmployeeEntitlementsProvider accessToken={accessToken} userInfo={userInfo} employeeId={employeeId}>
        <UpdateEmployeeEntitlementsForm />
      </UpdateEmployeeEntitlementsProvider>
    </div>
  )
}

export default UpdateEmployeeEntitlements
