import React from 'react'
import { AccountDeletePopup as CommonAccountDeletePopup } from '@/common/components/common-relations/popups/account-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'

export interface AccountDeletePopupValues {
  accountId: string
}

export interface AccountDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<AccountDeletePopupValues>
}

/**
 * CRM Account Delete Popup
 * Uses useCustomerAccount hook and passes data to common component
 */
const AccountDeletePopup: React.FC<AccountDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const accountId =
    props.additionalData?.accountId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId ||
    props.additionalData?.id ||
    initialValues?.accountId ||
    ''

  const { account, loading, error } = useCustomerAccount(props.accessToken || '', accountId)

  return (
    <CommonAccountDeletePopup
      {...props}
      initialValues={initialValues}
      domain="crm"
      account={account}
      loading={loading}
      error={error}
    />
  )
}

export default AccountDeletePopup
export { AccountDeletePopup }
