import React, { useMemo } from 'react'
import '@newwork/nw-design-system/style'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UpdateEmployeeEntitlementsProvider } from './context/UpdateEmployeeEntitlementsContext'
import UpdateEmployeeEntitlementsForm from './components/UpdateEmployeeEntitlementsForm'

export const UpdateEmployeeEntitlements: React.FC<
  BusinessAppContextProps & { onSubmit?: () => void | Promise<void>; onCancel?: () => void | Promise<void> }
> = props => {
  const { accessToken, additionalData, userInfo, onSubmit, onCancel } = props
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
    () => getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.update_entitlements', 'Update Entitlements'),
    []
  )

  return (
    <div
      className="gba:!bg-card gba:rounded-2xl gba:flex gba:flex-col gba:h-full gba:p-0 gba:min-w-0 gba:max-w-full gba:overflow-x-hidden"
      data-testid="mileageRuleModal_containerCreateMileageRule"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
      <UpdateEmployeeEntitlementsProvider accessToken={accessToken} userInfo={userInfo} employeeId={employeeId}>
        <UpdateEmployeeEntitlementsForm onSubmit={onSubmit} onCancel={onCancel} />
      </UpdateEmployeeEntitlementsProvider>
    </div>
  )
}

export default UpdateEmployeeEntitlements
