import React from 'react'
import AccountFormComponent from './AccountFormComponent'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface AccountFormProps {
  initialValues?: Partial<CustomerAccount>
  onSubmit?: (account: Partial<CustomerAccount>) => Promise<void>
  onCancel?: () => Promise<void>
}

const AccountForm: React.FC<BusinessAppContextProps & AccountFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData
  }

  return (
    <AccountFormComponent
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  )
}

export default AccountForm
